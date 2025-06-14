import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db/db.js";
import roomRoutes from "./routes/roomRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import waterRoutes from "./routes/waterMeterRoutes.js";
import electricRoutes from "./routes/electricMeterRoutes.js";

import { startContractExpirationJob } from "./cronJobs/contractExpirationJob.js";
import { getFilteredContracts } from "./controllers/contractController.js";

dotenv.config();
connectDB();

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// API contracts/fittered above API contracts  
app.get("/api/contracts/filtered", (req, res, next) => {
  console.log(`[DIAGNOSTIC] Request hit /api/contracts/filtered directly: ${req.method} ${req.originalUrl}`);
  console.log("Frontend query parameters received by backend (raw):", req.query);
  next(); 
}, getFilteredContracts);

app.use("/api/contracts", (req, res, next) => {
  console.log(`[DIAGNOSTIC] Request hit /api/contracts base path (for non-filtered): ${req.method} ${req.originalUrl}`);
  next(); 
}, contractRoutes);


app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/water-meters", waterRoutes);
app.use("/api/electric-meters", electricRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack); 
  res.status(500).send('Something broke!'); 
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  startContractExpirationJob();
});