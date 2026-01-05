const express = require('express')
const {
  createTranslation,
  deleteTranslationById,
  getAllTranslations,
  getTranslationById,
  resendTranslationEmailsById,
  getMyTranslations,
  updateTranslationById,
} = require("../../controllers/TranslationController/TranslationController");

const router = express.Router();
const { requireUser } = require("../../middleware/userAuth");

router.post("/translation/enquiry", requireUser, createTranslation);
router.get("/translation/enquiry", getAllTranslations);
router.get("/translation/enquiry/my", requireUser, getMyTranslations);
router.get("/translation/enquiry/:id", getTranslationById);
router.patch("/translation/enquiry/:id", updateTranslationById);
router.delete("/translation/enquiry/:id", deleteTranslationById);
router.post("/translation/enquiry/:id/resend-email", resendTranslationEmailsById);

module.exports = router;
