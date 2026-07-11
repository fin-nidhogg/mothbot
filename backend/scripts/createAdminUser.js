const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const AdminSession = require('../models/AdminSession');
const { hashPassword } = require('../services/passwordService');

function hiddenPrompt(label) {
    if (process.env.ADMIN_PASSWORD) return Promise.resolve(process.env.ADMIN_PASSWORD);
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Interactive terminal required. Alternatively provide ADMIN_PASSWORD through a secure process environment.');
    return new Promise((resolve, reject) => {
        let value = '';
        process.stdout.write(label);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        const cleanup = () => {
            process.stdin.removeListener('data', onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();
        };
        const onData = key => {
            if (key === '\u0003') { cleanup(); reject(new Error('Cancelled.')); }
            else if (key === '\r' || key === '\n') { cleanup(); process.stdout.write('\n'); resolve(value); }
            else if (key === '\u007f' || key === '\b') {
                if (value.length) { value = value.slice(0, -1); process.stdout.write('\b \b'); }
            } else if (key >= ' ') { value += key; process.stdout.write('*'); }
        };
        process.stdin.on('data', onData);
    });
}

async function main() {
    const username = String(process.argv[2] || '').trim().toLowerCase();
    const displayName = String(process.argv[3] || username).trim();
    if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error('Usage: npm run admin:create -- username "Display Name"\nUsername must be 3-64 characters: a-z, 0-9, dot, underscore, or hyphen.');
    if (process.env.ADMIN_ACTION === "disable") {
        require("../dbConnection");
        await mongoose.connection.asPromise();
        const user = await AdminUser.findOne({ username });
        if (!user) throw new Error("Admin user not found.");
        user.active = false;
        await user.save();
        await AdminSession.deleteMany({ userId: user._id });
        console.log("Disabled admin user \"" + username + "\" and revoked existing sessions.");
        await mongoose.disconnect();
        return;
    }
    const password = await hiddenPrompt('Password (minimum 12 characters): ');
    const confirmation = process.env.ADMIN_PASSWORD ? password : await hiddenPrompt('Confirm password: ');
    if (password !== confirmation) throw new Error('Passwords do not match.');
    const passwordHash = await hashPassword(password);
    require('../dbConnection');
    await mongoose.connection.asPromise();
    const existing = await AdminUser.findOne({ username });
    if (existing) {
        existing.displayName = displayName;
        existing.passwordHash = passwordHash;
        existing.active = true;
        await existing.save();
        await AdminSession.deleteMany({ userId: existing._id });
        console.log('Updated admin user "' + username + '" and revoked existing sessions.');
    } else {
        await AdminUser.create({ username, displayName, passwordHash, role: 'admin' });
        console.log('Created admin user "' + username + '".');
    }
    await mongoose.disconnect();
}

main().catch(async error => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch {}
    process.exitCode = 1;
});
