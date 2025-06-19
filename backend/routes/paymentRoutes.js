import express from "express";
import {
  createPayment,
  getPayments,
  deletePayment,
  getPaymentById,
} from "../controllers/paymentController.js";
import {
  authenticateToken,
  authorizeLandlord,
} from "../middleware/authMiddleware.js";
const paymentRoutes = express.Router();

paymentRoutes.get("/", authenticateToken, authorizeLandlord, getPayments);
paymentRoutes.get("/:id", authenticateToken, authorizeLandlord, getPaymentById);

paymentRoutes.post(
  "/calculate/single",
  authenticateToken,
  authorizeLandlord,
  createPayment
);

paymentRoutes.delete(
  "/:id",
  authenticateToken,
  authorizeLandlord,
  deletePayment
);

export default paymentRoutes;
