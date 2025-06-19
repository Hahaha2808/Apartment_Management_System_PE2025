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

    month: {
      type: Date,
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
paymentSchema.index({ contract_id: 1, month: 1 }, { unique: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
