const StickerVisa = require("../../models/stickerVisaModels/StickerVisaModel.js");
const { buildAdminEmail, buildUserEmail } = require("../../utils/stickerVisaEmailService.js");

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

const validatePayload = (body) => {
  const errors = [];

  if (!isValidEmail(body.email)) errors.push("Invalid email");
  if (!String(body.contact || "").trim()) errors.push("Contact is required");
  if (!String(body.visaType || "").trim()) errors.push("visaType is required");

  const n = Number(body.noOfDays);
  if (!n || n < 1) errors.push("noOfDays must be >= 1");

  if (!body.enquiryDate) errors.push("enquiryDate is required");

  const submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) errors.push("submittedAt must be valid ISO date");

  const docs = Array.isArray(body.documents) ? body.documents : [];
  if (docs.length !== Number(body.noOfDocuments || docs.length)) errors.push("documents count must match noOfDocuments");

  for (const d of docs) {
    if (!d?.url) errors.push("Each document must have url");
    if (!d?.originalName) errors.push("Each document must have originalName");
    if (!d?.mimeType) errors.push("Each document must have mimeType");
    if (typeof d?.size !== "number") errors.push("Each document must have size (number)");
    if (typeof d?.index !== "number") errors.push("Each document must have index (number)");
  }

  return errors;
};

const createStickerVisa = async (req, res) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ message: "Validation failed", errors });

    const doc = await StickerVisa.create({
      userId: req.user?.id || null,
      name: req.body.name || "",
      email: req.body.email,
      contact: req.body.contact,
      country: req.body.country || null,
      visaType: req.body.visaType,
      noOfDays: Number(req.body.noOfDays),
      documents: req.body.documents || [],
      enquiryDate: req.body.enquiryDate,
      submittedAt: new Date(req.body.submittedAt),
      tracking: req.body.tracking || {},
    });

    let userSent = false;
    let adminSent = false;

    try {
      const userMail = buildUserEmail(doc);
      await userMail.send();
      userSent = true;
    } catch (e) {
      console.error("User email failed:", e.message);
      userSent = false;
    }

    try {
      const adminMail = buildAdminEmail(doc);
      await adminMail.send();
      adminSent = true;
    } catch (e) {
      console.error("Admin email failed:", e.message);
      adminSent = false;
    }

    if (doc.emails) {
      doc.emails.userSent = userSent;
      doc.emails.adminSent = adminSent;
      doc.emails.lastEmailAt = new Date();
      await doc.save();
    }

    return res.status(201).json({ message: "Enquiry stored successfully", id: doc._id, emails: { userSent, adminSent } });
  } catch (err) {
    console.error("Create Sticker Visa enquiry error:", err);
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getAllStickerVisas = async (req, res) => {
  try {
    const items = await StickerVisa.find().sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getMyStickerVisas = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const items = await StickerVisa.find({ userId }).sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getStickerVisaById = async (req, res) => {
  try {
    const item = await StickerVisa.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const deleteStickerVisaById = async (req, res) => {
  try {
    const deleted = await StickerVisa.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted successfully", id: deleted._id });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const resendStickerVisaEmailsById = async (req, res) => {
  try {
    const item = await StickerVisa.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    let userSent = false;
    let adminSent = false;

    try {
      const userMail = buildUserEmail(item);
      await userMail.send();
      userSent = true;
    } catch (e) {
      userSent = false;
    }

    try {
      const adminMail = buildAdminEmail(item);
      await adminMail.send();
      adminSent = true;
    } catch (e) {
      adminSent = false;
    }

    item.emails.userSent = userSent;
    item.emails.adminSent = adminSent;
    item.emails.lastEmailAt = new Date();
    await item.save();

    return res.json({ message: "Emails attempted", emails: { userSent, adminSent } });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const updateStickerVisaById = async (req, res) => {
  try {
    const { status, payment } = req.body;
    const updates = {};

    if (status) {
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Dispatched', 'Received'];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });
      updates.status = status;
    }

    if (payment) {
      const validPayments = ['Paid', 'Pending'];
      if (!validPayments.includes(payment)) return res.status(400).json({ message: "Invalid payment status" });
      updates.payment = payment;
    }

    const updated = await StickerVisa.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Updated successfully", item: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

module.exports = {
  createStickerVisa,
  getAllStickerVisas,
  getStickerVisaById,
  deleteStickerVisaById,
  resendStickerVisaEmailsById,
  getMyStickerVisas,
  updateStickerVisaById,
};