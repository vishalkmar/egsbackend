const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");
const {
  createMeetGreet,
  getAllMeetGreets,
  getMyMeetGreets,
  getMeetGreetById,
  updateMeetGreetById,
  deleteMeetGreetById,
} = require("../../controllers/MeetGreetController/MeetGreetController");

router.post("/meet-greet/enquiry", requireUser, createMeetGreet);
router.post("/enquiry", requireUser, createMeetGreet);
router.get("/meet-greet/enquiry", getAllMeetGreets);
router.get("/enquiry", getAllMeetGreets);
router.get("/meet-greet/enquiry/my", requireUser, getMyMeetGreets);
router.get("/enquiry/my", requireUser, getMyMeetGreets);
router.get("/meet-greet/enquiry/:id", getMeetGreetById);
router.get("/enquiry/:id", getMeetGreetById);
router.patch("/meet-greet/enquiry/:id", updateMeetGreetById);
router.patch("/enquiry/:id", updateMeetGreetById);
router.delete("/meet-greet/enquiry/:id", deleteMeetGreetById);
router.delete("/enquiry/:id", deleteMeetGreetById);

module.exports = router;
