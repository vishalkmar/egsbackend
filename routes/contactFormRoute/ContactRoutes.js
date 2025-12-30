const router = require("express").Router();
const { sendContactEmail } = require("../../controllers/contactFormController/sendContactEmaiController");

router.post("/sendcontactemail", sendContactEmail);

module.exports = router;
