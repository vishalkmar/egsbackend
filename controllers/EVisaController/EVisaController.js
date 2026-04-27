const { EVisa } = require("../../models");
const { buildAdminEmail, buildUserEmail } = require("../../utils/eVisaEmailService.js");
const {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  updateSubmissionFields,
  deleteSubmission,
  markEmailSent,
} = require("../../utils/submissionService");

const SUBMISSION_TYPE = "evisa";

const createEVisa = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.email || !data.contact || !data.visaType) {
      return res.status(400).json({ success: false, message: "Email, contact and visaType are required" });
    }

    const payload = {
      userId: req.user?.id || null,
      name: data.name || "",
      email: data.email,
      contact: data.contact,
      country: data.country || null,
      visaType: data.visaType,
      noOfDays: data.noOfDays || 0,
      enquiryDate: data.enquiryDate || new Date().toISOString().split("T")[0],
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      tracking: data.tracking || {},
    };

    const submission = await createSubmission({
      Model: EVisa, submissionType: SUBMISSION_TYPE, payload,
      documentsInput: data.documents,
      actor: { role: req.user ? "user" : "system", email: data.email },
    });

    const hydrated = await getSubmissionById({ Model: EVisa, id: submission.id });

    try {
      await buildUserEmail(hydrated).send();
      await markEmailSent({ submission: hydrated, kind: "user" });
    } catch (e) { console.error("E-Visa: user email send failed", e?.message || e); }

    try {
      await buildAdminEmail(hydrated).send();
      await markEmailSent({ submission: hydrated, kind: "admin" });
    } catch (e) { console.error("E-Visa: admin email send failed", e?.message || e); }

    return res.json({ success: true, item: hydrated, message: "E-Visa enquiry received" });
  } catch (err) {
    console.error("Create E-Visa enquiry error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllEVisas = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: EVisa, req, includeDocs: true,
      searchFields: ["email", "name", "contact", "visa_type", "country"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get all E-Visa error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyEVisas = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: EVisa, req, userId: req.user?.id, includeDocs: true,
      searchFields: ["email", "name"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get my E-Visa error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getEVisaById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: EVisa, id: req.params.id, withHistory: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Get E-Visa by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteEVisaById = async (req, res) => {
  try {
    const ok = await deleteSubmission({ Model: EVisa, submissionType: SUBMISSION_TYPE, id: req.params.id });
    if (!ok) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete E-Visa by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const resendEVisaEmailsById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: EVisa, id: req.params.id });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    try {
      await buildUserEmail(item).send();
      await markEmailSent({ submission: item, kind: "user" });
    } catch (e) { console.error("Resend E-Visa: user email failed", e?.message || e); }
    try {
      await buildAdminEmail(item).send();
      await markEmailSent({ submission: item, kind: "admin" });
    } catch (e) { console.error("Resend E-Visa: admin email failed", e?.message || e); }

    return res.json({ success: true, item, message: "Emails resent" });
  } catch (err) {
    console.error("Resend E-Visa emails error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateEVisaById = async (req, res) => {
  try {
    const updates = req.body || {};
    if (updates.status) {
      try {
        const updated = await updateSubmissionStatus({
          Model: EVisa, submissionType: SUBMISSION_TYPE,
          id: req.params.id, newStatus: updates.status, note: updates.note,
          actor: { role: req.admin ? "admin" : "user", email: req.admin?.email || req.user?.email },
        });
        if (!updated) return res.status(404).json({ success: false, message: "Not found" });
      } catch (e) {
        if (e.code === "INVALID_STATUS") return res.status(400).json({ success: false, message: e.message });
        throw e;
      }
    }
    const updated = await updateSubmissionFields({ Model: EVisa, id: req.params.id, updates });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    const hydrated = await getSubmissionById({ Model: EVisa, id: req.params.id, withHistory: true });
    return res.json({ success: true, item: hydrated });
  } catch (err) {
    console.error("Update E-Visa error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createEVisa, getAllEVisas, getEVisaById, deleteEVisaById,
  resendEVisaEmailsById, getMyEVisas, updateEVisaById,
};
