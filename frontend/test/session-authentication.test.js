/* global Buffer */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import axios from "axios";
import { createAuthSession } from "../src/utils/authSession.js";
import { createApiClient, isAuthHandledError } from "../src/utils/apiClient.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

class SharedStorage {
  values = new Map([["authToken", "expired-access"], ["user", JSON.stringify({ username: "old", role: "landlord" })]]);
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    this.values.set(key, String(value));
    this.onSet?.(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

class OriginLocks {
  queue = Promise.resolve();
  request(name, options, callback) {
    assert.equal(name, "domis-session-control");
    assert.equal(options.mode, "exclusive");
    const operation = this.queue.then(callback);
    this.queue = operation.catch(() => {});
    return operation;
  }
}

async function fixture(t) {
  const storage = new SharedStorage();
  const locks = new OriginLocks();
  const state = {
    access: "expired-access", cookie: "cookie-initial", browserCookie: "cookie-initial",
    rotations: 0, refreshCalls: 0, signinCalls: 0, logoutCalls: 0,
    writes: [], requests: [], logoutCookies: [],
  };
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const path = new URL(request.url, "http://test").pathname;
    const send = (status, data, cookie) => {
      response.statusCode = status;
      response.setHeader("Content-Type", "application/json");
      if (cookie !== undefined) response.setHeader("Set-Cookie", `refreshToken=${cookie}; HttpOnly; Path=/api/users; SameSite=Strict`);
      response.end(data === undefined ? undefined : JSON.stringify(data));
    };
    state.requests.push({ path, body, headers: request.headers });
    if (path === "/api/users/refresh") {
      state.refreshCalls++;
      state.refreshStarted?.resolve();
      if (state.refreshGate) await state.refreshGate.promise;
      if (state.refreshFailure === "network") { request.socket.destroy(); return; }
      if (state.refreshFailure) {
        send(state.refreshFailure, { code: state.refreshFailure === 401 ? "REFRESH_INVALID" : "UNAVAILABLE" });
        return;
      }
      assert.equal(request.headers.cookie, `refreshToken=${state.cookie}`);
      state.rotations++;
      state.cookie = `cookie-refresh-${state.rotations}`;
      state.access = `access-refresh-${state.rotations}`;
      send(200, { accessToken: state.access, user: { username: "old", role: "landlord" } }, state.cookie);
      return;
    }
    if (path === "/api/users/signin") {
      state.signinCalls++;
      state.signinStarted?.resolve();
      if (state.signinGate) await state.signinGate.promise;
      if (state.signinFailure) { send(state.signinFailure, { message: "Invalid credentials" }); return; }
      const account = JSON.parse(body);
      state.cookie = `cookie-signin-${state.signinCalls}`;
      state.access = `access-${account.email}-${state.signinCalls}`;
      send(200, { accessToken: state.access, user: { username: account.email, role: "landlord" } }, state.cookie);
      return;
    }
    if (path === "/api/users/logout") {
      state.logoutCalls++;
      state.logoutCookies.push(request.headers.cookie);
      if (state.logoutFailure) { request.socket.destroy(); return; }
      assert.equal(request.headers.cookie, `refreshToken=${state.cookie}`);
      state.cookie = "";
      send(204, undefined, "");
      return;
    }
    if (state.businessHandler && await state.businessHandler({
      request, response, path: path.slice("/api".length), body, send,
    })) return;
    if (state.forceCode || request.headers.authorization !== `Bearer ${state.access}` || state.access === "expired-access") {
      send(401, { code: state.forceCode || "TOKEN_EXPIRED" });
      return;
    }
    if (request.method !== "GET") state.writes.push({ path, body, contentType: request.headers["content-type"] });
    send(200, { saved: true, username: state.access });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseURL = `http://127.0.0.1:${server.address().port}/api`;
  const control = axios.create({ baseURL, headers: { "X-CSRF-Protection": "1" } });
  // Node has no browser cookie jar. This shared jar models the browser's cookie
  // application before a control promise settles; browser attributes need smoke coverage.
  control.interceptors.request.use((config) => {
    config.headers.set("Cookie", `refreshToken=${state.browserCookie}`);
    return config;
  });
  control.interceptors.response.use((response) => {
    const cookie = response.headers["set-cookie"]?.[0];
    if (cookie) state.browserCookie = cookie.split(";")[0].slice("refreshToken=".length);
    return response;
  });
  const navigations = [[], []];
  const tabs = navigations.map((events) => {
    const session = createAuthSession({ storage, locks, control });
    session.bindNavigate((...args) => events.push(args));
    return { session, api: createApiClient(session, { baseURL }) };
  });
  t.after(() => {
    for (const tab of tabs) tab.session.dispose();
    server.closeAllConnections();
    server.close();
  });
  return { state, storage, tabs, navigations, locks, control };
}

const handled = (code) => (error) => isAuthHandledError(error) && error.code === code;

test("two tabs share one rotation and every rejected payment writes exactly once", async (t) => {
  const { state, tabs, storage } = await fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => tabs[index % 2].api.post("/payments", { amount: index + 1 })));
  assert.ok(results.every((response) => response.data.saved));
  assert.equal(state.refreshCalls, 1);
  assert.equal(state.rotations, 1);
  assert.equal(state.writes.length, 8);
  assert.deepEqual(state.writes.map((write) => JSON.parse(write.body).amount).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(storage.getItem("authToken"), "access-refresh-1");
  assert.equal(tabs[0].session.getSnapshot().accessVersion, 1);
  assert.equal(tabs[1].session.getSnapshot().epoch, "legacy");
  assert.ok(!Array.from(storage.values.values()).some((value) => value.includes("cookie-refresh")));
});

test("multipart replay preserves fields and file and performs only one upload", async (t) => {
  const { state, tabs } = await fixture(t);
  const form = new FormData();
  form.append("roomNumber", "A-103");
  form.append("image", new Blob(["unique-image-content"], { type: "image/png" }), "room.png");
  const response = await tabs[0].api.post("/rooms", form);
  assert.equal(response.data.saved, true);
  assert.equal(state.refreshCalls, 1);
  assert.equal(state.writes.length, 1);
  assert.match(state.writes[0].contentType, /^multipart\/form-data; boundary=/);
  assert.match(state.writes[0].body, /name="roomNumber"\r\n\r\nA-103/);
  assert.match(state.writes[0].body, /filename="room.png"/);
  assert.match(state.writes[0].body, /unique-image-content/);
});

test("a late expired response reuses the newer access version without another rotation", async (t) => {
  const { state, tabs } = await fixture(t);
  const arrived = deferred();
  const release = deferred();
  state.businessHandler = async ({ request, path, send }) => {
    if (path !== "/late" || request.headers.authorization !== "Bearer expired-access") return false;
    arrived.resolve();
    await release.promise;
    send(401, { code: "TOKEN_EXPIRED" });
    return true;
  };
  const late = tabs[1].api.post("/late", { contract: "unchanged" });
  await arrived.promise;
  await tabs[0].api.get("/rooms");
  release.resolve();
  assert.equal((await late).data.saved, true);
  assert.equal(state.refreshCalls, 1);
  assert.equal(state.writes.length, 1);
});

for (const code of ["AUTH_REQUIRED", "TOKEN_INVALID", "UNKNOWN_401"]) {
  test(`${code} ends only the current session without refreshing or reporting write success`, async (t) => {
    const { state, tabs, storage, navigations } = await fixture(t);
    state.forceCode = code;
    await assert.rejects(tabs[0].api.post("/payments", { amount: 50 }), handled("SESSION_ENDED"));
    assert.equal(state.refreshCalls, 0);
    assert.equal(state.writes.length, 0);
    assert.equal(storage.getItem("authToken"), null);
    assert.equal(storage.getItem("user"), null);
    assert.equal(storage.getItem("authSessionState"), null);
    assert.equal(navigations[0].length, 1);
    assert.deepEqual(navigations[0][0], ["/login", { replace: true, state: { sessionNotice: "session-ended" } }]);
  });
}

test("a replay that is still unauthorized stops and concurrent terminal errors navigate once", async (t) => {
  const { state, tabs, navigations } = await fixture(t);
  state.businessHandler = async ({ request, send }) => {
    if (request.headers.authorization === "Bearer expired-access") return false;
    send(401, { code: "TOKEN_EXPIRED" });
    return true;
  };
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => tabs[0].api.post("/payments", { amount: 10 })));
  assert.ok(results.every((result) => result.status === "rejected" && isAuthHandledError(result.reason)));
  assert.equal(state.refreshCalls, 1);
  assert.equal(state.writes.length, 0);
  assert.equal(navigations[0].length, 1);
});

