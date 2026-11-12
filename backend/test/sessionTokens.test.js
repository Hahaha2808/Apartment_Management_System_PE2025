import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { createAccessToken, SESSION_TTL_MS } from "../utils/sessionTokens.js";

process.env.SECRET_KEY = "disposable-token-lifetime-test-key";
const user = { _id: "507f1f77bcf86cd799439011", role: "landlord" };
const now = 1_800_000_000_000;

test("new access credentials expire at exactly five minutes", () => {
  const token = createAccessToken(user, new Date(now + SESSION_TTL_MS), now);
  const claims = jwt.verify(token, process.env.SECRET_KEY, { clockTimestamp: now / 1000 });
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(claims.id, user._id);
  assert.equal(claims.role, "landlord");
  assert.throws(() => jwt.verify(token, process.env.SECRET_KEY, { clockTimestamp: claims.exp }), jwt.TokenExpiredError);
});

test("refresh cannot issue an access token beyond the absolute session boundary", () => {
  const absoluteExpiry = now + 59_000;
  const token = createAccessToken(user, new Date(absoluteExpiry), now);
  const claims = jwt.verify(token, process.env.SECRET_KEY, { clockTimestamp: now / 1000 });
  assert.equal(claims.exp, absoluteExpiry / 1000);
  assert.throws(() => jwt.verify(token, process.env.SECRET_KEY, { clockTimestamp: absoluteExpiry / 1000 }), jwt.TokenExpiredError);
});

test("an elapsed absolute boundary never grants another access credential", () => {
  assert.throws(() => createAccessToken(user, new Date(now), now));
  assert.throws(() => createAccessToken(user, new Date(now - 1), now));
});
