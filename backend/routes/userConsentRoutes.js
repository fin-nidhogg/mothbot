const express = require('express');
const router = express.Router();
const userConsentController = require('../controllers/userConsentController');

router.post('/', userConsentController.createOrUpdateConsent);
router.get('/:userId', userConsentController.getUserConsent);

module.exports = router;