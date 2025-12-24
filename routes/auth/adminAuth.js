const router = require("express").Router();
const { requireAdmin } = require("../../middleware/adminAuth");
const { adminLogin, adminLogout } = require("../../controllers/AdminAuthController/AdminAuth");

// PUBLIC
router.post("/login", adminLogin);

// PROTECTED (optional but recommended)
router.post("/logout", requireAdmin, adminLogout);

// PROTECTED: session check (very useful for frontend)
router.get("/me", requireAdmin, (req, res) => {
  return res.status(200).json({ success: true, admin: req.admin });
});

module.exports = router;
