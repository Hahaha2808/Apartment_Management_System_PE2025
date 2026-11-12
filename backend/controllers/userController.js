import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import RefreshSession from "../models/RefreshSession.model.js";
import {
  createAccessToken,
  hashRefreshToken,
  newRefreshToken,
  readRefreshToken,
  refreshCookieOptions,
  SESSION_TTL_MS,
  setRefreshCookie,
} from "../utils/sessionTokens.js";
import dotenv from "dotenv";
dotenv.config();

export const registerUser = async (req, res) => {
  try {
    const { fullname, username, email, password, phone_number } = req.body;
    // Validate input

    // Check email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or Email already exists" });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
      phone_number,
      role: "landlord", // Default role
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const SignInUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "This email is not registered." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password!" });
    }
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);
    const refreshToken = newRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const accessToken = createAccessToken(user, expiresAt, createdAt.getTime());
    await RefreshSession.create({
      userId: user._id,
      currentTokenHash: tokenHash,
      tokenHashes: [tokenHash],
      createdAt,
      expiresAt,
    });
    await revokePresentedSession(req);
    res.set("Cache-Control", "no-store");
    setRefreshCookie(res, refreshToken, expiresAt);
    user.password = undefined;
    res.status(200).json({
      message: "User signed in successfully",
      user,
      accessToken,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

async function revokePresentedSession(req) {
  const token = readRefreshToken(req);
  if (!token) return;
  await RefreshSession.updateOne(
    { tokenHashes: hashRefreshToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

function rejectRefresh(res) {
  return res.status(401).json({
    code: "REFRESH_INVALID",
    message: "Your session has ended. Please sign in again.",
  });
}

export const refreshUserSession = async (req, res) => {
  try {
    const token = readRefreshToken(req);
    if (!token) return rejectRefresh(res);
    const tokenHash = hashRefreshToken(token);
    const session = await RefreshSession.findOne({ tokenHashes: tokenHash });
    const now = Date.now();
    if (
      !session ||
      session.revokedAt ||
      Math.floor(session.expiresAt.getTime() / 1000) <= Math.floor(now / 1000)
    ) {
      return rejectRefresh(res);
    }
    if (session.currentTokenHash !== tokenHash) {
      await revokePresentedSession(req);
      return rejectRefresh(res);
    }
    const user = await User.findById(session.userId).select("-password");
    if (!user) {
      await revokePresentedSession(req);
      return rejectRefresh(res);
    }
    const issuedAt = Date.now();
    if (Math.floor(session.expiresAt.getTime() / 1000) <= Math.floor(issuedAt / 1000)) {
      return rejectRefresh(res);
    }
    const nextToken = newRefreshToken();
    const nextHash = hashRefreshToken(nextToken);
    const accessToken = createAccessToken(user, session.expiresAt, issuedAt);
    const rotated = await RefreshSession.findOneAndUpdate(
      {
        _id: session._id,
        currentTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { currentTokenHash: nextHash }, $push: { tokenHashes: nextHash } },
      { new: true }
    );
    if (!rotated) {
      await revokePresentedSession(req);
      return rejectRefresh(res);
    }
    if (rotated.expiresAt.getTime() - Date.now() < 1000) return rejectRefresh(res);
    setRefreshCookie(res, nextToken, rotated.expiresAt);
    return res.status(200).json({ accessToken, user });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const logoutUserSession = async (req, res) => {
  try {
    await revokePresentedSession(req);
    res.clearCookie("refreshToken", refreshCookieOptions());
    return res.sendStatus(204);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};
