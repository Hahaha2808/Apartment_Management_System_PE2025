import express from "express";
import {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  getAllCustomers,
  getExpiringContracts,
} from "../controllers/contractController.js";
import {
  authenticateToken,
  authorizeLandlord,
} from "../middleware/authMiddleware.js";

const contractRoutes = express.Router();

contractRoutes.post(
  "/add",
  authenticateToken,
  authorizeLandlord,
  createContract
);
contractRoutes.get("/", authenticateToken, authorizeLandlord, getAllContracts);
contractRoutes.get(
  "/customers",
  authenticateToken,
  authorizeLandlord,
  getAllCustomers
);
contractRoutes.get(
  "/:id",
  authenticateToken,
  authorizeLandlord,
  getContractById
);
contractRoutes.get(
  "/expiring",
  authenticateToken,
  authorizeLandlord,
  getExpiringContracts
);
contractRoutes.put(
  "/:id",
  authenticateToken,
  authorizeLandlord,
  updateContract
);

export default contractRoutes;
