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
import paymentRoutes from "./routes/paymentRoutes.js";
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

app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/services", serviceRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/water-meters", waterRoutes);
app.use("/api/electric-meters", electricRoutes);
app.use("/api/payments", paymentRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  startContractExpirationJob(); //detect expired contracts
});
