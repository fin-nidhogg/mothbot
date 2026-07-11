const router = require('express').Router();
const scheduledMessages = require('../controllers/scheduledMessageController');
const directory = require('../controllers/discordDirectoryController');

router.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        console.log('[admin audit]', req.adminUser.username, req.method, req.originalUrl, '->', res.statusCode, '(' + (Date.now() - startedAt) + ' ms)');
    });
    next();
});
router.get('/', scheduledMessages.list);
router.post('/', scheduledMessages.create);
router.get('/directory', directory.get);
router.get('/:id', scheduledMessages.get);
router.put('/:id', scheduledMessages.update);
router.delete('/:id', scheduledMessages.remove);

module.exports = router;
