const { Op } = require("sequelize");
const { Courier } = require("../../models");

const listCouriers = async (req, res) => {
  try {
    const q = req.query || {};
    const where = {};
    if (q.search) {
      const term = `%${String(q.search).toLowerCase()}%`;
      where[Op.or] = [
        { courierNumber: { [Op.like]: term } },
        { personName: { [Op.like]: term } },
        { personEmail: { [Op.like]: term } },
        { personPhone: { [Op.like]: term } },
        { serviceName: { [Op.like]: term } },
      ];
    }
    const rows = await Courier.findAll({ where, order: [["createdAt", "DESC"]] });
    const items = rows.map((r) => {
      const plain = r.toJSON();
      plain.amountDisplay = `Rs ${Number(plain.amount).toFixed(2)}`;
      return plain;
    });
    return res.json({ success: true, items });
  } catch (err) {
    console.error("List couriers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const createCourier = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.courierNumber) {
      return res.status(400).json({ success: false, message: "Courier number is required" });
    }
    const courier = await Courier.create({
      courierNumber: String(data.courierNumber).trim(),
      serviceName: data.serviceName || "",
      personName: data.personName || "",
      personEmail: data.personEmail || "",
      personPhone: data.personPhone || "",
      officeAddress: data.officeAddress || "",
      amount: Number(data.amount || 0),
      paymentStatus: data.paymentStatus || "Pending",
      status: data.status || "Pending",
      notes: data.notes || "",
    });
    const plain = courier.toJSON();
    plain.amountDisplay = `Rs ${Number(plain.amount).toFixed(2)}`;
    return res.status(201).json({ success: true, item: plain });
  } catch (err) {
    console.error("Create courier error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateCourier = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    const courier = await Courier.findByPk(id);
    if (!courier) return res.status(404).json({ success: false, message: "Not found" });

    const ALLOWED = ["courierNumber", "serviceName", "personName", "personEmail", "personPhone", "officeAddress", "amount", "paymentStatus", "status", "notes"];
    const safe = {};
    for (const k of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(data, k)) safe[k] = data[k];
    }

    if (data.note) {
      const existing = Array.isArray(courier.trackingNotes) ? [...courier.trackingNotes] : [];
      existing.push({ text: String(data.note).trim(), at: new Date().toISOString() });
      safe.trackingNotes = existing;
    }

    await courier.update(safe);
    const plain = courier.toJSON();
    plain.amountDisplay = `Rs ${Number(plain.amount).toFixed(2)}`;
    return res.json({ success: true, item: plain });
  } catch (err) {
    console.error("Update courier error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteCourier = async (req, res) => {
  try {
    const { id } = req.params;
    const courier = await Courier.findByPk(id);
    if (!courier) return res.status(404).json({ success: false, message: "Not found" });
    await courier.destroy();
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete courier error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const trackCourier = async (req, res) => {
  try {
    const { number } = req.query;
    if (!number) return res.status(400).json({ success: false, message: "Courier number is required" });
    const courier = await Courier.findOne({ where: { courierNumber: String(number).trim() } });
    if (!courier) return res.status(404).json({ success: false, message: "Courier not found" });
    const plain = courier.toJSON();
    plain.amountDisplay = `Rs ${Number(plain.amount).toFixed(2)}`;
    return res.json({ success: true, item: plain });
  } catch (err) {
    console.error("Track courier error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { listCouriers, createCourier, updateCourier, deleteCourier, trackCourier };
