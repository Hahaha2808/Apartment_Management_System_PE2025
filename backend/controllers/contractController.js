import Room from "../models/Room.model.js";
import Service from "../models/Service.model.js";
import Contract from "../models/Contract.model.js";
import cron from "node-cron";

import mongoose from "mongoose";

export const createContract = async (req, res) => {
  try {
    const {
      roomId,
      tenantId,
      startDate,
      endDate,
      deposit,
      payPer,
      status,
      serviceIds,
    } = req.body;

    if (!roomId || !tenantId || !startDate || !endDate || !deposit) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });
    if (room.landlordID.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    const monthlyFee = room.price;

    const newContract = new Contract({
      roomId,
      tenantId,
      startDate,
      endDate,
      monthlyFee,
      deposit,
      payPer,
      status,
      serviceIds, // ✅ chỉ lưu ObjectId
    });

    await newContract.save();

    if (status === "active") {
      await Room.findByIdAndUpdate(roomId, { status: "rented" });
    }

    res.status(201).json({
      success: true,
      message: "Contract created successfully.",
      contract: newContract,
    });
  } catch (err) {
    console.error("❌ Error in createContract:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

export const getAllContracts = async (req, res) => {
  try {
    const landlordID = req.user.id;
    const rooms = await Room.find({ landlordID }).select("_id");
    const roomIds = rooms.map((r) => r._id);
    const contracts = await Contract.find({ roomId: { $in: roomIds } });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching contracts", error: err });
  }
};

export const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("roomId")
      .populate("tenantId")
      .populate("serviceIds"); // Lấy đầy đủ dịch vụ

    if (!contract || contract.roomId.landlordID.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json(contract); // ✅ Không thêm gì nữa
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving contract.", error: err.message });
  }
};

export const updateContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("roomId");
    if (!contract || contract.roomId.landlordID.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedContract = await Contract.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedContract) {
      return res.status(404).json({ message: "Contract not found." });
    }

    if (req.body.status === "terminated") {
      const today = new Date();
      updatedContract.endDate = today;
      await updatedContract.save();
    }

    if (req.body.status) {
      const stillActive = await Contract.findOne({
        roomId: updatedContract.roomId,
        status: "active",
        _id: { $ne: updatedContract._id },
      });

      const newStatus =
        req.body.status === "active" || stillActive ? "rented" : "available";

      await Room.findByIdAndUpdate(updatedContract.roomId, {
        status: newStatus,
      });
    }

    res.json({
      message: "Contract updated successfully.",
      contract: updatedContract,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating contract.", error: err.message });
  }
};

export const deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("roomId");
    if (!contract || contract.roomId.landlordID.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Contract.findByIdAndDelete(req.params.id);
    res.json({ message: "Contract deleted successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting contract.", error: err.message });
  }
};

export const getActiveContractByRoom = async (req, res) => {
  try {
    const landlordID = req.user.id;
    const room = await Room.findById(req.params.roomId);
    if (!room || room.landlordID.toString() !== landlordID) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const contract = await Contract.findOne({
      roomId: room._id,
      status: "active",
    }).populate("tenantId", "fullname");

    if (!contract) return res.json({ tenant: null });
    return res.json({ tenant: contract.tenantId });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

export const getExpiringContracts = async (req, res) => {
  try {
    const landlordID = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sixtyDaysLater = new Date(today);
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);
    sixtyDaysLater.setHours(23, 59, 59, 999);

    const rooms = await Room.find({ landlordID }).select(
      "_id roomNumber address"
    );
    const roomMap = new Map();
    rooms.forEach((r) => roomMap.set(r._id.toString(), r));
    const roomIds = rooms.map((r) => r._id);
    const contracts = await Contract.find({
      roomId: { $in: roomIds },
      status: "active",
      endDate: {
        $gte: today,
        $lte: sixtyDaysLater,
      },
    })
      .populate("tenantId")
      .populate("roomId");

    const result = contracts.map((c) => {
      const room = c.roomId;
      const tenant = c.tenantId;

      if (!room || typeof room !== "object") {
        console.warn("Missing or invalid room in contract:", c._id);
      }

      return {
        house: room?.address || "Room Not Found",
        room: room?.roomNumber || "N/A",
        tenantName: tenant?.fullname || "N/A",
        endDate: c.endDate,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching expiring contracts:", err);
    console.error("❌ STACK TRACE:", err.stack);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const landlordID = req.user.id;
    const { status, monthStart, monthEnd } = req.query;

    const rooms = await Room.find({ landlordID }).select("_id");
    const roomIds = rooms.map((r) => r._id);

    const query = { roomId: { $in: roomIds } };

    if (monthStart && monthEnd) {
      const from = new Date(`${monthStart}-01`);
      const to = new Date(`${monthEnd}-01`);
      to.setMonth(to.getMonth() + 1);
      to.setDate(0);
      to.setHours(23, 59, 59, 999);
      query.startDate = { $gte: from, $lte: to };
    }

    if (status) {
      if (status === "Renting") query.status = "active";
      else if (status === "Rented")
        query.status = { $in: ["terminated", "expired"] };
    }

    const contracts = await Contract.find(query)
      .populate("tenantId")
      .populate("roomId");

    const formatted = contracts.map((c) => {
      const expiryDays = Math.ceil(
        (new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return {
        fullname: c.tenantId?.fullname || "[missing]",
        idNumber: c.tenantId?.CIDNumber || "[missing]",
        dob: c.tenantId?.birthday,
        address: c.tenantId?.permanentAddress,
        phone: c.tenantId?.phone1,
        home: c.roomId?.address || "[missing]",
        room: c.roomId?.roomNumber || "[missing]",
        startDate: c.startDate,
        endDate: c.endDate,
        expiryDays,
        unitPrice: c.monthlyFee,
        deposit: c.deposit,
        status: c.status,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error in getAllCustomers:", err);
    res.status(500).json({ message: "Error fetching customers", error: err });
  }
};