for (const failure of [403, 500, "network", "timeout"]) {
  test(`business ${failure} never refreshes or repeats an uncertain write`, async (t) => {
    const { state, tabs } = await fixture(t);
    await tabs[0].session.signIn({ email: "landlord", password: "test-password" });
    state.businessHandler = async ({ request, path, body, send }) => {
      if (path !== "/uncertain") return false;
      state.writes.push({ body });
      if (failure === "network") request.socket.destroy();
      else if (failure !== "timeout") send(failure, { message: "Business request failed" });
      return true;
    };
    const before = tabs[0].session.getSnapshot();
    await assert.rejects(tabs[0].api.post("/uncertain", { amount: 40 }, failure === "timeout" ? { timeout: 50 } : {}), (error) => {
      assert.equal(isAuthHandledError(error), false);
      if (typeof failure === "number") assert.equal(error.response.status, failure);
      if (failure === "timeout") assert.equal(error.code, "ECONNABORTED");
      return true;
    });
    assert.equal(state.writes.length, 1);
    assert.equal(state.refreshCalls, 0);
    assert.equal(tabs[0].session.getSnapshot().epoch, before.epoch);
    assert.equal(tabs[0].session.getSnapshot().token, before.token);
  });
}

for (const failure of [403, 500, "network"]) {
  test(`refresh ${failure} is shared across tabs and stays blocked until explicit retry`, async (t) => {
    const { state, tabs } = await fixture(t);
    state.refreshFailure = failure;
    const requests = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => tabs[i % 2].api.post("/payments", { amount: i })));
    assert.ok(requests.every((result) => result.status === "rejected" && handled("REFRESH_TEMPORARY")(result.reason)));
    assert.equal(state.refreshCalls, 1);
    assert.equal(state.writes.length, 0);
    const failed = tabs[0].session.getSnapshot();
    assert.equal(failed.token, "expired-access");
    assert.equal(tabs[1].session.getSnapshot().refreshFailure.id, failed.refreshFailure.id);
    await assert.rejects(tabs[1].api.post("/payments", { amount: 99 }), handled("REFRESH_TEMPORARY"));
    assert.equal(state.refreshCalls, 1);
    state.refreshFailure = null;
    await Promise.all(tabs.map(({ session }) => session.retryRefresh()));
    assert.equal(state.refreshCalls, 2);
    assert.equal(state.writes.length, 0, "Retry recovery must not resubmit previous payments");
    assert.equal(tabs[0].session.getSnapshot().refreshFailure, null);
    await tabs[1].api.post("/payments", { amount: 7 });
    assert.equal(state.writes.length, 1);
  });
}

