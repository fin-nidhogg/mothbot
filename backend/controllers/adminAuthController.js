const crypto = require('crypto');
const AdminUser = require('../models/AdminUser');
const AdminSession = require('../models/AdminSession');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const dummyPasswordHash = hashPassword('not-a-real-password-value');
const { COOKIE_NAME, tokenHash } = require('../middleware/adminAuth');

const attempts = new Map();
const passwordChangeAttempts = new Map();
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
function passwordChangeKey(req) {
    return `${req.adminUser._id}:${clientIp(req)}`;
}
function blockedAttempt(store, key) {
    const now = Date.now();
    const record = store.get(key);
    if (!record || now - record.startedAt > WINDOW_MS) {
        store.set(key, { count: 0, startedAt: now });
        return false;
    }
    return record.count >= MAX_ATTEMPTS;
}
function recordFailedAttempt(store, key) {
    const record = store.get(key) || { count: 0, startedAt: Date.now() };
    record.count += 1;
    store.set(key, record);
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
exports.changePassword = async (req, res) => {
    const key = passwordChangeKey(req);
    if (blockedAttempt(passwordChangeAttempts, key)) {
        return res.status(429).json({ error: 'Too many password attempts. Try again later.' });
    }

    const body = req.body || {};
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const newPasswordConfirmation = typeof body.newPasswordConfirmation === 'string' ? body.newPasswordConfirmation : '';
    if (!currentPassword || currentPassword.length > 256) {
        recordFailedAttempt(passwordChangeAttempts, key);
        return res.status(400).json({ error: 'Current password is required.' });
    }
    if (newPassword !== newPasswordConfirmation) {
        return res.status(400).json({ error: 'New passwords do not match.' });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'New password must be different from the current password.' });
    }
    try {
        const currentPasswordMatches = await verifyPassword(currentPassword, req.adminUser.passwordHash);
        if (!currentPasswordMatches) {
            recordFailedAttempt(passwordChangeAttempts, key);
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }
        req.adminUser.passwordHash = await hashPassword(newPassword);
        await req.adminUser.save();
        await AdminSession.deleteMany({ userId: req.adminUser._id, _id: { $ne: req.adminSession._id } });
        passwordChangeAttempts.delete(key);
        res.json({ message: 'Password changed successfully. Other sessions have been signed out.' });
    } catch (error) {
        if (error.message === 'Password must be at least 12 characters.' || error.message === 'Password is too long.') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Admin password change failed:', error);
        res.status(500).json({ error: 'Could not change password.' });
    }
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
