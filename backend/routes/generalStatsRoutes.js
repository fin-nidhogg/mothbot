const express = require('express');
const router = express.Router();
const verifySignature = require('../middleware/checkAuth');
const ActiveUsersController = require('../controllers/ActiveUsersController');
const generalStatsController = require('../controllers/generalStatsController');

router.use(verifySignature); // Apply the authentication middleware to all routes

router.post('/add', generalStatsController.addOrUpdateGeneralStats);
router.post('/active-users', ActiveUsersController.saveDailyActiveUsers);
router.get('/active-users', ActiveUsersController.getDailyActiveUsers);

module.exports = router;