test("REFRESH_INVALID terminates once and manual signin never resubmits a failed payment", async (t) => {
  const { state, tabs, navigations } = await fixture(t);
  state.refreshFailure = 401;
  const results = await Promise.allSettled([tabs[0].api.post("/payments", { amount: 25 }), tabs[0].api.get("/rooms")]);
  assert.ok(results.every((result) => result.status === "rejected" && isAuthHandledError(result.reason)));
  assert.equal(navigations[0].length, 1);
  assert.equal(tabs[0].session.getSnapshot().token, null);
  await tabs[0].session.signIn({ email: "replacement", password: "test-password" });
  assert.equal(tabs[0].session.getUser().username, "replacement");
  assert.equal(state.writes.length, 0);
  assert.equal(state.refreshCalls, 1);
});

test("logout immediately invalidates both tabs then revokes the cookie from a pending refresh", async (t) => {
  const { state, tabs, storage } = await fixture(t);
  state.refreshStarted = deferred();
  state.refreshGate = deferred();
  const pending = tabs[0].api.post("/payments", { amount: 200 });
  const rejected = assert.rejects(pending, handled("SESSION_STALE"));
  await state.refreshStarted.promise;
  const loggedOut = tabs[1].session.logout();
  assert.equal(tabs[0].session.getSnapshot().token, null);
  assert.equal(storage.getItem("authToken"), null);
  assert.equal(storage.getItem("user"), null);
  assert.equal(storage.getItem("authSessionState"), null);
  assert.equal(state.logoutCalls, 0);
  state.refreshGate.resolve();
  await Promise.all([rejected, loggedOut]);
  assert.deepEqual(state.logoutCookies, ["refreshToken=cookie-refresh-1"]);
  assert.equal(state.browserCookie, "");
  assert.equal(state.writes.length, 0);
  assert.equal(tabs[0].session.getSnapshot().token, null);
  assert.equal(tabs[1].session.getSnapshot().notice.status, "complete");
});

