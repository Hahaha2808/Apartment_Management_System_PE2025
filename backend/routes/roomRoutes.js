import express from "express";
import {
  authenticateToken,
  authorizeLandlord,
} from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import {
  addRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  updateRoomStatus,
  getRoomStatusSummary,
  getAvailableRoomsInRange,
} from "../controllers/roomController.js";

const roomRoutes = express.Router();

roomRoutes.get("/", authenticateToken, authorizeLandlord, getAllRooms);
roomRoutes.post(
  "/",
  authenticateToken,
  authorizeLandlord,
  upload.single("image"),
  addRoom
);

roomRoutes.get(
  "/status-summary",
  (req, res, next) => {
    console.log("✅ [Router] /status-summary hit");
    next();
  },
  authenticateToken,
  authorizeLandlord,
  getRoomStatusSummary
);
roomRoutes.get(
  "/available",
  authenticateToken,
  authorizeLandlord,
  getAvailableRoomsInRange
);
roomRoutes.get("/:id", authenticateToken, authorizeLandlord, getRoomById);
roomRoutes.put(
  "/:id",
  authenticateToken,
  authorizeLandlord,
  upload.single("image"),
  updateRoom
);
roomRoutes.patch(
  "/:id/status",
  authenticateToken,
  authorizeLandlord,
  updateRoomStatus
);

export default roomRoutes;
