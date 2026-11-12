import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const authenticateToken = (req, res, next) => {
  const secret = process.env.SECRET_KEY;
  if (typeof secret !== "string" || !secret.trim()) {
    return res.status(500).json({ message: "Server error" });
  }

  const header = req.headers.authorization;
  const parts = typeof header === "string" ? header.trim().split(/\s+/) : [];
  const reject = (code, message) =>
    res.set("WWW-Authenticate", "Bearer").status(401).json({ code, message });

  if (parts[0]?.toLowerCase() !== "bearer" || !parts[1]) {
    return reject("AUTH_REQUIRED", "Authentication required.");
  }
  if (parts.length !== 2) {
    return reject("TOKEN_INVALID", "Invalid access token.");
  }

  let decoded;
  try {
    decoded = jwt.verify(parts[1], secret);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reject("TOKEN_EXPIRED", "Your access token has expired.");
    }
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.NotBeforeError
    ) {
      return reject("TOKEN_INVALID", "Invalid access token.");
    }
    return res.status(500).json({ message: "Server error" });
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.id !== "string" ||
    !decoded.id ||
    typeof decoded.role !== "string"
  ) {
    return reject("TOKEN_INVALID", "Invalid access token.");
  }
  req.user = decoded;
  next();
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const authorizeLandlord = (req, res, next) => {
  if (!req.user || req.user.role !== "landlord") {
    return res.status(403).json({ message: "Landlord access required" });
  }
  next();
};
