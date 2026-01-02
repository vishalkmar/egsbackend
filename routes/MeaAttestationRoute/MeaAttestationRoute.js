  
const express = require('express')
const { createMeaEnquiry,deleteMeaEnquiryById,getAllMeaEnquiries,getMeaEnquiryById,resendMeaEnquiryEmailsById,getMyMeaEnquiries,updateMeaEnquiryById } = require("../../controllers/MeaEnquiryController/MeaEnquiryController");

const router = express.Router();
const { requireUser } = require("../../middleware/userAuth");

// create + auto email user+admin (require login)
router.post("/mea-attestation/enquiry", requireUser, createMeaEnquiry);

// get all
router.get("/mea-attestation/enquiry", getAllMeaEnquiries);

// get current user's enquiries (requires auth)
router.get("/mea-attestation/enquiry/my", requireUser, getMyMeaEnquiries);

// get by id
router.get("/mea-attestation/enquiry/:id", getMeaEnquiryById);

// update status & payment by id
router.patch("/mea-attestation/enquiry/:id", updateMeaEnquiryById);

// delete by id
router.delete("/mea-attestation/enquiry/:id", deleteMeaEnquiryById);

// manual resend email
router.post("/mea-attestation/enquiry/:id/resend-email", resendMeaEnquiryEmailsById);

module.exports = router;
