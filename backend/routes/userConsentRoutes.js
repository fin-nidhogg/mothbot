const express = require('express');
const router = express.Router();

const verifySignature = require('../middleware/checkAuth');
const userConsentController = require('../controllers/userConsentController');

router.use(verifySignature); // Apply the authentication middleware to all routes

router.post('/', userConsentController.createOrUpdateConsent);
router.get('/:userId', userConsentController.getUserConsent);

module.exports = router;