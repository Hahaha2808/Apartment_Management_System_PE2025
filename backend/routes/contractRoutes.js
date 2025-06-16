import express from "express";
import {authenticateToken, authorizeLandlord, authorizeAdmin} from "../middleware/authMiddleware.js"
import {
  createContract,
  getAllContracts,
  getContractById,
  getFilteredContracts // Make sure this is imported
} from "../controllers/contractController.js";

const contractRoutes = express.Router();

contractRoutes.post(
  "/add",
  authenticateToken,
  authorizeLandlord,
  createContract
);

contractRoutes.get("/", authenticateToken, authorizeLandlord, getAllContracts);

contractRoutes.get(
  "/filtered",
  authenticateToken,
  authorizeLandlord, 
  getFilteredContracts
);

contractRoutes.get(
"/:id",
authenticateToken,
authorizeLandlord,
getContractById
);




export default contractRoutes;