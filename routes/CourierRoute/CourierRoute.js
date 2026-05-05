const router = require("express").Router();
const { requireAdmin } = require("../../middleware/adminAuth");
const {
  listCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  trackCourier,
} = require("../../controllers/CourierController/CourierController");

router.get("/track", trackCourier);
router.get("/admin", requireAdmin, listCouriers);
router.post("/admin", requireAdmin, createCourier);
router.patch("/admin/:id", requireAdmin, updateCourier);
router.delete("/admin/:id", requireAdmin, deleteCourier);

module.exports = router;
