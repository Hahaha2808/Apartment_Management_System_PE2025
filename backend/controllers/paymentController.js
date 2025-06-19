import Room from "../models/Room.model.js";
import Contract from "../models/Contract.model.js";
import Payment from "../models/Payment.model.js";
import ElectricMeter from "../models/ElectricMeter.model.js";
import WaterMeter from "../models/WaterMeter.model.js";
import Service from "../models/Service.model.js";

export const createPayment = async (req, res) => {
  try {
    const { monthYear, roomId, invoiceDate } = req.body;

    const now = new Date();
    const invoiceMonthDate = new Date(invoiceDate);
    if (
      invoiceMonthDate.getFullYear() > now.getFullYear() ||
      (invoiceMonthDate.getFullYear() === now.getFullYear() &&
        invoiceMonthDate.getMonth() > now.getMonth())
    ) {
      return res
        .status(400)
        .json({ message: "You cannot create a payment for a future month." });
    }

    const start = new Date(`${monthYear}-01T00:00:00.000Z`);
    const end = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const room = await Room.findOne({ _id: roomId, landlordID: req.user.id });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const contract = await Contract.findOne({
      roomId,
      startDate: { $lte: end },
      endDate: { $gte: start },
      status: "active",
    }).populate("tenantId");

    if (!contract)
      return res
        .status(404)
        .json({ message: "No active contract found for this room and month." });

    const existing = await Payment.findOne({
      contract_id: contract._id,
      month: {
        $gte: new Date(start.getFullYear(), start.getMonth(), 1),
        $lt: new Date(start.getFullYear(), start.getMonth() + 1, 1),
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "Invoice already exists for this room and month.",
        existingPayment: existing,
      });
    }

    const allServices = await Service.find({
      _id: { $in: contract.serviceIds },
      status: "active",
      landlordID: req.user.id,
    });

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
      landlordID: req.user.id,
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
    const { startDate, endDate } = req.query;
    const landlordId = req.user.id;

    const rooms = await Room.find({ landlordID: landlordId });
    const roomIdSet = new Set(rooms.map((r) => r._id.toString()));
    const contracts = await Contract.find({
      roomId: { $in: Array.from(roomIdSet) },
    });
    const contractIdSet = new Set(contracts.map((c) => c._id.toString()));

    const query = { contract_id: { $in: Array.from(contractIdSet) } };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const sameMonth =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth();

      query.month = sameMonth
        ? {
            $gte: new Date(start.getFullYear(), start.getMonth(), 1),
            $lt: new Date(start.getFullYear(), start.getMonth() + 1, 1),
          }
        : {
            $gte: new Date(start.getFullYear(), start.getMonth(), 1),
            $lt: new Date(end.getFullYear(), end.getMonth() + 1, 1),
          };
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error("Error in getPayments:", err);
    res.status(500).json({ message: "Failed to load payments" });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const contract = await Contract.findById(payment.contract_id);
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });

    const room = await Room.findById(contract.roomId);
    if (!room || room.landlordID.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const enrichedPayment = {
      ...payment.toObject(),
      roomNumber: room.roomNumber,
      address: room.address,
      contractStart: contract.startDate,
      contractEnd: contract.endDate,
    };

    res.json(enrichedPayment);
  } catch (err) {
    console.error("Error in getPaymentById:", err);
    res
      .status(500)
      .json({ message: "Error fetching payment", error: err.message });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const landlordId = req.user.id;

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const contract = await Contract.findById(payment.contract_id);
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });

    const room = await Room.findById(contract.roomId);
    if (!room || room.landlordID.toString() !== landlordId)
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this payment" });

    await Payment.findByIdAndDelete(id);
    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    console.error("Error deleting payment:", err);
    res
      .status(500)
      .json({ message: "Error deleting payment", error: err.message });
  }
};
