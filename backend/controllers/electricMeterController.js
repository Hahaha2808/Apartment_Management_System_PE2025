import ElectricMeter from "../models/ElectricMeter.model.js";
import Contract from "../models/Contract.model.js";
import Room from "../models/Room.model.js";
import Tenant from "../models/Tenant.model.js";

export const getRoomElectric = async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const contracts = await Contract.find({
      startDate: { $lte: endOfMonth },
      endDate: { $gte: today },
      status: "active",
    })
      .populate("roomId", "roomNumber landlordID")
      .populate("tenantId", "fullname");

    const result = await Promise.all(
      contracts
        .filter(
          (contract) =>
            contract.roomId &&
            contract.roomId.landlordID?.toString() === req.user.id
        )
        .map(async (contract) => {
          const previousRecord = await ElectricMeter.findOne({
            contract_id: contract._id,
            recordDate: { $lt: startOfCurrentMonth },
          }).sort({ recordDate: -1 });

          const currentRecord = await ElectricMeter.findOne({
            contract_id: contract._id,
            recordDate: {
              $gte: startOfCurrentMonth,
              $lte: endOfMonth,
            },
          });

          return {
            contract_id: contract._id.toString(),
            room: contract.roomId,
            tenant: contract.tenantId,
            lastElectricIndex: previousRecord?.currentIndex || 0,
            currentIndex: currentRecord?.currentIndex ?? null,
            consumed: currentRecord?.consumed ?? null,
          };
        })
    );

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo hoặc cập nhật chỉ số điện
export const createElectricMeter = async (req, res) => {
  try {
    const { contract_id, currentIndex, recordDate } = req.body;

    const date = new Date(recordDate || Date.now());
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const existing = await ElectricMeter.findOne({
      contract_id,
      recordDate: { $gte: monthStart, $lte: monthEnd },
    });

    if (existing) {
      existing.currentIndex = currentIndex;
      existing.consumed = currentIndex - existing.previousIndex;
      existing.recordDate = date;
      await existing.save();
      return res.status(200).json({
        success: true,
        updated: true,
        message: "Updated existing electric record.",
        record: existing,
      });
    }

    const last = await ElectricMeter.findOne({
      contract_id,
      recordDate: { $lt: monthStart },
    }).sort({ recordDate: -1 });

    const previousIndex = last?.currentIndex || 0;

    const newRecord = new ElectricMeter({
      contract_id,
      previousIndex,
      currentIndex,
      consumed: currentIndex - previousIndex,
      recordDate: date,
    });

    await newRecord.save();
    return res.status(201).json({
      success: true,
      created: true,
      message: "Created new electric record.",
      record: newRecord,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Lấy lịch sử chỉ số điện theo tháng
export const getElectricMeterHistory = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const records = await ElectricMeter.find({
      recordDate: { $gte: start, $lte: end },
    }).populate({
      path: "contract_id",
      populate: [
        { path: "roomId", select: "roomNumber" },
        { path: "tenantId", select: "fullname" },
      ],
    });

    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
