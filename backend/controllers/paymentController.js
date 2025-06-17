import Room from "../models/Room.model.js";
import Contract from "../models/Contract.model.js";
import Payment from "../models/Payment.model.js";
import ElectricMeter from "../models/ElectricMeter.model.js";
import WaterMeter from "../models/WaterMeter.model.js";
import Service from "../models/Service.model.js";

export const createPayment = async (req, res) => {
  try {
    const { monthYear, roomId, invoiceDate } = req.body;

    const start = new Date(`${monthYear}-01T00:00:00.000Z`);
    const end = new Date(`${monthYear}-31T23:59:59.999Z`);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const contract = await Contract.findOne({
      roomId,
      startDate: { $lte: end },
      endDate: { $gte: start },
      status: "active",
    }).populate("tenantId");

    if (!contract)
      return res.status(404).json({
        message: "No active contract found for this room and month.",
      });

    const existing = await Payment.findOne({
      contract_id: contract._id,
      month: start,
    });

    if (existing) {
      return res.status(409).json({
        message: "Invoice already exists for this room and month.",
        existingPayment: existing,
      });
    }

    const landlordID = room.landlordID;
    const allServices = await Service.find({ landlordID, status: "active" });

    const electricService = allServices.find(
      (s) => s.type?.toLowerCase() === "electric"
    );
    const waterService = allServices.find(
      (s) => s.type?.toLowerCase() === "water"
    );
    const monthlyServices = allServices.filter(
      (s) => s.type?.toLowerCase() === "other"
    );

    const electric = await ElectricMeter.findOne({
      contract_id: contract._id,
      recordDate: { $gte: start, $lte: end },
    });

    const electricConsumed = electric?.consumed || 0;
    const electricPrice = electricService?.price || 0;
    const electricTotal = electricConsumed * electricPrice;

    const water = await WaterMeter.findOne({
      contract_id: contract._id,
      recordDate: { $gte: start, $lte: end },
    });

    const waterConsumed = water?.consumed || 0;
    const waterPrice = waterService?.price || 0;
    const waterTotal = waterConsumed * waterPrice;

    const rent = contract.monthlyFee || 0;

    const otherServices = monthlyServices.map((s) => ({
      service_name: s.name,
      unit_price: s.price,
    }));

    const serviceFee = otherServices.reduce((sum, s) => sum + s.unit_price, 0);
    const total = rent + electricTotal + waterTotal + serviceFee;

    const payment = await Payment.create({
      contract_id: contract._id,
      room_id: room._id,
      tenant_name: contract.tenantId.fullname,
      month: start,
      invoice_date: new Date(invoiceDate),
      rent_amount: rent,
      electric: {
        consumed: electricConsumed,
        unit_price: electricPrice,
        total: electricTotal,
      },
      water: {
        consumed: waterConsumed,
        unit_price: waterPrice,
        total: waterTotal,
      },
      other_services: otherServices,
      total_amount: total,
      amount_paid: 0,
      remaining: total,
      status: "unpaid",
    });

    return res.status(201).json(payment);
  } catch (err) {
    console.error("Error calculating payment:", err);
    return res
      .status(500)
      .json({ message: "Error calculating payment", error: err.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: "Failed to load payments" });
  }
};

// DELETE /api/payments/:id
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting payment", error: err.message });
  }
};