test("signin waits for pending refresh cookie effects and cannot replay an old-account write", async (t) => {
  const { state, tabs } = await fixture(t);
  state.refreshStarted = deferred();
  state.refreshGate = deferred();
  const pending = tabs[0].api.post("/payments", { amount: 300 });
  // The replay may finish before signin obtains the lock; hold its response to
  // prove consumer-visible data from the previous epoch is rejected either way.
  const replayGate = deferred();
  state.businessHandler = async ({ request, path, send }) => {
    if (path !== "/payments" || request.headers.authorization === "Bearer expired-access") return false;
    await replayGate.promise;
    send(200, { saved: true });
    return true;
  };
  const rejected = assert.rejects(pending, handled("SESSION_STALE"));
  await state.refreshStarted.promise;
  const signin = tabs[1].session.signIn({ email: "new-account", password: "test-password" });
  assert.equal(state.signinCalls, 0);
  state.refreshGate.resolve();
  await signin;
  replayGate.resolve();
  await rejected;
  assert.equal(state.browserCookie, "cookie-signin-1");
  assert.equal(tabs[0].session.getUser().username, "new-account");
  assert.equal(state.writes.length, 0);
  assert.ok(!state.requests.some((request) => request.path === "/api/payments" && request.headers.authorization?.includes("new-account")));
});

test("an old successful business response is rejected after a new signin", async (t) => {
  const { state, tabs } = await fixture(t);
  await tabs[0].session.signIn({ email: "first", password: "test-password" });
  const arrived = deferred();
  const release = deferred();
  state.businessHandler = async ({ path, send }) => {
    if (path !== "/slow-data") return false;
    arrived.resolve();
    await release.promise;
    send(200, { privateData: "first-account" });
    return true;
  };
  const pending = tabs[0].api.get("/slow-data");
  const rejected = assert.rejects(pending, handled("SESSION_STALE"));
  await arrived.promise;
  await tabs[1].session.signIn({ email: "second", password: "test-password" });
  release.resolve();
  await rejected;
  assert.equal(tabs[0].session.getUser().username, "second");
});

test("an old 401 cannot end a newer signin or replay under that account", async (t) => {
  const { state, tabs, navigations } = await fixture(t);
  const arrived = deferred();
  const release = deferred();
  state.businessHandler = async ({ path, send }) => {
    if (path !== "/old-write") return false;
    arrived.resolve();
    await release.promise;
    send(401, { code: "TOKEN_INVALID" });
    return true;
  };
  const pending = tabs[0].api.post("/old-write", { amount: 500 });
  const rejected = assert.rejects(pending, handled("SESSION_STALE"));
  await arrived.promise;
  await tabs[1].session.signIn({ email: "second", password: "test-password" });
  release.resolve();
  await rejected;
  assert.equal(tabs[0].session.getUser().username, "second");
  assert.equal(navigations[0].length, 0);
  assert.equal(state.refreshCalls, 0);
  assert.equal(state.writes.length, 0);
});

