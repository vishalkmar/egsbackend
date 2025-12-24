const router = require("express").Router();
const { requireAdmin } = require("../middleware/adminAuth");

router.get("/admin/me", requireAdmin, (req, res) => {
  return res.status(200).json({ success: true, admin: req.admin || req.user });
});

module.exports = router;
