const router = require('express').Router();
const controller = require('../controllers/adminAuthController');
const { requireAdmin, requireCsrf } = require('../middleware/adminAuth');

router.post('/login', controller.login);
router.get('/me', requireAdmin, controller.me);
router.post('/logout', requireAdmin, requireCsrf, controller.logout);

module.exports = router;
