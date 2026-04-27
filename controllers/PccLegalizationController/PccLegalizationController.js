const { PccLegalization } = require("../../models");
const { buildAdminEmail, buildUserEmail } = require("../../utils/pccEmailService.js");
const {
  createSubmission, listSubmissions, getSubmissionById,
  updateSubmissionStatus, updateSubmissionFields, deleteSubmission, markEmailSent,
} = require("../../utils/submissionService");

const SUBMISSION_TYPE = "pcc";
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
const toArray = (value) => (Array.isArray(value) ? value : []);
const normalizePccBodies = (body) => {
  const submittedAt = body?.submittedAt || new Date().toISOString();
  const enquiryDate = body?.enquiryDate || new Date().toISOString().split("T")[0];
  const base = {
    name: body?.name || "",
    email: body?.email,
    phone: body?.phone,
    companyName: body?.companyName || body?.name || "Individual",
    submittedAt,
    enquiryDate,
    tracking: body?.tracking || {},
  };

  if (!Array.isArray(body?.paxes) || body.paxes.length === 0) {
    return [{ ...body, ...base }];
  }

  return body.paxes.map((pax) => ({
    ...base,
    country: pax?.country || "",
    noOfDocuments: Number(pax?.noOfDocuments || 0),
    documents: toArray(pax?.documents),
  }));
};

const validatePayload = (body) => {
  const errors = [];
  if (!isValidEmail(body.email)) errors.push("Invalid email");
  if (!String(body.phone || "").trim()) errors.push("Phone is required");
  if (!String(body.country || "").trim()) errors.push("Country is required");
  const n = Number(body.noOfDocuments);
  if (!n || n < 1) errors.push("noOfDocuments must be >= 1");
  const submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) errors.push("submittedAt must be valid ISO date");
  const docs = Array.isArray(body.documents) ? body.documents : [];
  if (docs.length !== n) errors.push("documents count must match noOfDocuments");
  return errors;
};

const createPccLegalization = async (req, res) => {
  try {
    const bodies = normalizePccBodies(req.body);
    const allErrors = bodies.flatMap((body, index) =>
      validatePayload(body).map((message) => `Pax ${index + 1}: ${message}`)
    );
    if (allErrors.length) return res.status(400).json({ message: "Validation failed", errors: allErrors });

    const items = [];
    for (const body of bodies) {
      const payload = {
        userId: req.user?.id || null,
        name: body.name || "",
        email: body.email,
        phone: body.phone,
        country: body.country,
        companyName: body.companyName,
        noOfDocuments: Number(body.noOfDocuments),
        enquiryDate: body.enquiryDate || new Date().toISOString().split("T")[0],
        submittedAt: new Date(body.submittedAt),
        tracking: body.tracking || {},
      };

      const submission = await createSubmission({
        Model: PccLegalization, submissionType: SUBMISSION_TYPE, payload,
        documentsInput: body.documents,
        actor: { role: req.user ? "user" : "system", email: body.email },
      });
      const hydrated = await getSubmissionById({ Model: PccLegalization, id: submission.id });
      items.push(hydrated);

      try { await buildUserEmail(hydrated).send(); await markEmailSent({ submission: hydrated, kind: "user" }); }
      catch (e) { console.error("PCC user email failed:", e.message); }
      try { await buildAdminEmail(hydrated).send(); await markEmailSent({ submission: hydrated, kind: "admin" }); }
      catch (e) { console.error("PCC admin email failed:", e.message); }
    }

    return res.status(201).json({
      message: "Enquiry stored successfully",
      id: items[0]?.id,
      item: items[0],
      items,
    });
  } catch (err) {
    console.error("Create PCC enquiry error:", err);
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getAllPccLegalizations = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: PccLegalization, req, includeDocs: true,
      searchFields: ["email", "name", "phone", "country", "company_name"],
    });
    return res.json({ count: result.pagination.total, ...result });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getMyPccLegalizations = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const result = await listSubmissions({
      Model: PccLegalization, req, userId: req.user.id, includeDocs: true,
      searchFields: ["email", "name", "company_name"],
    });
    return res.json({ count: result.pagination.total, ...result });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const getPccLegalizationById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: PccLegalization, id: req.params.id, withHistory: true });
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const deletePccLegalizationById = async (req, res) => {
  try {
    const ok = await deleteSubmission({ Model: PccLegalization, submissionType: SUBMISSION_TYPE, id: req.params.id });
    if (!ok) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted successfully", id: req.params.id });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const resendPccLegalizationEmailsById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: PccLegalization, id: req.params.id });
    if (!item) return res.status(404).json({ message: "Not found" });
    let userSent = false, adminSent = false;
    try { await buildUserEmail(item).send(); userSent = true; await markEmailSent({ submission: item, kind: "user" }); } catch (e) {}
    try { await buildAdminEmail(item).send(); adminSent = true; await markEmailSent({ submission: item, kind: "admin" }); } catch (e) {}
    return res.json({ message: "Emails attempted", emails: { userSent, adminSent } });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

const updatePccLegalizationById = async (req, res) => {
  try {
    const updates = req.body || {};
    if (updates.status) {
      try {
        const updated = await updateSubmissionStatus({
          Model: PccLegalization, submissionType: SUBMISSION_TYPE,
          id: req.params.id, newStatus: updates.status, note: updates.note,
          actor: { role: req.admin ? "admin" : "user", email: req.admin?.email || req.user?.email },
        });
        if (!updated) return res.status(404).json({ message: "Not found" });
      } catch (e) {
        if (e.code === "INVALID_STATUS") return res.status(400).json({ message: e.message });
        throw e;
      }
    }
    const updated = await updateSubmissionFields({ Model: PccLegalization, id: req.params.id, updates });
    if (!updated) return res.status(404).json({ message: "Not found" });
    const hydrated = await getSubmissionById({ Model: PccLegalization, id: req.params.id, withHistory: true });
    return res.json({ message: "Updated successfully", item: hydrated });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

module.exports = {
  createPccLegalization, getAllPccLegalizations, getPccLegalizationById,
  deletePccLegalizationById, resendPccLegalizationEmailsById,
  getMyPccLegalizations, updatePccLegalizationById,
};
