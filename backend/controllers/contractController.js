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
    const services = await Service.find({ landlordID });
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
    const contracts = await Contract.find()
      .populate("roomId", "roomNumber price")
      .populate("tenantId", "fullname birthday CIDNumber sex phone1 email permanentAddress");
    //.populate("serviceIds", "name");

    res.status(200).json(contracts);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch contracts.", error: err.message });
  }
};

// Get contract by ID
export const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("roomId", "roomNumber price" )
      .populate("tenantId", "fullname birthday CIDNumber sex phone1 email permanentAddress");
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

// Filter contracts by date AND status 
export const getFilteredContracts = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const conditions = []; 

    console.log("Backend received query parameters:", req.query);

    // 1. Apply date range filter if both startDate and endDate are provided
    if (startDate && endDate) {
      const parsedStartDate = new Date(`${startDate}T00:00:00.000Z`);
      const parsedEndDate = new Date(`${endDate}T23:59:59.999Z`);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          console.error("Invalid date format provided for filtering:", startDate, endDate);
          return res.status(400).json({ message: "Invalid date format provided for filtering." });
      }
      conditions.push({ startDate: { $gte: parsedStartDate } });
      conditions.push({ endDate: { $lte: parsedEndDate } });
    }

    // 2. Apply status filter based on real-time end date
    if (status) {
      const now = new Date(); // Current real-time date
      if (status === "Renting") {
        // Contract end date is in the future (or today)
        conditions.push({ endDate: { $gte: now } });
      } else if (status === "Rented") {
        // Contract end date is in the past
        conditions.push({ endDate: { $lt: now } });
      }
    }

    // Combine all conditions with a logical $and
    let query = {};
    if (conditions.length > 0) {
      query = { $and: conditions };
    }
    // If no filters are provided, query remains an empty object, fetching all contracts.

    console.log("Backend Filter Query (MongoDB):", JSON.stringify(query, null, 2));

    const contracts = await Contract.find(query)
      .populate({
        path: 'tenantId',
        select: 'fullname birthday CIDNumber sex phone1 email permanentAddress'
      })
      .populate({
        path: 'roomId',
        select: 'roomNumber price'
      });

    console.log(`Backend Filter Results: Found ${contracts.length} contracts.`);
    // console.log("Detailed Contract Results:", JSON.stringify(contracts, null, 2));

    res.status(200).json(contracts);
  } catch (err) {
    console.error("Error fetching filtered contracts:", err);
    res.status(500).json({ message: "Server error fetching filtered contracts.", error: err.message });
  }
};