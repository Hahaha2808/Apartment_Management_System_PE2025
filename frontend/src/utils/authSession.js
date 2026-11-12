import { authApi } from "./authTransport.js";

const EPOCH_KEY = "authSessionEpoch";
const FENCE_KEY = "authSessionInvalidation";
const STATE_KEY = "authSessionState";
const NOTICE_KEY = "authSessionNotice";
const LOCK_NAME = "domis-session-control";
const CHANNEL_NAME = "domis-session";

function parse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export class SessionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "SessionError";
    this.code = code;
    this.authHandled = true;
  }
}

const staleError = () => new SessionError(
  "This request belongs to a session that has ended.", "SESSION_STALE"
);
const temporaryError = (failure) => new SessionError(failure.message, "REFRESH_TEMPORARY");

// Dependencies are injectable so tests can exercise two independent tabs sharing
// storage, a cookie jar and the same lock service without a browser-specific runner.
export function createAuthSession({ storage, locks, control, eventTarget, channel }) {
  const subscribers = new Set();
  let navigate;
  let lastNavigationEpoch;
  let cachedKey;
  let cachedSnapshot;
  let refreshFlight;
  let logoutFlight;

  function getSnapshot() {
    const storedEpoch = storage.getItem(EPOCH_KEY) || "legacy";
    const fence = storage.getItem(FENCE_KEY) || "initial";
    const rawState = storage.getItem(STATE_KEY);
    const state = parse(rawState);
    const invalidated = state ? state.fence !== fence : fence !== "initial";
    const epoch = invalidated ? fence : storedEpoch;
    const rawNotice = storage.getItem(NOTICE_KEY);
    const storedToken = storage.getItem("authToken");
    const storedUser = storage.getItem("user");
    const legacyToken = epoch === "legacy" && !state && !invalidated ? storedToken : null;
    const legacyUser = epoch === "legacy" && !state && !invalidated ? storedUser : null;
    const key = JSON.stringify([epoch, fence, rawState, rawNotice, storedToken, storedUser]);
    if (key === cachedKey) return cachedSnapshot;
    const notice = parse(rawNotice);
    const current = !invalidated && state?.epoch === epoch ? state : null;
    const user = current ? current.user : parse(legacyUser);
    cachedKey = key;
    cachedSnapshot = {
      epoch,
      fence,
      accessVersion: current?.accessVersion || 0,
      token: current && storedToken ? current.accessToken : legacyToken || null,
      user: user && typeof user === "object" && !Array.isArray(user) ? user : null,
      refreshFailure: current?.refreshFailure || null,
      notice: notice?.epoch === epoch ? notice : null,
    };
    return cachedSnapshot;
  }

  function notify() {
    const snapshot = getSnapshot();
    for (const listener of subscribers) listener();
    if (!snapshot.token && snapshot.notice && navigate && lastNavigationEpoch !== snapshot.epoch) {
      lastNavigationEpoch = snapshot.epoch;
      navigate("/login", { replace: true, state: { sessionNotice: snapshot.notice.reason } });
    }
  }

  function publish() {
    notify();
    // Messages contain no credentials. Receivers always re-read authoritative storage.
    channel?.postMessage({ type: "session-changed" });
  }

  function isCurrent(epoch) {
    const current = getSnapshot();
    return current.epoch === epoch && Boolean(current.token);
  }

  function assertCurrent(epoch) {
    if (!isCurrent(epoch)) throw staleError();
    return getSnapshot();
  }

  function withControlLock(callback) {
    if (!locks?.request) {
      throw new Error("Session recovery requires a browser with Web Locks on HTTPS (or localhost). Please use a supported browser.");
    }
    // Do not release this lock on a timer: a pending response can still set a cookie.
    return locks.request(LOCK_NAME, { mode: "exclusive" }, callback);
  }

  function commit(epoch, fence, accessVersion, data, refreshFailure = null) {
    storage.setItem(STATE_KEY, JSON.stringify({
      epoch, fence, accessVersion, accessToken: data.accessToken, user: data.user, refreshFailure,
    }));
    storage.setItem("authToken", data.accessToken);
    storage.setItem("user", JSON.stringify(data.user));
  }

  function clearCredentials() {
    storage.removeItem("authToken");
    storage.removeItem("user");
    storage.removeItem(STATE_KEY);
  }

  function endSession(expectedEpoch, reason, allowEmpty = false) {
    const current = getSnapshot();
    if (current.epoch !== expectedEpoch || (!current.token && !allowEmpty)) return null;
    const epoch = globalThis.crypto.randomUUID();
    // This fence is written only by invalidation, never by signin/refresh. It
    // dominates an in-flight commit even between its final check and write.
    storage.setItem(FENCE_KEY, epoch);
    storage.setItem(EPOCH_KEY, epoch);
    clearCredentials();
    storage.setItem(NOTICE_KEY, JSON.stringify({
      epoch, reason, status: reason === "logout" ? "pending" : "ended",
    }));
    publish();
    return epoch;
  }

  function invalidateNow(epoch) {
    endSession(epoch, "session-ended");
    return new SessionError("Your session has ended. Please log in again.", "SESSION_ENDED");
  }

  async function invalidate(epoch) {
    const finish = () => isCurrent(epoch) ? invalidateNow(epoch) : staleError();
    // A terminal response from an old epoch must not race a signin commit.
    // Refresh already owns this lock and uses invalidateNow directly.
    return locks?.request ? withControlLock(finish) : finish();
  }

  function failureMessage(error) {
    if (error.response?.status === 403) {
      return "Session recovery was blocked by the server's security configuration. Retry or contact support.";
    }
    if (!locks?.request) return error.message;
    return "Session recovery is temporarily unavailable. Your session and form have been kept. Please retry recovery.";
  }

  function saveFailure(epoch, version, error) {
    const current = assertCurrent(epoch);
    if (current.accessVersion !== version) return current;
    const failure = {
      id: globalThis.crypto.randomUUID(), accessVersion: version, message: failureMessage(error),
    };
    commit(epoch, current.fence, version, { accessToken: current.token, user: current.user }, failure);
    if (!isCurrent(epoch)) {
      clearCredentials();
      throw staleError();
    }
    publish();
    throw temporaryError(failure);
  }

  function ensureFresh(requestSnapshot, retryFailureId = null) {
    const { epoch, accessVersion } = requestSnapshot;
    let current;
    try {
      current = assertCurrent(epoch);
      if (current.refreshFailure && current.refreshFailure.id !== retryFailureId) {
        return Promise.reject(temporaryError(current.refreshFailure));
      }
      if (current.accessVersion > accessVersion) return Promise.resolve(current);
    } catch (error) {
      return Promise.reject(error);
    }
    if (refreshFlight?.epoch === epoch && refreshFlight.version === accessVersion) {
      return refreshFlight.promise;
    }
    const flight = { epoch, version: accessVersion };
    refreshFlight = flight;
    flight.promise = (async () => {
      try {
        return await withControlLock(async () => {
          current = assertCurrent(epoch);
          if (current.refreshFailure && current.refreshFailure.id !== retryFailureId) {
            throw temporaryError(current.refreshFailure);
          }
          if (current.accessVersion > accessVersion) return current;
          try {
            const response = await control.post("/users/refresh");
            current = assertCurrent(epoch);
            commit(epoch, current.fence, current.accessVersion + 1, response.data);
            if (!isCurrent(epoch)) {
              clearCredentials();
              throw staleError();
            }
            publish();
            return getSnapshot();
          } catch (error) {
            if (error.authHandled) throw error;
            assertCurrent(epoch);
            if (error.response?.status === 401 && error.response?.data?.code === "REFRESH_INVALID") {
              throw invalidateNow(epoch);
            }
            return saveFailure(epoch, accessVersion, error);
          }
        });
      } catch (error) {
        if (error.authHandled) throw error;
        return saveFailure(epoch, accessVersion, error);
      } finally {
        if (refreshFlight === flight) refreshFlight = null;
      }
    })();
    return flight.promise;
  }

  async function retryRefresh() {
    const current = getSnapshot();
    if (!current.refreshFailure) return current;
    // Restores credentials only. Rejected consumer requests are never retained or replayed here.
    return ensureFresh(current, current.refreshFailure.id);
  }

  async function signIn(account) {
    return withControlLock(async () => {
      const starting = getSnapshot();
      const response = await control.post("/users/signin", account);
      if (getSnapshot().epoch !== starting.epoch) throw staleError();
      const epoch = globalThis.crypto.randomUUID();
      commit(epoch, starting.fence, 0, response.data);
      storage.setItem(EPOCH_KEY, epoch);
      if (!isCurrent(epoch)) {
        clearCredentials();
        throw staleError();
      }
      publish();
      return response.data;
    });
  }

  function setLogoutNotice(epoch, status) {
    if (getSnapshot().epoch !== epoch) return;
    storage.setItem(NOTICE_KEY, JSON.stringify({ epoch, reason: "logout", status }));
    publish();
  }

  function logout() {
    const current = getSnapshot();
    const epoch = !current.token && current.notice?.reason === "logout"
      ? current.epoch
      : endSession(current.epoch, "logout", true);
    if (logoutFlight?.epoch === epoch) return logoutFlight.promise;
    setLogoutNotice(epoch, "pending");
    const flight = { epoch };
    logoutFlight = flight;
    flight.promise = (async () => {
      try {
        await withControlLock(async () => {
          if (getSnapshot().epoch !== epoch) throw staleError();
          // A pending refresh/signin response has now settled, so this request uses
          // the newest cookie. An older logout must never revoke a newer signin.
          const response = await control.post("/users/logout");
          if (response.status !== 204) throw new Error("Server logout was not confirmed.");
          if (getSnapshot().epoch !== epoch) throw staleError();
          setLogoutNotice(epoch, "complete");
          navigate?.("/", { replace: true });
        });
      } catch (error) {
        if (getSnapshot().epoch === epoch) setLogoutNotice(epoch, "failed");
        if (error.authHandled) throw error;
        throw new SessionError(
          "You are logged out on this device, but server revocation could not be confirmed. Retry logout when connected.",
          "LOGOUT_UNCONFIRMED"
        );
      } finally {
        if (logoutFlight === flight) logoutFlight = null;
      }
    })();
    return flight.promise;
  }

  const onStorage = (event) => {
    if (!event.key || [EPOCH_KEY, FENCE_KEY, STATE_KEY, NOTICE_KEY, "authToken", "user"].includes(event.key)) notify();
  };
  const onMessage = () => notify();
  eventTarget?.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onMessage);

  return {
    getSnapshot,
    getUser: () => getSnapshot().user,
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
    bindNavigate(callback) { navigate = callback; },
    isCurrent,
    invalidate,
    ensureFresh,
    retryRefresh,
    signIn,
    logout,
    dispose() {
      eventTarget?.removeEventListener("storage", onStorage);
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      subscribers.clear();
    },
  };
}

const browserWindow = globalThis.window;
export const authSession = createAuthSession({
  storage: globalThis.localStorage,
  locks: globalThis.navigator?.locks,
  control: authApi,
  eventTarget: browserWindow,
  channel: browserWindow && globalThis.BroadcastChannel ? new BroadcastChannel(CHANNEL_NAME) : null,
});

export const getUser = () => authSession.getUser();
export const getSessionSnapshot = () => authSession.getSnapshot();
export const subscribeSession = (listener) => authSession.subscribe(listener);
export const bindSessionNavigation = (navigate) => authSession.bindNavigate(navigate);
export const signIn = (account) => authSession.signIn(account);
export const logout = () => authSession.logout();
export const retryRefresh = () => authSession.retryRefresh();
