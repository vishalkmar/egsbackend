const router = require("express").Router();
const {
  sendUserOtp,
  verifyUserOtp,
  completeProfile,
  logoutUser,
} = require("../../controllers/UserAuthController/UserAuth");

const { requireUser } = require("../../middleware/userAuth");
const { User } = require("../../models");

// PUBLIC
router.post("/send-otp", sendUserOtp);
router.post("/verify-otp", verifyUserOtp);
router.post("/complete-profile", completeProfile);

// PROTECTED
router.post("/logout", requireUser, logoutUser);

router.get("/me", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(200).json({ success: true, user: req.user });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
        phone: user.phone || "",
      },
    });
  } catch (err) {
    console.error("/auth/user/me error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
