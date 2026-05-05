const { Op } = require("sequelize");
const { DummyTicket } = require("../../models");

const createDummyTicket = async (req, res) => {
  try {
    const data = req.body || {};
    const paxes = Array.isArray(data.paxes) ? data.paxes : [];

    if (!data.email || !data.mobile || !paxes.length) {
      return res.status(400).json({ success: false, message: "Email, mobile and at least one pax are required" });
    }

    const firstPax = paxes[0] || {};

    const submission = await DummyTicket.create({
      userId: req.user?.id || null,
      name: data.name || "",
      email: data.email,
      mobile: data.mobile,
      destination: firstPax.startLocation || "",
      departureDate: firstPax.departureDate || "",
      returnDate: firstPax.returnDate || "",
      tripType: firstPax.tripType === "roundTrip" ? "roundTrip" : "oneWay",
      paxes,
      paxCount: paxes.length,
      amountPerPax: Number(data.amountPerPax || 0),
      totalAmount: Number(data.totalAmount || 0),
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      tracking: data.tracking || {},
    });

    return res.json({ success: true, item: submission, message: "Dummy ticket submitted" });
  } catch (err) {
    console.error("Create dummy ticket error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllDummyTickets = async (req, res) => {
  try {
    const q = req.query || {};
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (q.status) where.status = q.status;
    if (q.payment) where.payment = q.payment;
    if (q.search) {
      const term = `%${String(q.search).toLowerCase()}%`;
      where[Op.or] = [
        { email: { [Op.like]: term } },
        { name: { [Op.like]: term } },
        { mobile: { [Op.like]: term } },
        { destination: { [Op.like]: term } },
      ];
    }

    const { rows, count } = await DummyTicket.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      items: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("Get dummy tickets error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateDummyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const item = await DummyTicket.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const ALLOWED = ["status", "payment", "name", "email", "mobile", "destination", "departureDate", "returnDate", "tripType"];
    const safe = {};
    for (const k of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(updates, k)) safe[k] = updates[k];
    }

    await item.update(safe);
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Update dummy ticket error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteDummyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await DummyTicket.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    await item.destroy();
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete dummy ticket error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { createDummyTicket, getAllDummyTickets, updateDummyTicket, deleteDummyTicket };
