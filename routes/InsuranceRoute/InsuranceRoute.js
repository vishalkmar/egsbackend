const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");
const {
  createInsurance,
  getAllInsurance,
  getMyInsurance,
  getInsuranceById,
  updateInsuranceById,
  deleteInsuranceById,
} = require("../../controllers/InsuranceController/InsuranceController");

router.post("/insurance/enquiry", requireUser, createInsurance);
router.post("/enquiry", requireUser, createInsurance);
router.get("/insurance/enquiry", getAllInsurance);
router.get("/enquiry", getAllInsurance);
router.get("/insurance/enquiry/my", requireUser, getMyInsurance);
router.get("/enquiry/my", requireUser, getMyInsurance);
router.get("/insurance/enquiry/:id", getInsuranceById);
router.get("/enquiry/:id", getInsuranceById);
router.patch("/insurance/enquiry/:id", updateInsuranceById);
router.patch("/enquiry/:id", updateInsuranceById);
router.delete("/insurance/enquiry/:id", deleteInsuranceById);
router.delete("/enquiry/:id", deleteInsuranceById);

module.exports = router;
