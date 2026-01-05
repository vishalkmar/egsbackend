const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");

const {
  createEVisa,
  deleteEVisaById,
  getAllEVisas,
  getEVisaById,
  resendEVisaEmailsById,
  getMyEVisas,
  updateEVisaById,
} = require("../../controllers/EVisaController/EVisaController");

router.post("/e-visa/enquiry", requireUser, createEVisa);
router.get("/e-visa/enquiry", getAllEVisas);
router.get("/e-visa/enquiry/my", requireUser, getMyEVisas);
router.get("/e-visa/enquiry/:id", getEVisaById);
router.patch("/e-visa/enquiry/:id", updateEVisaById);
router.delete("/e-visa/enquiry/:id", deleteEVisaById);
router.post("/e-visa/enquiry/:id/resend-email", resendEVisaEmailsById);

module.exports = router;
