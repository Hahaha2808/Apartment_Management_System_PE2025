import mongoose from "mongoose";

const contractSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    monthlyFee: Number,
    deposit: { type: Number, required: true },
    payPer: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "terminated", "expired"],
      default: "active",
    },
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  },
  { timestamps: true }
);

const Contract = mongoose.model("Contract", contractSchema);
export default Contract;
