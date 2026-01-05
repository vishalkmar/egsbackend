const router = require("express").Router();

router.use("/auth/user", require("./auth/userAuth"));
router.use("/auth/admin", require("./auth/adminAuth"));
router.use('/secureuser',require("./protecteduser"))
router.use('/secureadmin',require('./protectedadmin'))
router.use('/contact',require('./contactFormRoute/ContactRoutes'))
router.use('/mea',require('../routes/MeaAttestationRoute/MeaAttestationRoute'))
router.use('/pcc',require('../routes/PccLegalizationRoute/PccLegalizationRoute'))
router.use('/translation', require('../routes/TranslationRoute/TranslationRoute'))
router.use('/sticker', require('../routes/StickerVisaRoute/StickerVisaRoute'))
router.use('/evisa', require('../routes/EVisaRoute/EVisaRoute'))
router.use('/hrd', require('../routes/HrdAttestationRoute/HrdAttestationRoute'))

module.exports = router;
