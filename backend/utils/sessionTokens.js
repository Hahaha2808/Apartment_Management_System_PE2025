import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

export const ACCESS_TTL_SECONDS = 300;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createAccessToken(user, expiresAt, now = Date.now()) {
  const secret = process.env.SECRET_KEY;
  if (typeof secret !== "string" || !secret.trim()) {
    throw new Error("JWT signing configuration is missing");
  }
  const issuedAt = Math.floor(now / 1000);
  const expires = Math.min(issuedAt + ACCESS_TTL_SECONDS, Math.floor(expiresAt.getTime() / 1000));
  if (expires <= issuedAt) throw new Error("Session has expired");
  return jwt.sign({ id: String(user._id), role: user.role, iat: issuedAt, exp: expires }, secret);
}

export function newRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function readRefreshToken(req) {
  const values = (req.headers.cookie || "").split(";").map((part) => part.trim());
  const matches = values.filter((part) => part.startsWith("refreshToken="));
  if (matches.length !== 1) return null;
  const token = matches[0].slice("refreshToken=".length);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/users",
  };
}

export function setRefreshCookie(res, token, expiresAt) {
  const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  if (remaining <= 0) throw new Error("Session has expired");
  res.cookie("refreshToken", token, {
    ...refreshCookieOptions(),
    maxAge: remaining * 1000,
  });
}
