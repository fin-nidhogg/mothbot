const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    actorUsername: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: String,
}, { timestamps: true });

schema.index({ createdAt: -1 });
module.exports = mongoose.model('AdminAuditLog', schema);
