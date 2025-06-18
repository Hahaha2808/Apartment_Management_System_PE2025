import Room from "../models/Room.model.js";
import Service from "../models/Service.model.js";
import Contract from "../models/Contract.model.js";
import cron from "node-cron";
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
      //serviceIds,
    } = req.body;

    if (!roomId || !tenantId || !startDate || !endDate || !deposit) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    //get Landlord from room
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });

    const monthlyFee = room.price;

    const landlordID = room.landlordID;
    //get service of this landlord
    const services = await Service.find({ landlordID, status: "active" });
    const serviceIds = services.map((s) => s._id);

    //create contract
    const newContract = new Contract({
      roomId,
      tenantId,
      startDate,
      endDate,
      monthlyFee,
      deposit,
      payPer,
      status,
      serviceIds, // Auto-injected
    });
    await newContract.save();
    if (status === "active") {
      await Room.findByIdAndUpdate(roomId, { status: "rented" });
    }

    res.status(201).json({
      success: true,
      message: "Contract created successfully with landlord's services.",
      contract: newContract,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Get all contracts
export const getAllContracts = async (req, res) => {
  try {
    const landlordID = req.user.id; // ✅ lấy từ token (middleware đã giải mã sẵn)

    const rooms = await Room.find({ landlordID }).select("_id");

    const roomIds = rooms.map((r) => r._id);

    const contracts = await Contract.find({
      roomId: { $in: roomIds },
    });

    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching contracts", error: err });
  }
};

// Get contract by ID
export const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("roomId")
      .populate("tenantId");
    //.populate("serviceIds", "name");

    if (!contract)
      return res.status(404).json({ message: "Contract not found." });

    res.status(200).json(contract);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving contract.", error: err.message });
  }
};

// Update contract
export const updateContract = async (req, res) => {
  try {
    const updatedContract = await Contract.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedContract) {
      return res.status(404).json({ message: "Contract not found." });
    }
    //if change status of contract, change status of room
    if (req.body.status) {
      const stillActive = await Contract.findOne({
        roomId: updatedContract.roomId,
        status: "active",
        _id: { $ne: updatedContract._id }, // tránh chính nó
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

// Delete contract
export const deleteContract = async (req, res) => {
  try {
    const deleted = await Contract.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Contract not found." });
    }

    res.json({ message: "Contract deleted successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting contract.", error: err.message });
  }
};

export const getActiveContractByRoom = async (req, res) => {
  const { roomId } = req.params;
  const contract = await Contract.findOne({
    roomId,
    status: "active",
  }).populate("tenantId", "fullname");
  if (!contract) return res.json({ tenant: null });
  return res.json({ tenant: contract.tenantId });
};
