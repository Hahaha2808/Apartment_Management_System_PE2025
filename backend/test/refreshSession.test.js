import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRoutes from "../routes/userRoutes.js";
import User from "../models/User.model.js";
import RefreshSession from "../models/RefreshSession.model.js";
import { authenticateToken, authorizeLandlord } from "../middleware/authMiddleware.js";

process.env.SECRET_KEY = "disposable-refresh-integration-test-key";
process.env.APP_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
const testOrigin = process.env.APP_ORIGIN;
const databaseName = `domis_jwt_test_${randomUUID().replaceAll("-", "")}`;
let server;
let baseURL;
let user;
let writes = 0;
const password = "Disposable-test-password-29!";
const hash = (token) => createHash("sha256").update(token).digest("hex");
const rawToken = (cookie) => cookie.slice("refreshToken=".length);

before(async () => {
  assert.ok(process.env.TEST_MONGO_URI, "Set TEST_MONGO_URI to a local disposable MongoDB server");
  const uri = new URL(process.env.TEST_MONGO_URI);
  assert.equal(uri.protocol, "mongodb:");
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(uri.hostname), "Only a local test database is allowed");
  uri.pathname = `/${databaseName}`;
  await mongoose.connect(uri.href, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), RefreshSession.init()]);
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRoutes);
  app.post("/write", authenticateToken, authorizeLandlord, (req, res) => {
    writes += 1;
    res.json({ userId: req.user.id, writes });
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), RefreshSession.deleteMany({})]);
  user = await User.create({
    fullname: "JWT Test Landlord",
    username: "jwt_test_landlord",
    email: "jwt.landlord@example.invalid",
    password: await bcrypt.hash(password, 4),
    phone_number: "0900000000",
    role: "landlord",
  });
  writes = 0;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, databaseName);
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

