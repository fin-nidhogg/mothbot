const mongoose = require('mongoose');

const embedField = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 256 },
    value: { type: String, required: true, maxlength: 1024 },
    inline: { type: Boolean, default: false },
}, { _id: false });

const embed = new mongoose.Schema({
    title: { type: String, maxlength: 256 },
    description: { type: String, maxlength: 4096 },
    url: String,
    color: { type: Number, min: 0, max: 0xFFFFFF },
    thumbnailUrl: String,
    imageUrl: String,
    footer: { type: String, maxlength: 2048 },
    fields: { type: [embedField], default: undefined },
}, { _id: false });

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
    embed: { type: embed, default: undefined },
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
