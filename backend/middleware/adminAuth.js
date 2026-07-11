const crypto = require('crypto');
const AdminSession = require('../models/AdminSession');

const COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-mothbot_admin_session' : 'mothbot_admin_session';

function parseCookies(header = '') {
    return header.split(';').reduce((cookies, part) => {
        const index = part.indexOf('=');
        if (index < 0) return cookies;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (key) {
            try { cookies[key] = decodeURIComponent(value); } catch { cookies[key] = value; }
        }
        return cookies;
    }, {});
}
function tokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
function safeEqual(a, b) {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}
async function loadAdminSession(req, res, next) {
    try {
        const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
        if (!token) return next();
        const session = await AdminSession.findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } }).populate('userId');
        if (!session?.userId?.active) return next();
        req.adminSession = session;
        req.adminUser = session.userId;
        if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
            session.lastSeenAt = new Date();
            session.save().catch(error => console.error('Failed to update admin session:', error));
        }
        next();
    } catch (error) {
        console.error('Admin session lookup failed:', error);
        res.status(500).json({ error: 'Could not verify the admin session.' });
    }
}
function requireAdmin(req, res, next) {
    if (!req.adminUser) return res.status(401).json({ error: 'Authentication required.' });
    next();
}
function requireAdminPage(req, res, next) {
    if (!req.adminUser) return res.redirect('/admin/login');
    next();
}
function redirectAuthenticated(req, res, next) {
    if (req.adminUser) return res.redirect('/admin/scheduled-messages/');
    next();
}
function requireCsrf(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (!safeEqual(req.headers['x-csrf-token'], req.adminSession?.csrfToken)) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
    }
    next();
}

module.exports = {
    COOKIE_NAME,
    loadAdminSession,
    requireAdmin,
    requireAdminPage,
    redirectAuthenticated,
    requireCsrf,
    tokenHash,
};
