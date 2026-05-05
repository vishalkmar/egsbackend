const router = require("express").Router();
const { requireUser } = require("../../middleware/userAuth");
const { requireAdmin } = require("../../middleware/adminAuth");
const {
  createDummyTicket,
  getAllDummyTickets,
  updateDummyTicket,
  deleteDummyTicket,
} = require("../../controllers/DummyTicketController/DummyTicketController");

router.post("/create", requireUser, createDummyTicket);
router.get("/", requireAdmin, getAllDummyTickets);
router.patch("/:id", requireAdmin, updateDummyTicket);
router.delete("/:id", requireAdmin, deleteDummyTicket);

module.exports = router;
