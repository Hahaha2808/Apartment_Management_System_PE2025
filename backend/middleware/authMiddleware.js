import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET_CODE = process.env.SECRET_KEY;

export const authenticateToken = (req, res, next) => {
  // console.log("SECRET_CODE:", SECRET_CODE);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_CODE);
    // console.log("✅ Decoded token:", decoded);
    req.user = decoded; // Gắn user info vào request
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const authorizeLandlord = (req, res, next) => {
  // console.log("👤 Role in request:", req.user?.role);

  if (!req.user || req.user.role !== "landlord") {
    return res.status(403).json({ message: "Landlord access required" });
  }
  next();
};
