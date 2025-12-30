const router = require("express").Router();

router.use("/auth/user", require("./auth/userAuth"));
router.use("/auth/admin", require("./auth/adminAuth"));
router.use('/secureuser',require("./protecteduser"))
router.use('/secureadmin',require('./protectedadmin'))
router.use('/contact',require('./contactFormRoute/ContactRoutes'))
router.use('/mea',require('../routes/MeaAttestationRoute/MeaAttestationRoute'))

module.exports = router;
