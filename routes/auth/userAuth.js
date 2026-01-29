const router = require("express").Router();
const {
  sendUserOtp,
  verifyUserOtp,
  logoutUser,
} = require("../../controllers/UserAuthController/UserAuth");

const { requireUser } = require("../../middleware/userAuth");
const User = require("../../models/userAuthModel/UserModel");

// PUBLIC
router.post("/send-otp", sendUserOtp);
router.post("/verify-otp", verifyUserOtp);

// PROTECTED
router.post("/logout", requireUser, logoutUser);

// OPTIONAL: session check (frontend guard ke liye best)
router.get("/me", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(200).json({ success: true, user: req.user });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      user: {
        id: String(user._id),
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