test("logout network failure stays locally ended, reports unconfirmed revocation, and permits explicit retry", async (t) => {
  const { state, tabs, storage } = await fixture(t);
  state.logoutFailure = true;
  await assert.rejects(tabs[0].session.logout(), handled("LOGOUT_UNCONFIRMED"));
  assert.equal(tabs[1].session.getSnapshot().token, null);
  assert.equal(tabs[1].session.getSnapshot().notice.status, "failed");
  assert.equal(storage.getItem("authToken"), null);
  await assert.rejects(tabs[1].api.get("/rooms"), handled("SESSION_STALE"));
  assert.equal(state.refreshCalls, 0, "a cookie must never bootstrap a locally ended session");
  state.logoutFailure = false;
  await tabs[1].session.logout();
  assert.equal(tabs[0].session.getSnapshot().notice.status, "complete");
  assert.equal(state.logoutCalls, 2);
});

test("logout during signin prevents its response and cookie from restoring a session", async (t) => {
  const { state, tabs } = await fixture(t);
  state.signinStarted = deferred();
  state.signinGate = deferred();
  const pending = tabs[0].session.signIn({ email: "new", password: "test-password" });
  const rejected = assert.rejects(pending, handled("SESSION_STALE"));
  await state.signinStarted.promise;
  const logout = tabs[1].session.logout();
  state.signinGate.resolve();
  await Promise.all([rejected, logout]);
  assert.deepEqual(state.logoutCookies, ["refreshToken=cookie-signin-1"]);
  assert.equal(tabs[0].session.getSnapshot().token, null);
});

test("the invalidation fence wins even when logout interrupts a refresh storage commit", async (t) => {
  const { state, storage, tabs } = await fixture(t);
  let logout;
  storage.onSet = (key, value) => {
    if (key !== "authSessionState" || !value.includes("access-refresh-1")) return;
    storage.onSet = null;
    logout = tabs[1].session.logout();
  };
  await assert.rejects(tabs[0].api.post("/payments", { amount: 70 }), handled("SESSION_STALE"));
  await logout;
  assert.equal(tabs[0].session.getSnapshot().token, null);
  assert.equal(storage.getItem("authToken"), null);
  assert.equal(storage.getItem("user"), null);
  assert.equal(storage.getItem("authSessionState"), null);
  assert.equal(state.writes.length, 0);
  assert.deepEqual(state.logoutCookies, ["refreshToken=cookie-refresh-1"]);
});

test("wrong credentials preserve the existing epoch and user", async (t) => {
  const { state, tabs } = await fixture(t);
  const before = tabs[0].session.getSnapshot();
  state.signinFailure = 400;
  await assert.rejects(tabs[0].session.signIn({ email: "wrong", password: "bad" }), (error) => error.response.status === 400);
  assert.equal(tabs[0].session.getSnapshot(), before);
});

test("unsupported Web Locks refuses unsafe fallback and malformed stored user is harmless", async (t) => {
  const { storage, control, state } = await fixture(t);
  storage.setItem("user", "not-json");
  const session = createAuthSession({ storage, control });
  t.after(() => session.dispose());
  assert.equal(session.getUser(), null);
  assert.equal(session.getSnapshot(), session.getSnapshot(), "external-store snapshots must be referentially stable");
  await assert.rejects(session.signIn({ email: "new", password: "test-password" }), /Web Locks/);
  await assert.rejects(session.ensureFresh(session.getSnapshot()), handled("REFRESH_TEMPORARY"));
  assert.equal(state.signinCalls, 0);
  assert.equal(state.refreshCalls, 0);
  assert.equal(session.getSnapshot().token, "expired-access");
});

test("storage and BroadcastChannel notifications reread shared state without broadcasting credentials", async () => {
  const storage = new SharedStorage();
  const events = new EventTarget();
  const messages = new EventTarget();
  const sent = [];
  messages.postMessage = (message) => sent.push(message);
  messages.close = () => {};
  const session = createAuthSession({ storage, locks: new OriginLocks(), control: {}, eventTarget: events, channel: messages });
  const navigations = [];
  session.bindNavigate((...args) => navigations.push(args));
  let observed;
  const unsubscribe = session.subscribe(() => { observed = session.getSnapshot(); });
  await session.invalidate("legacy");
  assert.deepEqual(sent, [{ type: "session-changed" }]);
  storage.setItem("authSessionEpoch", "other-tab-ended");
  storage.setItem("authSessionInvalidation", "other-tab-ended");
  storage.setItem("authSessionNotice", JSON.stringify({ epoch: "other-tab-ended", reason: "session-ended", status: "ended" }));
  const storageEvent = new Event("storage");
  Object.defineProperty(storageEvent, "key", { value: "authSessionNotice" });
  events.dispatchEvent(storageEvent);
  messages.dispatchEvent(new Event("message"));
  assert.equal(observed.token, null);
  assert.equal(navigations.length, 2, "each ended epoch navigates once despite duplicate notifications");
  assert.equal(sent.length, 1, "receiving a notification must not create a broadcast loop");
  unsubscribe();
  session.dispose();
});

