const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    csrfToken: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastSeenAt: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
}, { timestamps: true });

module.exports = mongoose.model('AdminSession', schema);
