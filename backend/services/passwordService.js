const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const KEY_LENGTH = 64;

async function hashPassword(password) {
    if (typeof password !== 'string' || password.length < 12) throw new Error('Password must be at least 12 characters.');
    if (password.length > 256) throw new Error('Password is too long.');
    const salt = crypto.randomBytes(16);
    const derived = await scrypt(password, salt, KEY_LENGTH);
    return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
    try {
        const [algorithm, saltHex, hashHex] = String(stored).split(':');
        if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
        const expected = Buffer.from(hashHex, 'hex');
        const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
        return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

module.exports = { hashPassword, verifyPassword };
