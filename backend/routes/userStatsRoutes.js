const express = require('express');
const router = express.Router();
const userStatsController = require('../controllers/userStatsController');

router.post('/add', userStatsController.addOrUpdateUserStats);
router.get('/stats', userStatsController.getUserStats);
router.get('/top-channels', userStatsController.getTopChannels);

module.exports = router;