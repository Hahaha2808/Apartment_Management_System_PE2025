import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";

const testKey = "disposable-auth-boundary-test-key";
process.env.SECRET_KEY = testKey;
const messages = [];
const originalLog = console.log;
console.log = (...values) => messages.push(values.join(" "));
const { authenticateToken, authorizeLandlord } = await import("../middleware/authMiddleware.js");
let server;
let baseURL;
let writes = 0;
const user = { id: "507f1f77bcf86cd799439011", role: "landlord" };

before(async () => {
  const app = express();
  app.post("/protected", authenticateToken, authorizeLandlord, (req, res) => {
    writes += 1;
    res.json({ id: req.user.id, writes });
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  console.log = originalLog;
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function request(authorization) {
  return fetch(`${baseURL}/protected`, {
    method: "POST",
    headers: authorization === undefined ? {} : { authorization },
  });
}

for (const authorization of [undefined, "Bearer", "Bearer ", "Basic abc"]) {
  test(`missing credential (${authorization ?? "no header"}) cannot perform a write`, async () => {
    const beforeWrites = writes;
    const response = await request(authorization);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "AUTH_REQUIRED");
    assert.equal(response.headers.get("www-authenticate"), "Bearer");
    assert.equal(writes, beforeWrites);
  });
}

for (const [name, token, code] of [
  ["malformed", "broken", "TOKEN_INVALID"],
  ["wrong signature", jwt.sign(user, "a-different-disposable-key"), "TOKEN_INVALID"],
  ["expired", jwt.sign(user, testKey, { expiresIn: -1 }), "TOKEN_EXPIRED"],
  ["not active", jwt.sign(user, testKey, { notBefore: 3600 }), "TOKEN_INVALID"],
  ["extra credential", `${jwt.sign(user, testKey)} extra`, "TOKEN_INVALID"],
]) {
  test(`${name} token cannot perform a write`, async () => {
    const beforeWrites = writes;
    const response = await request(`Bearer ${token}`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, code);
    assert.equal(writes, beforeWrites);
    assert.equal(messages.some((line) => line.includes(token)), false);
  });
}

test("valid landlord can write with a case-insensitive Bearer scheme", async () => {
  const beforeWrites = writes;
  const response = await request(`bEaReR ${jwt.sign(user, testKey, { expiresIn: 60 })}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: user.id, writes: beforeWrites + 1 });
});

test("valid user with insufficient role cannot write", async () => {
  const beforeWrites = writes;
  const response = await request(`Bearer ${jwt.sign({ ...user, role: "admin" }, testKey)}`);
  assert.equal(response.status, 403);
  assert.equal(writes, beforeWrites);
});

test("missing verification configuration is a server failure, not an invalid token", async () => {
  const beforeWrites = writes;
  delete process.env.SECRET_KEY;
  try {
    const response = await request(`Bearer ${jwt.sign(user, testKey)}`);
    assert.equal(response.status, 500);
    assert.equal(writes, beforeWrites);
  } finally {
    process.env.SECRET_KEY = testKey;
  }
});

test("authentication does not print signing credentials or decoded identity", () => {
  assert.equal(messages.some((line) => line.includes(testKey)), false);
  assert.equal(messages.some((line) => line.includes(user.id)), false);
});
