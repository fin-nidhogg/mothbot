const router = require('express').Router();
const controller = require('../controllers/scheduledMessageController');
const directory = require('../controllers/discordDirectoryController');

router.use(require('../middleware/checkAuth'));
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/directory', directory.get);
router.put('/directory', directory.sync);
router.post('/claim', controller.claim);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/sent', controller.sent);
router.post('/:id/failed', controller.failed);
module.exports = router;
