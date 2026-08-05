const router = require('express').Router();
const templates = require('../controllers/messageTemplateController');

router.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        console.log('[admin audit]', req.adminUser.username, req.method, req.originalUrl, '->', res.statusCode, '(' + (Date.now() - startedAt) + ' ms)');
    });
    next();
});
router.get('/', templates.list);
router.post('/', templates.create);
router.get('/:id', templates.get);
router.put('/:id', templates.update);
router.post('/:id/duplicate', templates.duplicate);
router.post('/:id/archive', templates.archive);
router.post('/:id/restore', templates.restore);

module.exports = router;