test("logout also wins a signin commit race and clears every stored access credential", async (t) => {
  const { state, storage, tabs } = await fixture(t);
  let logout;
  storage.onSet = (key, value) => {
    if (key !== "authSessionState" || !value.includes("access-new-account-1")) return;
    storage.onSet = null;
    logout = tabs[1].session.logout();
  };
  await assert.rejects(tabs[0].session.signIn({ email: "new-account", password: "test-password" }), handled("SESSION_STALE"));
  await logout;
  assert.equal(tabs[0].session.getSnapshot().token, null);
  assert.equal(storage.getItem("authToken"), null);
  assert.equal(storage.getItem("user"), null);
  assert.equal(storage.getItem("authSessionState"), null);
  assert.deepEqual(state.logoutCookies, ["refreshToken=cookie-signin-1"]);
});

test("removing the local access token disables access without cookie bootstrap", async (t) => {
  const { state, storage, tabs } = await fixture(t);
  await tabs[0].session.signIn({ email: "landlord", password: "test-password" });
  storage.removeItem("authToken");
  assert.equal(tabs[0].session.getSnapshot().token, null);
  await assert.rejects(tabs[0].api.get("/rooms"), handled("SESSION_STALE"));
  assert.equal(state.refreshCalls, 0);
});

test("a terminal response waits for an in-flight signin and cannot invalidate its new epoch", async (t) => {
  const { state, tabs, navigations } = await fixture(t);
  state.signinStarted = deferred();
  state.signinGate = deferred();
  const signin = tabs[1].session.signIn({ email: "new-account", password: "test-password" });
  await state.signinStarted.promise;
  const arrived = deferred();
  state.businessHandler = async ({ path, send }) => {
    if (path !== "/old-terminal") return false;
    arrived.resolve();
    send(401, { code: "TOKEN_INVALID" });
    return true;
  };
  const pending = tabs[0].api.post("/old-terminal", { amount: 20 });
  const rejected = assert.rejects(pending, handled("SESSION_STALE"));
  await arrived.promise;
  state.signinGate.resolve();
  await Promise.all([signin, rejected]);
  assert.equal(tabs[0].session.getUser().username, "new-account");
  assert.equal(navigations[0].length, 0);
  assert.equal(state.refreshCalls, 0);
  assert.equal(state.writes.length, 0);
});

test("a delayed old access response preserves a newer temporary refresh failure and its form", async (t) => {
  const { state, tabs, storage, navigations } = await fixture(t);
  const arrived = deferred();
  const release = deferred();
  state.businessHandler = async ({ request, path, send }) => {
    if (path !== "/late-failure" || request.headers.authorization !== "Bearer expired-access") return false;
    arrived.resolve();
    await release.promise;
    send(401, { code: "TOKEN_EXPIRED" });
    return true;
  };
  const oldRequest = tabs[1].api.post("/late-failure", { unsavedContract: "keep" });
  const rejected = assert.rejects(oldRequest, handled("REFRESH_TEMPORARY"));
  await arrived.promise;
  await tabs[0].api.get("/rooms");
  state.access = "expired-again";
  state.refreshFailure = 500;
  await assert.rejects(tabs[0].api.get("/rooms"), handled("REFRESH_TEMPORARY"));
  release.resolve();
  await rejected;
  assert.equal(storage.getItem("authToken"), "access-refresh-1");
  assert.ok(tabs[1].session.getSnapshot().refreshFailure);
  assert.equal(state.refreshCalls, 2);
  assert.equal(state.writes.length, 0);
  assert.equal(navigations.flat().length, 0);
});
