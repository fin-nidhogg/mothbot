const mongoose = require('mongoose');
const { embedSchema } = require('./messageContent');

const schema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    guildId: { type: String, required: true, trim: true },
    defaultChannelId: { type: String, trim: true },
    content: { type: String, default: '', maxlength: 2000 },
    embed: { type: embedSchema, default: undefined },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
}, { timestamps: true, optimisticConcurrency: true });

schema.index({ status: 1, updatedAt: -1 });
schema.index({ guildId: 1, status: 1, name: 1 });

module.exports = mongoose.model('MessageTemplate', schema);
