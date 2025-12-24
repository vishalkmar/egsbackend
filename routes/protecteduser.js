const router = require("express").Router();
const { requireUser } = require("../middleware/userAuth");


// login check (frontend guard)
router.get("/user/me", requireUser, (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});


module.exports = router;
