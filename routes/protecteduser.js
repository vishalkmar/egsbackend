const router = require("express").Router();
const { Op } = require("sequelize");
const { requireUser } = require("../middleware/userAuth");
const {
  EVisa, Hrd, MeaEnquiry, PccLegalization, StickerVisa, Translation,
  AssistantAppointment, Insurance, MeetGreet,
  Document, StatusHistory, SUBMISSION_MODELS, User,
} = require("../models");

router.get("/user/me", requireUser, (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

router.get("/user/profile", requireUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
        phone: user.phone || "",
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error("/user/profile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/user/profile", requireUser, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Name must be 2-100 characters" });
    }
    if (phone.length < 10 || phone.length > 15) {
      return res.status(400).json({ success: false, message: "Phone must be 10-15 characters" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.update({ name, phone });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
        phone: user.phone || "",
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error("PATCH /user/profile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Aggregate dashboard for the logged-in user across ALL services.
// Used by the user dashboard "Your Statistics" + "Recent submissions" card.
router.get("/user/dashboard", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const services = [
      { type: "evisa", Model: EVisa, label: "E-Visa" },
      { type: "hrd", Model: Hrd, label: "HRD Attestation" },
      { type: "mea", Model: MeaEnquiry, label: "MEA Attestation" },
      { type: "pcc", Model: PccLegalization, label: "PCC Legalization" },
      { type: "sticker_visa", Model: StickerVisa, label: "Sticker Visa" },
      { type: "translation", Model: Translation, label: "Translation" },
      { type: "assistant_appointment", Model: AssistantAppointment, label: "Assistant & Appointment" },
      { type: "insurance", Model: Insurance, label: "Insurance" },
      { type: "meet_greet", Model: MeetGreet, label: "Meet & Greet" },
    ];

    const counts = {};
    const recents = [];
    const stats = {
      totalSubmissions: 0,
      pending: 0,
      processing: 0,
      approved: 0,
      rejected: 0,
      dispatched: 0,
      received: 0,
    };

    for (const svc of services) {
      const total = await svc.Model.count({ where: { userId } });
      const byStatus = {};
      const grouped = await svc.Model.findAll({
        where: { userId },
        attributes: ["status", [svc.Model.sequelize.fn("COUNT", svc.Model.sequelize.col("id")), "n"]],
        group: ["status"],
        raw: true,
      });
      grouped.forEach((g) => { byStatus[g.status] = Number(g.n); });
      counts[svc.type] = { label: svc.label, total, byStatus };
      stats.totalSubmissions += total;
      stats.pending += byStatus.Pending || 0;
      stats.processing += byStatus.Processing || 0;
      stats.approved += byStatus.Approved || 0;
      stats.rejected += byStatus.Rejected || 0;
      stats.dispatched += byStatus.Dispatched || 0;
      stats.received += byStatus.Received || 0;

      const latest = await svc.Model.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit,
      });
      latest.forEach((row) => {
        recents.push({
          id: row.id,
          type: svc.type,
          serviceType: svc.type,
          label: svc.label,
          status: row.status,
          payment: row.payment,
          email: row.email,
          country: row.country || null,
          visaType: row.visaType || null,
          docType: row.docType || null,
          createdAt: row.createdAt,
          submittedAt: row.submittedAt,
        });
      });
    }

    recents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      user: req.user,
      stats,
      counts,
      recents: recents.slice(0, limit),
    });
  } catch (err) {
    console.error("/user/dashboard error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// All my submissions across services (combined feed for user side)
router.get("/user/submissions", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const status = req.query.status ? String(req.query.status).split(",").filter(Boolean) : null;
    const serviceType = req.query.serviceType ? String(req.query.serviceType).trim() : null;
    const search = String(req.query.search || "").trim().toLowerCase();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const services = [
      { type: "evisa", Model: EVisa },
      { type: "hrd", Model: Hrd },
      { type: "mea", Model: MeaEnquiry },
      { type: "pcc", Model: PccLegalization },
      { type: "sticker_visa", Model: StickerVisa },
      { type: "translation", Model: Translation },
      { type: "assistant_appointment", Model: AssistantAppointment },
      { type: "insurance", Model: Insurance },
      { type: "meet_greet", Model: MeetGreet },
    ];

    const all = [];
    for (const svc of services) {
      if (serviceType && svc.type !== serviceType) continue;
      const where = { userId };
      if (status) where.status = { [Op.in]: status };
      const rows = await svc.Model.findAll({
        where, order: [["createdAt", "DESC"]],
      });
      rows.forEach((r) => all.push({ ...r.toJSON(), submissionType: svc.type, serviceType: svc.type }));
    }
    let filtered = all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (search) {
      filtered = filtered.filter((item) =>
        [
          item.email,
          item.name,
          item.contact,
          item.phone,
          item.country,
          item.visaType,
          item.docType,
          item.submissionCountry,
          item.destination,
          item.insuranceType,
          item.serviceType,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      );
    }

    const start = (page - 1) * limit;
    const submissions = filtered.slice(start, start + limit);
    return res.json({
      success: true,
      submissions,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      },
    });
  } catch (err) {
    console.error("/user/submissions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Status timeline for any submission (must belong to the requesting user)
router.get("/user/submissions/:type/:id/timeline", requireUser, async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = SUBMISSION_MODELS[type];
    if (!Model) return res.status(400).json({ success: false, message: "Invalid submission type" });

    const item = await Model.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    if (item.userId && item.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const history = await StatusHistory.findAll({
      where: { submissionId: id, submissionType: type },
      order: [["createdAt", "ASC"]],
    });

    const documents = await Document.findAll({
      where: { submissionId: id, submissionType: type },
      order: [["index", "ASC"]],
    });

    return res.json({
      success: true,
      submission: item,
      history,
      documents,
      currentStatus: item.status,
    });
  } catch (err) {
    console.error("/user/submissions/:type/:id/timeline error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
