import Tenant from "../models/Tenant.model.js";
import Contract from "../models/Contract.model.js";
import Room from "../models/Room.model.js";

// Create tenant
export const createTenant = async (req, res) => {
  const {
    fullname,
    birthday,
    CIDNumber,
    sex,
    phone1,
    phone2,
    email,
    birthPlace,
    CIDIssuedDate,
    CIDIssuedPlace,
    province,
    vehicleNumber,
    permanentAddress,
    note,
  } = req.body;

  if (!fullname || !birthday || !CIDNumber || !sex || !phone1 || !email) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  try {
    const tenant = new Tenant({
      fullname,
      birthday,
      CIDNumber,
      sex,
      phone1,
      phone2,
      email,
      birthPlace,
      CIDIssuedDate,
      CIDIssuedPlace,
      province,
      vehicleNumber,
      permanentAddress,
      note,
    });

    const savedTenant = await tenant.save();
    res.status(201).json({ success: true, tenant: savedTenant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get all tenants (belonging to landlord)
export const getAllTenants = async (req, res) => {
  try {
    const landlordID = req.user.id;
    const rooms = await Room.find({ landlordID });
    const roomIds = rooms.map((r) => r._id);

    const contracts = await Contract.find({ roomId: { $in: roomIds } });
    const contractIds = contracts.map((c) => c._id);

    const tenants = await Tenant.find({ contractId: { $in: contractIds } })
      .sort({ createdAt: -1 })
      .populate("contractId");

    res.status(200).json(tenants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get tenant by ID
export const getTenantById = async (req, res) => {
  try {
    const landlordID = req.user.id;

    const tenant = await Tenant.findById(req.params.id).populate({
      path: "contractId",
      populate: { path: "roomId" },
    });

    if (
      !tenant ||
      !tenant.contractId ||
      !tenant.contractId.roomId ||
      tenant.contractId.roomId.landlordID.toString() !== landlordID
    ) {
      return res
        .status(404)
        .json({ message: "Tenant not found or unauthorized" });
    }

    res.status(200).json(tenant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update tenant
export const updateTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;

    const contract = await Contract.findOne({ tenantId }).populate("roomId");
    if (!contract || !contract.roomId) {
      return res.status(404).json({ message: "Contract or room not found" });
    }

    if (contract.roomId.landlordID.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to update tenant" });
    }
    const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedTenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete tenant
export const deleteTenant = async (req, res) => {
  try {
    const landlordID = req.user.id;

    const tenant = await Tenant.findById(req.params.id).populate({
      path: "contractId",
      populate: { path: "roomId" },
    });

    if (
      !tenant ||
      !tenant.contractId ||
      !tenant.contractId.roomId ||
      tenant.contractId.roomId.landlordID.toString() !== landlordID
    ) {
      return res
        .status(404)
        .json({ message: "Tenant not found or unauthorized" });
    }

    await Tenant.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Tenant deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
