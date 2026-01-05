const Translation = require("../../models/translationModels/TranslationModel.js");

const { buildAdminEmail, buildUserEmail } = require("../../utils/translationEmailService.js");

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

const validatePayload = (body) => {
  const errors = [];

  if (!isValidEmail(body.email)) errors.push("Invalid email");
  if (!String(body.contact || "").trim()) errors.push("Contact is required");
  // Accept either explicit language-based translation or the category-based form
  const hasLangFields = String(body.sourceLanguage || "").trim() && String(body.targetLanguage || "").trim();
  const hasCategoryFields = String(body.category || "").trim() && String(body.selectedDocType || "").trim();
  if (!hasLangFields && !hasCategoryFields) errors.push("Either source/target languages and docType, or category and selectedDocType must be provided");

  const n = Number(body.noOfDocuments);
  if (!n || n < 1) errors.push("noOfDocuments must be >= 1");

  if (!body.enquiryDate) errors.push("enquiryDate is required");

  const submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) errors.push("submittedAt must be valid ISO date");

  const docs = Array.isArray(body.documents) ? body.documents : [];
  if (docs.length !== n) errors.push("documents count must match noOfDocuments");

  for (const d of docs) {
    if (!d?.url) errors.push("Each document must have url");
    if (!d?.originalName) errors.push("Each document must have originalName");
    if (!d?.mimeType) errors.push("Each document must have mimeType");
    if (typeof d?.size !== "number") errors.push("Each document must have size (number)");
    if (typeof d?.index !== "number") errors.push("Each document must have index (number)");
  }

  return errors;
};

const createTranslation = async (req, res) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ message: "Validation failed", errors });

    const doc = await Translation.create({
      userId: req.user?.id || null,
      name: req.body.name || "",
      email: req.body.email,
      contact: req.body.contact,
      sourceLanguage: req.body.sourceLanguage || null,
      targetLanguage: req.body.targetLanguage || null,
      category: req.body.category || null,
      selectedDocType: req.body.selectedDocType || null,
      docType: req.body.selectedDocType || req.body.docType || null,
      country: req.body.country || null,
      noOfDocuments: Number(req.body.noOfDocuments),
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
    console.error("Create Translation enquiry error:", err);
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getAllTranslations = async (req, res) => {
  try {
    const items = await Translation.find().sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getMyTranslations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const items = await Translation.find({ userId }).sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getTranslationById = async (req, res) => {
  try {
    const item = await Translation.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const deleteTranslationById = async (req, res) => {
  try {
    const deleted = await Translation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted successfully", id: deleted._id });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const resendTranslationEmailsById = async (req, res) => {
  try {
    const item = await Translation.findById(req.params.id);
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

const updateTranslationById = async (req, res) => {
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

    const updated = await Translation.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Updated successfully", item: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

module.exports = {
  createTranslation,
  getAllTranslations,
  getTranslationById,
  deleteTranslationById,
  resendTranslationEmailsById,
  getMyTranslations,
  updateTranslationById,
};
