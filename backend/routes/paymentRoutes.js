import express from "express";
import { calculatePayments } from "../controllers/paymentController.js";

const paymentRoutes = express.Router();

paymentRoutes.post("/calculate", calculatePayments);

export default paymentRoutes;
