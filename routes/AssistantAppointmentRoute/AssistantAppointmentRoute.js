const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");
const {
  createAssistantAppointment,
  getAllAssistantAppointments,
  getMyAssistantAppointments,
  getAssistantAppointmentById,
  updateAssistantAppointmentById,
  deleteAssistantAppointmentById,
} = require("../../controllers/AssistantAppointmentController/AssistantAppointmentController");

router.post("/assistant-appointment/enquiry", requireUser, createAssistantAppointment);
router.post("/enquiry", requireUser, createAssistantAppointment);
router.get("/assistant-appointment/enquiry", getAllAssistantAppointments);
router.get("/enquiry", getAllAssistantAppointments);
router.get("/assistant-appointment/enquiry/my", requireUser, getMyAssistantAppointments);
router.get("/enquiry/my", requireUser, getMyAssistantAppointments);
router.get("/assistant-appointment/enquiry/:id", getAssistantAppointmentById);
router.get("/enquiry/:id", getAssistantAppointmentById);
router.patch("/assistant-appointment/enquiry/:id", updateAssistantAppointmentById);
router.patch("/enquiry/:id", updateAssistantAppointmentById);
router.delete("/assistant-appointment/enquiry/:id", deleteAssistantAppointmentById);
router.delete("/enquiry/:id", deleteAssistantAppointmentById);

module.exports = router;
