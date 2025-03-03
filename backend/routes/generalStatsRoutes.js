const express = require('express');
const router = express.Router();
const generalStatsController = require('../controllers/generalStatsController');

router.post('/add', generalStatsController.addOrUpdateGeneralStats);

module.exports = router;