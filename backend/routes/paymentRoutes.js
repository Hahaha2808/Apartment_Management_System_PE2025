import express from "express";
import {
  createPayment,
  getPayments,
  deletePayment,
} from "../controllers/paymentController.js";

const paymentRoutes = express.Router();

paymentRoutes.get("/", getPayments);

paymentRoutes.post("/calculate/single", createPayment);

paymentRoutes.delete("/:id", deletePayment);

export default paymentRoutes;
