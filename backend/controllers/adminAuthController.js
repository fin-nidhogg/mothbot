const crypto = require('crypto');
const AdminUser = require('../models/AdminUser');
const AdminSession = require('../models/AdminSession');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const dummyPasswordHash = hashPassword('not-a-real-password-value');
const { COOKIE_NAME, tokenHash } = require('../middleware/adminAuth');

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientIp(req) {
    return req.ip || req.socket.remoteAddress || 'unknown';
}
function blocked(ip) {
    const now = Date.now();
    if (attempts.size > 10000) {
        for (const [key, value] of attempts) if (now - value.startedAt > WINDOW_MS) attempts.delete(key);
    }
    const record = attempts.get(ip);
    if (!record || now - record.startedAt > WINDOW_MS) {
        attempts.set(ip, { count: 0, startedAt: now });
        return false;
    }
    return record.count >= MAX_ATTEMPTS;
}
function failed(ip) {
    const record = attempts.get(ip) || { count: 0, startedAt: Date.now() };
    record.count += 1;
    attempts.set(ip, record);
}
function cookieOptions(expiresAt) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        expires: expiresAt,
    };
}

exports.login = async (req, res) => {
    const ip = clientIp(req);
    if (blocked(ip)) return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    const body = req.body || {};
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    try {
        const user = await AdminUser.findOne({ username });
        const passwordMatches = await verifyPassword(password, user?.passwordHash || await dummyPasswordHash);
        const valid = Boolean(user?.active && passwordMatches);
        if (!valid) {
            failed(ip);
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        attempts.delete(ip);
        const token = crypto.randomBytes(32).toString('base64url');
        const csrfToken = crypto.randomBytes(32).toString('base64url');
        const hours = Math.min(Math.max(Number(process.env.ADMIN_SESSION_HOURS) || 12, 1), 168);
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        await AdminSession.create({
            tokenHash: tokenHash(token),
            userId: user._id,
            csrfToken,
            expiresAt,
            ip,
            userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
        });
        user.lastLoginAt = new Date();
        await user.save();
        res.cookie(COOKIE_NAME, token, cookieOptions(expiresAt));
        res.json({ user: { username: user.username, displayName: user.displayName, role: user.role }, csrfToken });
    } catch (error) {
        console.error('Admin login failed:', error);
        res.status(500).json({ error: 'Login failed.' });
    }
};
exports.me = (req, res) => {
    res.json({
        user: { username: req.adminUser.username, displayName: req.adminUser.displayName, role: req.adminUser.role },
        csrfToken: req.adminSession.csrfToken,
        expiresAt: req.adminSession.expiresAt,
    });
};
exports.logout = async (req, res) => {
    try {
        await AdminSession.deleteOne({ _id: req.adminSession._id });
        res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Logout failed.' });
    }
};
