const express = require('express');
const router = express.Router();

const verifySignature = require('../middleware/checkAuth');
const generalStatsController = require('../controllers/generalStatsController');

router.use(verifySignature); // Apply the authentication middleware to all routes

router.post('/add', generalStatsController.addOrUpdateGeneralStats);

module.exports = router;