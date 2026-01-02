const express = require('express')
const { createPccLegalization, deletePccLegalizationById, getAllPccLegalizations, getPccLegalizationById, resendPccLegalizationEmailsById, getMyPccLegalizations, updatePccLegalizationById } = require("../../controllers/PccLegalizationController/PccLegalizationController");

const router = express.Router();
const { requireUser } = require("../../middleware/userAuth");

// create + auto email user+admin (require login)
router.post("/pcc-legalization/enquiry", requireUser, createPccLegalization);

// get all
router.get("/pcc-legalization/enquiry", getAllPccLegalizations);

// get current user's enquiries (requires auth)
router.get("/pcc-legalization/enquiry/my", requireUser, getMyPccLegalizations);

// get by id
router.get("/pcc-legalization/enquiry/:id", getPccLegalizationById);

// update status & payment by id
router.patch("/pcc-legalization/enquiry/:id", updatePccLegalizationById);

// delete by id
router.delete("/pcc-legalization/enquiry/:id", deletePccLegalizationById);

// manual resend email
router.post("/pcc-legalization/enquiry/:id/resend-email", resendPccLegalizationEmailsById);

module.exports = router;
