// index.js (Revert to this state - remove direct test route, uncomment contractRoutes import and app.use)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db/db.js";
import roomRoutes from "./routes/roomRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contractRoutes from "./routes/contractRoutes.js"; // <--- UNCOMMENT THIS
import serviceRoutes from "./routes/serviceRoutes.js";
import waterRoutes from "./routes/waterMeterRoutes.js";
import electricRoutes from "./routes/electricMeterRoutes.js";

import { startContractExpirationJob } from "./cronJobs/contractExpirationJob.js";

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

// Keep your bypass-contract-test route here if you want it as a general test route, otherwise remove it too
app.get('/api/bypass-contract-test', (req, res) => {
  console.log('🎉🎉🎉 /api/bypass-contract-test route HIT SUCCESSFULLY! 🎉🎉🎉');
  console.log('Query parameters for bypass-test:', req.query);
  res.status(200).json({ message: 'Bypass test route executed successfully!' });
});

app.get('/api/contracts/test-filtered', (req, res) => {
    console.log("✅✅✅ Public /api/contracts/test-filtered route hit successfully! ✅✅✅");
    console.log("Query parameters:", req.query);
    res.status(200).json({ message: "This contract test endpoint is public!" });
});

// UNCOMMENT THIS app.use BLOCK for contractRoutes
app.use("/api/contracts", (req, res, next) => {
  console.log(`[DIAGNOSTIC] Request hit /api/contracts base path: ${req.method} ${req.originalUrl}`);
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