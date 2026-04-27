const { AssistantAppointment } = require("../../models");
const {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  updateSubmissionFields,
  deleteSubmission,
} = require("../../utils/submissionService");

const SUBMISSION_TYPE = "assistant_appointment";

const createAssistantAppointment = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.email || !data.phone || !data.arrivalDate || !data.submissionDate || !data.visaType || !data.submissionCountry) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const payload = {
      userId: req.user?.id || null,
      name: data.name || "",
      email: data.email,
      phone: data.phone,
      arrivalDate: data.arrivalDate,
      submissionDate: data.submissionDate,
      visaType: data.visaType,
      submissionCountry: data.submissionCountry,
      enquiryDate: data.enquiryDate || new Date().toISOString().split("T")[0],
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      tracking: data.tracking || {},
    };

    const submission = await createSubmission({
      Model: AssistantAppointment,
      submissionType: SUBMISSION_TYPE,
      payload,
      documentsInput: data.documents,
      actor: { role: req.user ? "user" : "system", email: data.email },
    });

    const hydrated = await getSubmissionById({ Model: AssistantAppointment, id: submission.id });
    return res.json({ success: true, item: hydrated, message: "Assistant appointment request received" });
  } catch (err) {
    console.error("Create assistant appointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllAssistantAppointments = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: AssistantAppointment,
      req,
      includeDocs: true,
      searchFields: ["email", "name", "phone", "visa_type", "submission_country"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get assistant appointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyAssistantAppointments = async (req, res) => {
  try {
    const result = await listSubmissions({
      Model: AssistantAppointment,
      req,
      userId: req.user?.id,
      includeDocs: true,
      searchFields: ["email", "name", "phone"],
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get my assistant appointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAssistantAppointmentById = async (req, res) => {
  try {
    const item = await getSubmissionById({ Model: AssistantAppointment, id: req.params.id, withHistory: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Get assistant appointment by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateAssistantAppointmentById = async (req, res) => {
  try {
    const updates = req.body || {};
    if (updates.status) {
      const updatedStatus = await updateSubmissionStatus({
        Model: AssistantAppointment,
        submissionType: SUBMISSION_TYPE,
        id: req.params.id,
        newStatus: updates.status,
        note: updates.note,
        actor: { role: req.admin ? "admin" : "user", email: req.admin?.email || req.user?.email },
      });
      if (!updatedStatus) return res.status(404).json({ success: false, message: "Not found" });
    }
    const updated = await updateSubmissionFields({ Model: AssistantAppointment, id: req.params.id, updates });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    const hydrated = await getSubmissionById({ Model: AssistantAppointment, id: req.params.id, withHistory: true });
    return res.json({ success: true, item: hydrated });
  } catch (err) {
    console.error("Update assistant appointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteAssistantAppointmentById = async (req, res) => {
  try {
    const ok = await deleteSubmission({ Model: AssistantAppointment, submissionType: SUBMISSION_TYPE, id: req.params.id });
    if (!ok) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete assistant appointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createAssistantAppointment,
  getAllAssistantAppointments,
  getMyAssistantAppointments,
  getAssistantAppointmentById,
  updateAssistantAppointmentById,
  deleteAssistantAppointmentById,
};
