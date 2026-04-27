const { Insurance } = require("../../models");
const {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  updateSubmissionFields,
  deleteSubmission,
} = require("../../utils/submissionService");

const SUBMISSION_TYPE = "insurance";

const createInsurance = async (req, res) => {
  try {
    const data = req.body || {};
    const paxes = Array.isArray(data.paxes) ? data.paxes : [];
    if (!data.email || !data.phone || !paxes.length) {
      return res.status(400).json({ success: false, message: "Email, phone and at least one pax are required" });
    }

    const created = [];
    for (const pax of paxes) {
      if (!pax.insuranceType || !pax.travelDate || !pax.destination || !pax.passport?.url) {
        return res.status(400).json({ success: false, message: "Each pax must include insuranceType, travelDate, destination and passport" });
      }

      const payload = {
        userId: req.user?.id || null,
        name: data.name || "",
        email: data.email,
        phone: data.phone,
        insuranceType: pax.insuranceType,
        travelDate: pax.travelDate,
        returnDate: pax.returnDate || "",
        tripDuration: String(pax.tripDuration || ""),
        destination: pax.destination,
        specialRequirements: pax.specialRequirements || "",
        enquiryDate: data.enquiryDate || new Date().toISOString().split("T")[0],
        submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
        tracking: data.tracking || {},
      };

      const submission = await createSubmission({
        Model: Insurance,
        submissionType: SUBMISSION_TYPE,
        payload,
        documentsInput: [pax.passport],
        actor: { role: req.user ? "user" : "system", email: data.email },
      });

      created.push(await getSubmissionById({ Model: Insurance, id: submission.id }));
    }

    return res.json({ success: true, items: created, message: "Insurance enquiry received" });
  } catch (err) {
    console.error("Create insurance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllInsurance = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: Insurance,
      req,
      includeDocs: true,
      searchFields: ["email", "name", "phone", "destination", "insurance_type"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get insurance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyInsurance = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: Insurance,
      req,
      userId: req.user?.id,
      includeDocs: true,
      searchFields: ["email", "name", "phone", "destination"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get my insurance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getInsuranceById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: Insurance, id: req.params.id, withHistory: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Get insurance by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateInsuranceById = async (req, res) => {
  try {
    const updates = req.body || {};
    if (updates.status) {
      const updatedStatus = await updateSubmissionStatus({
        Model: Insurance,
        submissionType: SUBMISSION_TYPE,
        id: req.params.id,
        newStatus: updates.status,
        note: updates.note,
        actor: { role: req.admin ? "admin" : "user", email: req.admin?.email || req.user?.email },
      });
      if (!updatedStatus) return res.status(404).json({ success: false, message: "Not found" });
    }
    const updated = await updateSubmissionFields({ Model: Insurance, id: req.params.id, updates });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    const hydrated = await getSubmissionById({ Model: Insurance, id: req.params.id, withHistory: true });
    return res.json({ success: true, item: hydrated });
  } catch (err) {
    console.error("Update insurance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteInsuranceById = async (req, res) => {
  try {
    const ok = await deleteSubmission({ Model: Insurance, submissionType: SUBMISSION_TYPE, id: req.params.id });
    if (!ok) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete insurance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createInsurance,
  getAllInsurance,
  getMyInsurance,
  getInsuranceById,
  updateInsuranceById,
  deleteInsuranceById,
};
