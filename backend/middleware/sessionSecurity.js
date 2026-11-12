export function getAppOrigin() {
  const value = process.env.APP_ORIGIN || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new Error("APP_ORIGIN must be an explicit frontend origin");
  }
  if (
    origin.origin !== value ||
    !["http:", "https:"].includes(origin.protocol) ||
    (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
  ) {
    throw new Error("APP_ORIGIN must be an explicit frontend origin (HTTPS in production)");
  }
  return origin.origin;
}

export function requireSessionOrigin(req, res, next) {
  let origin;
  try {
    origin = getAppOrigin();
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
  if (req.get("Origin") !== origin || req.get("X-CSRF-Protection") !== "1") {
    return res.status(403).json({ message: "Session request origin or CSRF header is invalid." });
  }
  res.set("Cache-Control", "no-store");
  next();
}
