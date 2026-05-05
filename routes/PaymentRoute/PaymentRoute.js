const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");
const { requireAdmin } = require("../../middleware/adminAuth");
const {
  initiatePayment,
  verifyPayment,
  cashfreeWebhook,
  getPaymentHistory,
  getMyPayment,
  adminListPayments,
  adminGetPayment,
  adminResendPayment,
  adminPaymentStats,
} = require("../../controllers/PaymentController/PaymentController");

router.post("/initiate", requireUser, initiatePayment);
router.post("/verify", requireUser, verifyPayment);
router.post("/webhook", cashfreeWebhook);
router.get("/history", requireUser, getPaymentHistory);
router.get("/me/:id", requireUser, getMyPayment);
router.get("/admin/all", requireAdmin, adminListPayments);
router.get("/admin/stats", requireAdmin, adminPaymentStats);
router.get("/admin/:id", requireAdmin, adminGetPayment);
router.post("/admin/:id/resend", requireAdmin, adminResendPayment);

module.exports = router;
