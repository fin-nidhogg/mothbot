const ScheduledMessage = require('../models/ScheduledMessage');
const editable = ['name', 'guildId', 'channelId', 'content', 'embed', 'scheduledFor', 'recurrence'];
const payload = body => editable.reduce((result, key) => (
    body[key] === undefined ? result : { ...result, [key]: body[key] }
), {});

function invalid(value) {
    const embed = value.embed;
    const hasEmbed = embed && (embed.title || embed.description || embed.imageUrl || embed.thumbnailUrl || embed.footer || embed.fields?.length);
    if (!(value.content || '').trim() && !hasEmbed) return 'Message must contain text or an embed.';
    if (!value.scheduledFor || Number.isNaN(new Date(value.scheduledFor).getTime())) return 'Invalid scheduledFor date.';
    if (value.recurrence) {
        if (!['weekly', 'monthly'].includes(value.recurrence.frequency)) return 'Invalid recurrence frequency.';
        if (value.recurrence.frequency === 'weekly' && !value.recurrence.weekdays?.length) return 'Select at least one weekday.';
        if (value.recurrence.frequency === 'monthly' && !value.recurrence.dayOfMonth) return 'Select a day of the month.';
        if (!value.recurrence.timeZone) return 'A time zone is required for recurring messages.';
    }
}
function normalize(value) {
    if (value.recurrence) {
        value.recurrence = {
            ...value.recurrence,
            interval: Number(value.recurrence.interval) || 1,
            anchor: value.recurrence.anchor || value.scheduledFor,
        };
    }
    return value;
}

exports.list = async (req, res) => {
    try {
        const filter = req.query.status ? { status: req.query.status } : {};
        res.json({ messages: await ScheduledMessage.find(filter).sort({ scheduledFor: 1 }).limit(250).lean() });
    } catch (error) {
        console.error('Failed to list scheduled messages:', error);
        res.status(500).json({ error: 'Failed to list messages.' });
    }
};
exports.get = async (req, res) => {
    try {
        const message = await ScheduledMessage.findById(req.params.id).lean();
        message ? res.json({ message }) : res.status(404).json({ error: 'Message not found.' });
    } catch { res.status(400).json({ error: 'Invalid id.' }); }
};
exports.create = async (req, res) => {
    try {
        const value = normalize(payload(req.body));
        const error = invalid(value);
        if (error) return res.status(400).json({ error });
        res.status(201).json({ message: await ScheduledMessage.create(value) });
    } catch (error) { res.status(400).json({ error: error.message }); }
};
exports.update = async (req, res) => {
    try {
        const message = await ScheduledMessage.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found.' });
        if (message.status === 'processing') return res.status(409).json({ error: 'Message is currently processing.' });
        const changes = normalize(payload(req.body));
        const error = invalid({ ...message.toObject(), ...changes });
        if (error) return res.status(400).json({ error });
        Object.assign(message, changes);
        message.status = 'pending';
        message.sentAt = undefined;
        message.discordMessageId = undefined;
        message.lastError = undefined;
        await message.save();
        res.json({ message });
    } catch (error) { res.status(400).json({ error: error.message }); }
};
exports.remove = async (req, res) => {
    try {
        const message = await ScheduledMessage.findOneAndDelete({ _id: req.params.id, status: { $ne: 'processing' } });
        message ? res.status(204).end() : res.status(404).json({ error: 'Message not found or currently processing.' });
    } catch { res.status(400).json({ error: 'Invalid id.' }); }
};
exports.claim = async (req, res) => {
    try {
        const now = new Date();
        const message = await ScheduledMessage.findOneAndUpdate({
            scheduledFor: { $lte: now },
            $or: [{ status: 'pending' }, { status: 'processing', claimedAt: { $lt: new Date(now - 300000) } }],
        }, {
            $set: { status: 'processing', claimedAt: now, claimedBy: req.body.workerId || 'discord-bot' },
            $inc: { attempts: 1 },
        }, { new: true, sort: { scheduledFor: 1 } }).lean();
        res.json({ message: message || null });
    } catch { res.status(500).json({ error: 'Failed to claim message.' }); }
};
exports.sent = async (req, res) => {
    try {
        const current = await ScheduledMessage.findOne({ _id: req.params.id, status: 'processing' });
        if (!current) return res.status(409).json({ error: 'Message is not claimed.' });
        const now = new Date();
        current.lastSentAt = now;
        current.lastDiscordMessageId = req.body.discordMessageId;
        current.occurrenceCount += 1;
        current.attempts = 0;
        current.claimedAt = undefined;
        current.claimedBy = undefined;
        current.lastError = undefined;
        if (current.recurrence) {
            if (!req.body.nextScheduledFor) return res.status(400).json({ error: 'nextScheduledFor is required for a recurring message.' });
            const next = new Date(req.body.nextScheduledFor);
            if (Number.isNaN(next.getTime()) || next <= now) return res.status(400).json({ error: 'Invalid nextScheduledFor.' });
            current.scheduledFor = next;
            current.status = 'pending';
            current.sentAt = undefined;
            current.discordMessageId = undefined;
        } else {
            current.status = 'sent';
            current.sentAt = now;
            current.discordMessageId = req.body.discordMessageId;
        }
        await current.save();
        res.json({ message: current });
    } catch (error) { res.status(400).json({ error: error.message || 'Could not mark message sent.' }); }
};
exports.failed = async (req, res) => {
    try {
        const message = await ScheduledMessage.findOne({ _id: req.params.id, status: 'processing' });
        if (!message) return res.status(409).json({ error: 'Message is not claimed.' });
        const retry = message.attempts < 5;
        message.status = retry ? 'pending' : 'failed';
        if (retry) message.scheduledFor = new Date(Date.now() + Math.min(message.attempts * 30, 300) * 1000);
        message.lastError = String(req.body.error || 'Discord delivery failed').slice(0, 1000);
        message.claimedAt = undefined;
        message.claimedBy = undefined;
        await message.save();
        res.json({ message, retrying: retry });
    } catch { res.status(400).json({ error: 'Could not mark message failed.' }); }
};
