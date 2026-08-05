const mongoose = require('mongoose');
const { embedSchema } = require('./messageContent');

const recurrence = new mongoose.Schema({
    frequency: { type: String, enum: ['weekly', 'monthly'], required: true },
    interval: { type: Number, min: 1, max: 120, default: 1 },
    weekdays: [{ type: Number, min: 1, max: 7 }],
    dayOfMonth: { type: Number, min: 1, max: 31 },
    timeZone: { type: String, required: true },
    anchor: { type: Date, required: true },
}, { _id: false });

const schema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    guildId: { type: String, required: true, trim: true },
    channelId: { type: String, required: true, trim: true },
    content: { type: String, default: '', maxlength: 2000 },
    embed: { type: embedSchema, default: undefined },
    sourceTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },
    sourceTemplateName: { type: String, trim: true, maxlength: 120 },
    sourceTemplateVersion: { type: Number, min: 0 },
    scheduledFor: { type: Date, required: true },
    recurrence: { type: recurrence, default: undefined },
    status: {
        type: String,
        enum: ['pending', 'processing', 'sent', 'failed'],
        default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    occurrenceCount: { type: Number, default: 0 },
    claimedAt: Date,
    claimedBy: String,
    sentAt: Date,
    lastSentAt: Date,
    discordMessageId: String,
    lastDiscordMessageId: String,
    lastError: String,
}, { timestamps: true });

schema.index({ status: 1, scheduledFor: 1 });
module.exports = mongoose.model('ScheduledMessage', schema);
