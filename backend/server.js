const express = require('express');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

if (process.env.NODE_ENV === 'production' && !process.env.SECRET_KEY) {
    throw new Error('Missing production SECRET_KEY.');
}
if (process.env.TRUST_PROXY && (!Number.isInteger(Number(process.env.TRUST_PROXY)) || Number(process.env.TRUST_PROXY) < 1)) {
    throw new Error('TRUST_PROXY must be a positive proxy-hop count, for example 1.');
}

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
require('./dbConnection');

app.disable('x-powered-by');
app.use(helmet({
    strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            formAction: ["'self'"],
        },
    },
}));
app.use(express.json({
    limit: '100kb',
    verify: (req, res, buffer) => { req.rawBody = buffer.toString('utf8'); },
}));
app.use(express.static(path.join(__dirname, 'public')));

const userStatsRoutes = require('./routes/userStatsRoutes');
const userConsentRoutes = require('./routes/userConsentRoutes');
const generalStatsRoutes = require('./routes/generalStatsRoutes');
const scheduledMessageRoutes = require('./routes/scheduledMessageRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminScheduledMessageRoutes = require('./routes/adminScheduledMessageRoutes');
const {
    loadAdminSession,
    requireAdmin,
    requireAdminPage,
    redirectAuthenticated,
    requireCsrf,
} = require('./middleware/adminAuth');

app.use('/user-stats', userStatsRoutes);
app.use('/user-consent', userConsentRoutes);
app.use('/general-stats', generalStatsRoutes);
app.use('/scheduled-messages', scheduledMessageRoutes);

const adminFiles = {
    'styles.css': 'styles.css',
    'app.js': 'app.js',
    'login.css': 'login.css',
    'login.js': 'login.js',
};
app.get('/admin-assets/:file', (req, res, next) => {
    const file = adminFiles[req.params.file];
    if (!file) return next();
    res.set('Cache-Control', 'public, max-age=3600');
    res.sendFile(path.join(__dirname, 'admin-public', file));
});

app.use('/admin-api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/admin-api/auth', loadAdminSession, adminAuthRoutes);
app.use('/admin-api/scheduled-messages', loadAdminSession, requireAdmin, requireCsrf, adminScheduledMessageRoutes);

app.get('/admin/login', loadAdminSession, redirectAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'admin-public', 'login.html'));
});
app.get(['/admin', '/admin/'], loadAdminSession, (req, res) => {
    res.redirect(req.adminUser ? '/admin/scheduled-messages/' : '/admin/login');
});
app.get(['/admin/scheduled-messages', '/admin/scheduled-messages/'], loadAdminSession, requireAdminPage, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'admin-public', 'index.html'));
});

app.use('/admin-api', (req, res) => res.status(404).json({ error: 'Admin API route not found.' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'fallback.html'));
});

app.use((error, req, res, next) => {
    console.error('Unhandled request error:', { method: req.method, path: req.originalUrl, type: error.type || 'internal', message: error.message });
    if (res.headersSent) return next(error);
    res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({ error: error.type === 'entity.parse.failed' ? 'Invalid JSON body.' : 'Internal server error.' });
});

const PORT = process.env.SERVER_PORT || 9696;
const HOST = process.env.SERVER_HOST || 'localhost';
app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});
