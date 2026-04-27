const router = require("express").Router();
const { Op } = require("sequelize");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  EVisa, Hrd, MeaEnquiry, PccLegalization, StickerVisa, Translation,
  AssistantAppointment, Insurance, MeetGreet,
  User, Document, StatusHistory, SUBMISSION_MODELS, sequelize,
} = require("../models");
const { updateSubmissionStatus } = require("../utils/submissionService");

const ADMIN_SERVICES = [
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

function normalizeSubmission(type, label, row) {
  const item = row.toJSON ? row.toJSON() : row;
  return {
    ...item,
    submissionType: type,
    serviceType: type,
    label,
  };
}

function parseCsv(value) {
  if (!value) return null;
  const list = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

function getSubmissionDate(item) {
  const raw = item.createdAt || item.submittedAt || item.updatedAt || null;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function matchesSearch(item, search) {
  if (!search) return true;
  const q = String(search).trim().toLowerCase();
  if (!q) return true;

  const values = [
    item.id,
    item.name,
    item.email,
    item.phone,
    item.mobile,
    item.contact,
    item.country,
    item.state,
    item.destination,
    item.submissionCountry,
    item.visaType,
    item.docType,
    item.selectedDocType,
    item.category,
    item.group,
    item.insuranceType,
    item.specialRequirements,
    item.label,
    item.serviceType,
    item.status,
    item.payment,
    item.createdAt,
    item.submittedAt,
    item.enquiryDate,
  ];

  return values
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function matchesDateFilters(item, { from, to, year }) {
  const date = getSubmissionDate(item);
  if (!date) return !from && !to && !year;

  if (year && date.getFullYear() !== Number(year)) return false;
  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime()) && date < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }
  }

  return true;
}

function filterSubmissions(items, { search, from, to, year, serviceType, statuses }) {
  return items.filter((item) => {
    if (serviceType && item.serviceType !== serviceType) return false;
    if (statuses?.length && !statuses.includes(item.status)) return false;
    if (!matchesSearch(item, search)) return false;
    if (!matchesDateFilters(item, { from, to, year })) return false;
    return true;
  });
}

router.get("/admin/me", requireAdmin, (req, res) => {
  return res.status(200).json({ success: true, admin: req.admin || req.user });
});

// Admin dashboard summary across all services
router.get("/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    const statuses = parseCsv(req.query.status);
    const serviceType = req.query.serviceType ? String(req.query.serviceType).trim() : "";
    const search = String(req.query.search || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const year = String(req.query.year || "").trim();
    const stats = {};
    let totalSubmissions = 0;
    let totalPending = 0;

    for (const svc of ADMIN_SERVICES) {
      const rows = await svc.Model.findAll({
        order: [["createdAt", "DESC"]],
      });
      const filteredRows = filterSubmissions(
        rows.map((row) => normalizeSubmission(svc.type, svc.label, row)),
        { search, from, to, year, serviceType, statuses }
      );

      const byStatus = {};
      filteredRows.forEach((row) => {
        byStatus[row.status] = (byStatus[row.status] || 0) + 1;
      });

      stats[svc.type] = { label: svc.label, total: filteredRows.length, byStatus };
      totalSubmissions += filteredRows.length;
      totalPending += byStatus.Pending || 0;
    }

    const totalUsers = await User.count();

    return res.json({
      success: true,
      totals: { totalSubmissions, totalPending, totalUsers },
      perService: stats,
    });
  } catch (err) {
    console.error("/admin/dashboard error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Combined feed across all services (admin overview)
router.get("/admin/submissions", requireAdmin, async (req, res) => {
  try {
    const statuses = parseCsv(req.query.status);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const search = String(req.query.search || "").trim().toLowerCase();
    const serviceType = req.query.serviceType ? String(req.query.serviceType).trim() : "";
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const year = String(req.query.year || "").trim();
    const all = [];
    for (const svc of ADMIN_SERVICES) {
      if (serviceType && svc.type !== serviceType) continue;
      const rows = await svc.Model.findAll({
        order: [["createdAt", "DESC"]],
      });
      rows.forEach((row) => all.push(normalizeSubmission(svc.type, svc.label, row)));
    }

    const filtered = filterSubmissions(all, { search, from, to, year, serviceType, statuses }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({ success: true, items: filtered.slice(0, limit), count: filtered.length });
  } catch (err) {
    console.error("/admin/submissions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin updates status for any submission and creates a history record
router.patch("/admin/submissions/:type/:id/status", requireAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status, note } = req.body || {};
    const Model = SUBMISSION_MODELS[type];
    if (!Model) return res.status(400).json({ success: false, message: "Invalid submission type" });

    try {
      const updated = await updateSubmissionStatus({
        Model, submissionType: type, id, newStatus: status, note,
        actor: { role: "admin", email: req.admin?.email },
      });
      if (!updated) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, item: updated });
    } catch (e) {
      if (e.code === "INVALID_STATUS") return res.status(400).json({ success: false, message: e.message });
      throw e;
    }
  } catch (err) {
    console.error("admin update status error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/admin/submissions/:type/:id/timeline", requireAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = SUBMISSION_MODELS[type];
    if (!Model) return res.status(400).json({ success: false, message: "Invalid submission type" });

    const item = await Model.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const history = await StatusHistory.findAll({
      where: { submissionId: id, submissionType: type },
      order: [["createdAt", "ASC"]],
    });
    const documents = await Document.findAll({
      where: { submissionId: id, submissionType: type },
      order: [["index", "ASC"]],
    });

    return res.json({ success: true, submission: item, history, documents });
  } catch (err) {
    console.error("admin timeline error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim().toLowerCase();

    const where = {};
    if (search) {
      where[Op.or] = [
        sequelize.where(sequelize.fn("LOWER", sequelize.col("email")), { [Op.like]: `%${search}%` }),
        sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), { [Op.like]: `%${search}%` }),
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where, order: [["createdAt", "DESC"]], limit, offset,
    });
    return res.json({
      success: true,
      items: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("/admin/users error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
