const { Hrd } = require("../../models");
const { buildAdminEmail, buildUserEmail } = require("../../utils/hrdEmailService.js");
const {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  updateSubmissionFields,
  deleteSubmission,
  markEmailSent,
} = require("../../utils/submissionService");

const SUBMISSION_TYPE = "hrd";
const splitFullName = (fullName = "") => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};
const normalizeHrdBodies = (body) => {
  const submittedAt = body?.submittedAt || new Date().toISOString();
  const enquiryDate = body?.enquiryDate || new Date().toISOString().split("T")[0];
  const { firstName, lastName } = splitFullName(body?.fullName);
  const base = {
    firstName: body?.firstName || firstName,
    lastName: body?.lastName || lastName,
    email: body?.email,
    mobile: body?.mobile || body?.phone,
    submittedAt,
    enquiryDate,
    tracking: body?.tracking || {},
  };

  if (!Array.isArray(body?.paxes) || body.paxes.length === 0) {
    return [{ ...body, ...base }];
  }

  return body.paxes.map((pax) => ({
    ...base,
    state: pax?.state || "",
    district: pax?.district || "",
    docType: pax?.docType || "",
    selectedDocs: Array.isArray(pax?.selectedDocs) ? pax.selectedDocs : [],
    docCount: Number(pax?.docCount || 0),
    message: pax?.message || "",
    documents: Array.isArray(pax?.documents) ? pax.documents : [],
  }));
};

const createHrd = async (req, res) => {
  try {
    const bodies = normalizeHrdBodies(req.body);
    const validationErrors = [];
    bodies.forEach((data, index) => {
      if (!data.email || !data.mobile) validationErrors.push(`Pax ${index + 1}: Email and mobile are required`);
      if (!data.state) validationErrors.push(`Pax ${index + 1}: State is required`);
      if (!data.district) validationErrors.push(`Pax ${index + 1}: District is required`);
      if (!data.docType) validationErrors.push(`Pax ${index + 1}: Document type is required`);
      if (!Array.isArray(data.selectedDocs) || !data.selectedDocs.length) validationErrors.push(`Pax ${index + 1}: At least one document is required`);
      if (Number(data.docCount || 0) < 1) validationErrors.push(`Pax ${index + 1}: docCount must be at least 1`);
      if (!Array.isArray(data.documents) || data.documents.length !== Number(data.docCount || 0)) {
        validationErrors.push(`Pax ${index + 1}: documents count must match docCount`);
      }
    });
    if (validationErrors.length) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
    }

    const items = [];
    for (const data of bodies) {
      const payload = {
        userId: req.user?.id || null,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email,
        mobile: data.mobile,
        state: data.state || "",
        district: data.district || "",
        docType: data.docType || "",
        selectedDocs: Array.isArray(data.selectedDocs)
          ? data.selectedDocs
          : data.selectedDocs ? [data.selectedDocs] : [],
        docCount: data.docCount ? Number(data.docCount) : 0,
        message: data.message || "",
        enquiryDate: data.enquiryDate || new Date().toISOString().split("T")[0],
        submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
        tracking: data.tracking || {},
      };

      const submission = await createSubmission({
        Model: Hrd,
        submissionType: SUBMISSION_TYPE,
        payload,
        documentsInput: data.documents,
        actor: { role: req.user ? "user" : "system", email: data.email },
      });

      const hydrated = await getSubmissionById({ Model: Hrd, id: submission.id });
      items.push(hydrated);

      try {
        await buildUserEmail(hydrated).send();
        await markEmailSent({ submission: hydrated, kind: "user" });
      } catch (e) { console.error("HRD: user email send failed", e?.message || e); }

      try {
        await buildAdminEmail(hydrated).send();
        await markEmailSent({ submission: hydrated, kind: "admin" });
      } catch (e) { console.error("HRD: admin email send failed", e?.message || e); }
    }

    return res.json({ success: true, item: items[0], items, message: "HRD Attestation enquiry received" });
  } catch (err) {
    console.error("Create HRD enquiry error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllHrds = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: Hrd, req, includeDocs: true,
      searchFields: ["email", "first_name", "last_name", "mobile"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get all HRD error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyHrds = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: Hrd, req, userId: req.user?.id, includeDocs: true,
      searchFields: ["email", "first_name", "last_name"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get my HRD error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getHrdById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: Hrd, id: req.params.id, withHistory: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Get HRD by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteHrdById = async (req, res) => {
  try {
    const ok = await deleteSubmission({ Model: Hrd, submissionType: SUBMISSION_TYPE, id: req.params.id });
    if (!ok) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete HRD by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const resendHrdEmailsById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: Hrd, id: req.params.id });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    try {
      await buildUserEmail(item).send();
      await markEmailSent({ submission: item, kind: "user" });
    } catch (e) { console.error("Resend HRD: user email failed", e?.message || e); }

    try {
      await buildAdminEmail(item).send();
      await markEmailSent({ submission: item, kind: "admin" });
    } catch (e) { console.error("Resend HRD: admin email failed", e?.message || e); }

    return res.json({ success: true, item, message: "Emails resent" });
  } catch (err) {
    console.error("Resend HRD emails error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateHrdById = async (req, res) => {
  try {
    const updates = req.body || {};
    if (updates.status) {
      try {
        const updated = await updateSubmissionStatus({
          Model: Hrd, submissionType: SUBMISSION_TYPE,
          id: req.params.id, newStatus: updates.status, note: updates.note,
          actor: { role: req.admin ? "admin" : "user", email: req.admin?.email || req.user?.email },
        });
        if (!updated) return res.status(404).json({ success: false, message: "Not found" });
      } catch (e) {
        if (e.code === "INVALID_STATUS") return res.status(400).json({ success: false, message: e.message });
        throw e;
      }
    }
    const updated = await updateSubmissionFields({ Model: Hrd, id: req.params.id, updates });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    const hydrated = await getSubmissionById({ Model: Hrd, id: req.params.id, withHistory: true });
    return res.json({ success: true, item: hydrated });
  } catch (err) {
    console.error("Update HRD error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createHrd, getAllHrds, getHrdById, deleteHrdById,
  resendHrdEmailsById, getMyHrds, updateHrdById,
};
