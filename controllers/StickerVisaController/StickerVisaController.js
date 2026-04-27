const { StickerVisa } = require("../../models");
const { buildAdminEmail, buildUserEmail } = require("../../utils/stickerVisaEmailService.js");
const {
  createSubmission, listSubmissions, getSubmissionById,
  updateSubmissionStatus, updateSubmissionFields, deleteSubmission, markEmailSent,
} = require("../../utils/submissionService");

const SUBMISSION_TYPE = "sticker_visa";
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
  return errors;
};

const createStickerVisa = async (req, res) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ message: "Validation failed", errors });

    const payload = {
      userId: req.user?.id || null,
      name: req.body.name || "",
      email: req.body.email,
      contact: req.body.contact,
      country: req.body.country || null,
      visaType: req.body.visaType,
      noOfDays: Number(req.body.noOfDays),
      enquiryDate: req.body.enquiryDate,
      submittedAt: new Date(req.body.submittedAt),
      tracking: req.body.tracking || {},
    };

    const submission = await createSubmission({
      Model: StickerVisa, submissionType: SUBMISSION_TYPE, payload,
      documentsInput: req.body.documents,
      actor: { role: req.user ? "user" : "system", email: req.body.email },
    });
    const hydrated = await getSubmissionById({ Model: StickerVisa, id: submission.id });

    let userSent = false, adminSent = false;
    try { await buildUserEmail(hydrated).send(); userSent = true; await markEmailSent({ submission: hydrated, kind: "user" }); }
    catch (e) { console.error("Sticker user email failed:", e.message); }
    try { await buildAdminEmail(hydrated).send(); adminSent = true; await markEmailSent({ submission: hydrated, kind: "admin" }); }
    catch (e) { console.error("Sticker admin email failed:", e.message); }

    return res.status(201).json({ message: "Enquiry stored successfully", id: hydrated.id, item: hydrated, emails: { userSent, adminSent } });
  } catch (err) {
    console.error("Create Sticker Visa enquiry error:", err);
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getAllStickerVisas = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: StickerVisa, req, includeDocs: true,
      searchFields: ["email", "name", "contact", "visa_type", "country"],
    });
    return res.json({ count: result.pagination.total, ...result });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getMyStickerVisas = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const result = await listSubmissions({
      Model: StickerVisa, req, userId: req.user.id, includeDocs: true,
      searchFields: ["email", "name"],
    });
    return res.json({ count: result.pagination.total, ...result });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getStickerVisaById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: StickerVisa, id: req.params.id, withHistory: true });
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const deleteStickerVisaById = async (req, res) => {
  try {
    const ok = await deleteSubmission({ Model: StickerVisa, submissionType: SUBMISSION_TYPE, id: req.params.id });
    if (!ok) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted successfully", id: req.params.id });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const resendStickerVisaEmailsById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: StickerVisa, id: req.params.id });
    if (!item) return res.status(404).json({ message: "Not found" });
    let userSent = false, adminSent = false;
    try { await buildUserEmail(item).send(); userSent = true; await markEmailSent({ submission: item, kind: "user" }); } catch (e) {}
    try { await buildAdminEmail(item).send(); adminSent = true; await markEmailSent({ submission: item, kind: "admin" }); } catch (e) {}
    return res.json({ message: "Emails attempted", emails: { userSent, adminSent } });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const updateStickerVisaById = async (req, res) => {
  try {
    const updates = req.body || {};
    if (updates.status) {
      try {
        const updated = await updateSubmissionStatus({
          Model: StickerVisa, submissionType: SUBMISSION_TYPE,
          id: req.params.id, newStatus: updates.status, note: updates.note,
          actor: { role: req.admin ? "admin" : "user", email: req.admin?.email || req.user?.email },
        });
        if (!updated) return res.status(404).json({ message: "Not found" });
      } catch (e) {
        if (e.code === "INVALID_STATUS") return res.status(400).json({ message: e.message });
        throw e;
      }
    }
    const updated = await updateSubmissionFields({ Model: StickerVisa, id: req.params.id, updates });
    if (!updated) return res.status(404).json({ message: "Not found" });
    const hydrated = await getSubmissionById({ Model: StickerVisa, id: req.params.id, withHistory: true });
    return res.json({ message: "Updated successfully", item: hydrated });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

module.exports = {
  createStickerVisa, getAllStickerVisas, getStickerVisaById,
  deleteStickerVisaById, resendStickerVisaEmailsById,
  getMyStickerVisas, updateStickerVisaById,
};
