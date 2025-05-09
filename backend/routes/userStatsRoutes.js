const express = require('express');
const router = express.Router();

const verifySignature = require('../middleware/checkAuth');
const userStatsController = require('../controllers/userStatsController');

router.use(verifySignature); // Apply the authentication middleware to all routes

router.post('/add', userStatsController.addOrUpdateUserStats);
router.post('/process-messages', userStatsController.processUserMessages);
router.delete('/delete-user/:userId', userStatsController.deleteUserData); 

router.get('/stats', userStatsController.getUserStats);
router.get('/top-channels', userStatsController.getTopChannels);

module.exports = router;