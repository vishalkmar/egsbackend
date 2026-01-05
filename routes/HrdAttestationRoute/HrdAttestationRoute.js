const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");

const {
  createHrd,
  deleteHrdById,
  getAllHrds,
  getHrdById,
  resendHrdEmailsById,
  getMyHrds,
  updateHrdById,
} = require("../../controllers/HrdAttestationController/HrdAttestationController");

router.post("/hrd-attestation/enquiry", requireUser, createHrd);
router.get("/hrd-attestation/enquiry", getAllHrds);
router.get("/hrd-attestation/enquiry/my", requireUser, getMyHrds);
router.get("/hrd-attestation/enquiry/:id", getHrdById);
router.patch("/hrd-attestation/enquiry/:id", updateHrdById);
router.delete("/hrd-attestation/enquiry/:id", deleteHrdById);
router.post("/hrd-attestation/enquiry/:id/resend-email", resendHrdEmailsById);

module.exports = router;