import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },

    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    tenant_name: {
      type: String,
      required: true,
    },

    // Khoảng thời gian của tháng tính tiền (VD: tháng 6/2025 là từ 01/06 đến 30/06)
    month: {
      type: Date, // ngày đầu tháng
      required: true,
    },

    invoice_date: {
      type: Date,
      required: true,
    },

    paid_at: {
      type: Date,
      default: null,
    },

    rent_amount: {
      type: Number,
      required: true,
    },

    electric: {
      consumed: { type: Number, default: 0 },
      unit_price: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    water: {
      consumed: { type: Number, default: 0 },
      unit_price: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    other_services: [
      {
        service_name: String,
        unit_price: Number,
      },
    ],

    total_amount: {
      type: Number,
      required: true,
    },

    amount_paid: {
      type: Number,
      default: 0,
    },

    remaining: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
