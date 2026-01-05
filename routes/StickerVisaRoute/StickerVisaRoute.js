const express = require('express')
const {
  createStickerVisa,
  deleteStickerVisaById,
  getAllStickerVisas,
  getStickerVisaById,
  resendStickerVisaEmailsById,
  getMyStickerVisas,
  updateStickerVisaById,
} = require("../../controllers/StickerVisaController/StickerVisaController");

const router = express.Router();
const { requireUser } = require("../../middleware/userAuth");

router.post("/sticker-visa/enquiry", requireUser, createStickerVisa);
router.get("/sticker-visa/enquiry", getAllStickerVisas);
router.get("/sticker-visa/enquiry/my", requireUser, getMyStickerVisas);
router.get("/sticker-visa/enquiry/:id", getStickerVisaById);
router.patch("/sticker-visa/enquiry/:id", updateStickerVisaById);
router.delete("/sticker-visa/enquiry/:id", deleteStickerVisaById);
router.post("/sticker-visa/enquiry/:id/resend-email", resendStickerVisaEmailsById);

module.exports = router;
