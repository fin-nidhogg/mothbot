const mongoose = require('mongoose');
const MessageTemplate = require('../models/MessageTemplate');
const DiscordDirectory = require('../models/DiscordDirectory');
const { normalizeEmbed, validateMessageContent } = require('../models/messageContent');
const { writeAdminAudit } = require('../services/adminAuditService');

const editable = ['name', 'description', 'guildId', 'defaultChannelId', 'content', 'embed'];
const payload = body => {
    const result = editable.reduce((value, key) => (
        body[key] === undefined ? value : { ...value, [key]: body[key] }
    ), {});
    if (result.embed !== undefined) result.embed = normalizeEmbed(result.embed);
    return result;
};

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function validate(value) {
    if (!value.name?.trim()) return 'Template name is required.';
    if (!value.guildId?.trim()) return 'Discord server is required.';
    const contentError = validateMessageContent(value);
    if (contentError) return contentError;

    const directory = await DiscordDirectory.findOne({ key: 'discord' }).lean();
    const guild = directory?.guilds?.find(item => item.id === value.guildId);
    if (!guild) return 'Selected Discord server is not available.';
    if (value.defaultChannelId && !guild.channels.some(channel => channel.id === value.defaultChannelId)) {
        return 'Default channel does not belong to the selected server or is unavailable.';
    }
    return null;
}

exports.list = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
        const filter = {};
        if (['active', 'archived'].includes(req.query.status)) filter.status = req.query.status;
        if (req.query.search?.trim()) filter.name = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
        const [templates, total] = await Promise.all([
            MessageTemplate.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            MessageTemplate.countDocuments(filter),
        ]);
        res.json({ templates, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (error) {
        console.error('Failed to list message templates:', error);
        res.status(500).json({ error: 'Failed to list templates.' });
    }
};

exports.get = async (req, res) => {
    try {
        const template = await MessageTemplate.findById(req.params.id).lean();
        template ? res.json({ template }) : res.status(404).json({ error: 'Template not found.' });
    } catch { res.status(400).json({ error: 'Invalid template id.' }); }
};

exports.create = async (req, res) => {
    try {
        const value = payload(req.body);
        const error = await validate(value);
        if (error) return res.status(400).json({ error });
        const template = await MessageTemplate.create({
            ...value,
            status: 'active',
            createdBy: req.adminUser._id,
            updatedBy: req.adminUser._id,
        });
        await writeAdminAudit(req, 'template.create', 'MessageTemplate', template._id, { name: template.name });
        res.status(201).json({ template });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        if (!Number.isInteger(req.body.version)) return res.status(400).json({ error: 'Template version is required.' });
        const template = await MessageTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found.' });
        if (template.status !== 'active') return res.status(409).json({ error: 'Archived templates must be restored before editing.' });
        if (template.__v !== req.body.version) {
            return res.status(409).json({ error: 'This template was changed by another admin. Reload it and try again.' });
        }
        const changes = payload(req.body);
        const error = await validate({ ...template.toObject(), ...changes });
        if (error) return res.status(400).json({ error });
        Object.assign(template, changes);
        template.updatedBy = req.adminUser._id;
        await template.save();
        await writeAdminAudit(req, 'template.update', 'MessageTemplate', template._id, { name: template.name, version: template.__v });
        res.json({ template });
    } catch (error) {
        if (error instanceof mongoose.Error.VersionError) {
            return res.status(409).json({ error: 'This template was changed by another admin. Reload it and try again.' });
        }
        res.status(400).json({ error: error.message });
    }
};

exports.duplicate = async (req, res) => {
    try {
        const source = await MessageTemplate.findOne({ _id: req.params.id, status: 'active' }).lean();
        if (!source) return res.status(404).json({ error: 'Active template not found.' });
        const template = await MessageTemplate.create({
            name: String(req.body.name || `${source.name} (copy)`).slice(0, 120),
            description: source.description,
            guildId: source.guildId,
            defaultChannelId: source.defaultChannelId,
            content: source.content,
            embed: source.embed,
            createdBy: req.adminUser._id,
            updatedBy: req.adminUser._id,
        });
        await writeAdminAudit(req, 'template.duplicate', 'MessageTemplate', template._id, { sourceId: source._id });
        res.status(201).json({ template });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

async function setStatus(req, res, status) {
    try {
        if (!Number.isInteger(req.body.version)) return res.status(400).json({ error: 'Template version is required.' });
        const template = await MessageTemplate.findOneAndUpdate(
            { _id: req.params.id, __v: req.body.version },
            { $set: { status, updatedBy: req.adminUser._id }, $inc: { __v: 1 } },
            { new: true, runValidators: true },
        );
        if (!template) return res.status(409).json({ error: 'Template not found or it was changed by another admin.' });
        await writeAdminAudit(req, `template.${status}`, 'MessageTemplate', template._id, { name: template.name });
        res.json({ template });
    } catch (error) { res.status(400).json({ error: error.message }); }
}

exports.archive = (req, res) => setStatus(req, res, 'archived');
exports.restore = (req, res) => setStatus(req, res, 'active');
