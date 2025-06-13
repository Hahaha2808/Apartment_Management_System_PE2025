export const calculatePayments = async (req, res) => {
  try {
    const { monthYear, roomIds } = req.body;
    const start = new Date(`${monthYear}-01T00:00:00.000Z`);
    const end = new Date(`${monthYear}-31T23:59:59.999Z`);

    const contracts = await Contract.find({
      roomId: { $in: roomIds },
      startDate: { $lte: end },
      endDate: { $gte: start },
      status: "active",
    }).populate("roomId tenantId serviceIds");

    const result = [];

    for (const contract of contracts) {
      const contractId = contract._id;
      const serviceList = contract.serviceIds || [];

      // Tách các loại dịch vụ
      const electricService = serviceList.find(
        (s) => s.type === "electric" && s.status === "active"
      );
      const waterService = serviceList.find(
        (s) => s.type === "water" && s.status === "active"
      );
      const monthlyServices = serviceList.filter(
        (s) => s.type === "monthly" && s.status === "active"
      );

      // Lấy chỉ số điện
      const electric = await ElectricMeter.findOne({
        contract_id: contractId,
        recordDate: { $gte: start, $lte: end },
      });
      const electricConsumed = electric?.consumed || 0;
      const electricFee = electricService
        ? electricConsumed * electricService.price
        : 0;

      // Lấy chỉ số nước
      const water = await WaterMeter.findOne({
        contract_id: contractId,
        recordDate: { $gte: start, $lte: end },
      });
      const waterConsumed = water?.consumed || 0;
      const waterFee = waterService ? waterConsumed * waterService.price : 0;

      // Dịch vụ khác theo tháng
      const serviceFee = monthlyServices.reduce((sum, s) => sum + s.price, 0);

      const rent = contract.monthlyFee || 0;
      const total = rent + electricFee + waterFee + serviceFee;

      // Kiểm tra đã có payment chưa
      let payment = await Payment.findOne({
        contract_id: contractId,
        month: start,
      });

      if (!payment) {
        payment = await Payment.create({
          contract_id: contractId,
          month: start,
          total_amount: total,
          status: "unpaid",
        });
      } else {
        payment.total_amount = total;
        await payment.save();
      }

      result.push({
        room: contract.roomId.name || "N/A",
        tenant: contract.tenantId.fullname || "N/A",
        total_amount: total,
        paid: payment.status === "paid" ? total : 0,
        remaining: payment.status === "paid" ? 0 : total,
        breakdown: {
          rent,
          electricFee,
          electricConsumed,
          waterFee,
          waterConsumed,
          serviceFee,
        },
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Error calculating payments:", err);
    res.status(500).json({ message: "Lỗi khi tính tiền", error: err.message });
  }
};
