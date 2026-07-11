const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 64 },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', schema);
