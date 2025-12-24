const router = require("express").Router();
const {
  sendUserOtp,
  verifyUserOtp,
  logoutUser,
} = require("../../controllers/UserAuthController/UserAuth");

const { requireUser } = require("../../middleware/userAuth");

// PUBLIC
router.post("/send-otp", sendUserOtp);
router.post("/verify-otp", verifyUserOtp);

// PROTECTED
router.post("/logout", requireUser, logoutUser);

// OPTIONAL: session check (frontend guard ke liye best)
router.get("/me", requireUser, (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