async function control(path, { cookie, body = {}, origin = testOrigin, csrf = "1", authorization } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin !== null) headers.Origin = origin;
  if (csrf !== null) headers["X-CSRF-Protection"] = csrf;
  if (cookie) headers.Cookie = cookie;
  if (authorization) headers.Authorization = authorization;
  return fetch(`${baseURL}/api/users/${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

async function signin(cookie) {
  const response = await control("signin", { cookie, body: { email: user.email, password } });
  assert.equal(response.status, 200);
  return { cookie: response.headers.get("set-cookie").split(";")[0], body: await response.json(), response };
}

test("signin issues a five-minute access token and hash-only one-day refresh session", async () => {
  const result = await signin();
  const claims = jwt.verify(result.body.accessToken, process.env.SECRET_KEY);
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(claims.id, String(user._id));
  assert.equal(result.body.user.password, undefined);
  const token = rawToken(result.cookie);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(result.body).includes(token), false);
  const session = await RefreshSession.findOne({ userId: user._id }).lean();
  assert.equal(session.currentTokenHash, hash(token));
  assert.deepEqual(session.tokenHashes, [hash(token)]);
  assert.equal(session.expiresAt - session.createdAt, 86_400_000);
  assert.equal(JSON.stringify(session).includes(token), false);
  const cookie = result.response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/users/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.equal(result.response.headers.get("cache-control"), "no-store");
});

test("refresh rotates the credential without extending the absolute expiry", async () => {
  const first = await signin();
  const original = await RefreshSession.findOne({ userId: user._id }).lean();
  const response = await control("refresh", { cookie: first.cookie });
  assert.equal(response.status, 200);
  const secondCookie = response.headers.get("set-cookie").split(";")[0];
  assert.notEqual(secondCookie, first.cookie);
  const current = await RefreshSession.findById(original._id).lean();
  assert.equal(current.expiresAt.getTime(), original.expiresAt.getTime());
  assert.equal(current.createdAt.getTime(), original.createdAt.getTime());
  assert.equal(current.currentTokenHash, hash(rawToken(secondCookie)));
  assert.deepEqual(current.tokenHashes, [hash(rawToken(first.cookie)), hash(rawToken(secondCookie))]);
  const body = await response.json();
  assert.equal(jwt.verify(body.accessToken, process.env.SECRET_KEY).exp - jwt.decode(body.accessToken).iat, 300);
});

test("a replayed refresh token revokes its family but not independent sessions", async () => {
  const first = await signin();
  const independent = await signin();
  const refreshed = await control("refresh", { cookie: first.cookie });
  const currentCookie = refreshed.headers.get("set-cookie").split(";")[0];
  const replay = await control("refresh", { cookie: first.cookie });
  assert.equal(replay.status, 401);
  assert.equal((await replay.json()).code, "REFRESH_INVALID");
  assert.equal(replay.headers.get("set-cookie"), null);
  assert.equal((await control("refresh", { cookie: currentCookie })).status, 401);
  assert.equal((await control("refresh", { cookie: independent.cookie })).status, 200);
});

test("two simultaneous uses cannot both rotate the same credential", async () => {
  const first = await signin();
  const responses = await Promise.all([
    control("refresh", { cookie: first.cookie }),
    control("refresh", { cookie: first.cookie }),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 401]);
  const row = await RefreshSession.findOne({ userId: user._id }).lean();
  assert.ok(row.revokedAt);
});

test("refresh uses current permissions and rejects a deleted user", async () => {
  const first = await signin();
  await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
  const refreshed = await control("refresh", { cookie: first.cookie });
  const currentCookie = refreshed.headers.get("set-cookie").split(";")[0];
  const body = await refreshed.json();
  assert.equal(body.user.role, "admin");
  assert.equal(jwt.verify(body.accessToken, process.env.SECRET_KEY).role, "admin");
  await User.deleteOne({ _id: user._id });
  const deleted = await control("refresh", { cookie: currentCookie });
  assert.equal(deleted.status, 401);
  assert.equal((await deleted.json()).code, "REFRESH_INVALID");
});

test("expired sessions are rejected even when the TTL cleanup has not removed them", async () => {
  const first = await signin();
  const row = await RefreshSession.findOne({ userId: user._id });
  await RefreshSession.collection.updateOne({ _id: row._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const response = await control("refresh", { cookie: first.cookie });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "REFRESH_INVALID");
});

test("a session that expires during the account lookup is rejected, not reported as a server failure", async (t) => {
  const first = await signin();
  const row = await RefreshSession.findOne({ userId: user._id });
  const before = row.currentTokenHash;
  let clock = Date.now();
  const boundary = clock + 60_000;
  await RefreshSession.collection.updateOne({ _id: row._id }, { $set: { expiresAt: new Date(boundary) } });
  const originalFind = User.findById;
  t.mock.method(Date, "now", () => clock);
  t.mock.method(User, "findById", function (...args) {
    const query = originalFind.apply(this, args);
    const execute = query.exec;
    query.exec = async function (...options) {
      const found = await execute.apply(this, options);
      clock = boundary;
      return found;
    };
    return query;
  });
  const response = await control("refresh", { cookie: first.cookie });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "REFRESH_INVALID");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await RefreshSession.findById(row._id)).currentTokenHash, before);
});

test("access issued near session expiry cannot outlive the absolute limit", async () => {
  const first = await signin();
  const boundary = Math.floor(Date.now() / 1000) * 1000 + 60_000;
  const row = await RefreshSession.findOne({ userId: user._id });
  await RefreshSession.collection.updateOne({ _id: row._id }, { $set: { expiresAt: new Date(boundary) } });
  const response = await control("refresh", { cookie: first.cookie });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(jwt.verify(body.accessToken, process.env.SECRET_KEY).exp, boundary / 1000);
  const cookieAge = Number(response.headers.get("set-cookie").match(/Max-Age=(\d+)/)[1]);
  assert.ok(cookieAge > 0 && cookieAge <= 60);
});

test("an expired access JWT alone is never sufficient to refresh", async () => {
  const expired = jwt.sign({ id: String(user._id), role: user.role }, process.env.SECRET_KEY, { expiresIn: -1 });
  const response = await control("refresh", { authorization: `Bearer ${expired}`, body: { accessToken: expired } });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "REFRESH_INVALID");
  assert.equal(await RefreshSession.countDocuments(), 0);
});

test("logout revokes refresh, clears cookie at its original path and is idempotent", async () => {
  const first = await signin();
  const independent = await signin();
  const response = await control("logout", { cookie: first.cookie });
  assert.equal(response.status, 204);
  assert.match(response.headers.get("set-cookie"), /Path=\/api\/users/);
  assert.match(response.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
  assert.equal((await control("logout", { cookie: first.cookie })).status, 204);
  assert.equal((await control("logout")).status, 204);
  assert.equal((await control("refresh", { cookie: first.cookie })).status, 401);
  assert.equal((await control("refresh", { cookie: independent.cookie })).status, 200);
  const accessResponse = await fetch(`${baseURL}/write`, { method: "POST", headers: { Authorization: `Bearer ${first.body.accessToken}` } });
  assert.equal(accessResponse.status, 200);
});

test("successful signin replaces the browser's old refresh session, bad password does not", async () => {
  const first = await signin();
  const denied = await control("signin", { cookie: first.cookie, body: { email: user.email, password: "wrong" } });
  assert.equal(denied.status, 400);
  assert.equal((await RefreshSession.findOne({ userId: user._id })).revokedAt, null);
  const second = await signin(first.cookie);
  assert.equal((await control("refresh", { cookie: first.cookie })).status, 401);
  assert.equal((await control("refresh", { cookie: second.cookie })).status, 200);
});

test("cross-origin or missing CSRF headers cannot mutate any session endpoint", async () => {
  const first = await signin();
  for (const path of ["signin", "refresh", "logout"]) {
    for (const options of [{ origin: "https://evil.example" }, { origin: null }, { csrf: null }]) {
      const response = await control(path, { ...options, cookie: first.cookie, body: { email: user.email, password } });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("set-cookie"), null);
    }
  }
  assert.equal(await RefreshSession.countDocuments(), 1);
  const row = await RefreshSession.findOne({ userId: user._id }).lean();
  assert.equal(row.revokedAt, null);
  assert.equal(row.currentTokenHash, hash(rawToken(first.cookie)));
});

test("production cookie requires HTTPS origin and is Secure, without changing the session lifetime", async () => {
  process.env.NODE_ENV = "production";
  process.env.APP_ORIGIN = "https://domis.example.test";
  try {
    const response = await control("signin", { origin: process.env.APP_ORIGIN, body: { email: user.email, password } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /; Secure/);
    process.env.APP_ORIGIN = "http://domis.example.test";
    assert.equal((await control("refresh", { origin: process.env.APP_ORIGIN })).status, 500);
  } finally {
    process.env.NODE_ENV = "test";
    process.env.APP_ORIGIN = testOrigin;
  }
});
