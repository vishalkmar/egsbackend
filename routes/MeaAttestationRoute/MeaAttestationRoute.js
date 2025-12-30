  
const express = require('express')
const { createMeaEnquiry,deleteMeaEnquiryById,getAllMeaEnquiries,getMeaEnquiryById,resendMeaEnquiryEmailsById } = require("../../controllers/MeaEnquiryController/MeaEnquiryController");

const router = express.Router();

// create + auto email user+admin
router.post("/mea-attestation/enquiry", createMeaEnquiry);

// get all
router.get("/mea-attestation/enquiry", getAllMeaEnquiries);

// get by id
router.get("/mea-attestation/enquiry/:id", getMeaEnquiryById);

// delete by id
router.delete("/mea-attestation/enquiry/:id", deleteMeaEnquiryById);

// manual resend email
router.post("/mea-attestation/enquiry/:id/resend-email", resendMeaEnquiryEmailsById);

module.exports = router;
