const mongoose = require('mongoose');

const embedFieldSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 256 },
    value: { type: String, required: true, maxlength: 1024 },
    inline: { type: Boolean, default: false },
}, { _id: false });

const embedSchema = new mongoose.Schema({
    authorName: { type: String, maxlength: 256 },
    authorIconUrl: String,
    authorUrl: String,
    title: { type: String, maxlength: 256 },
    description: { type: String, maxlength: 4096 },
    url: String,
    color: { type: Number, min: 0, max: 0xFFFFFF },
    thumbnailUrl: String,
    imageUrl: String,
    footer: { type: String, maxlength: 2048 },
    footerIconUrl: String,
    fields: { type: [embedFieldSchema], default: undefined },
}, { _id: false });

const hasText = value => typeof value === 'string' && value.trim().length > 0;
const validHttpUrl = value => {
    if (!value) return true;
    try { return ['http:', 'https:'].includes(new URL(value).protocol); }
    catch { return false; }
};

const embedUrlKeys = ['url', 'imageUrl', 'thumbnailUrl', 'footerIconUrl', 'authorIconUrl', 'authorUrl'];

function normalizeEmbed(embed) {
    if (!embed || typeof embed !== 'object') return embed;
    const normalized = { ...embed };
    for (const key of embedUrlKeys) {
        if (typeof normalized[key] === 'string') normalized[key] = normalized[key].trim();
        if (!normalized[key]) delete normalized[key];
    }
    if (!hasText(normalized.authorName)) {
        delete normalized.authorIconUrl;
        delete normalized.authorUrl;
    }
    if (!hasText(normalized.footer)) delete normalized.footerIconUrl;
    return normalized;
}

function validateMessageContent(value) {
    const embed = value.embed;
    const hasEmbed = embed && (
        hasText(embed.authorName) || hasText(embed.title) || hasText(embed.description) || hasText(embed.imageUrl)
        || hasText(embed.thumbnailUrl) || hasText(embed.footer) || embed.fields?.length
    );
    if (!hasText(value.content) && !hasEmbed) return 'Message must contain text or an embed.';
    if ((value.content || '').length > 2000) return 'Message content exceeds Discord\'s 2,000 character limit.';
    for (const key of embedUrlKeys) {
        if (embed?.[key] && !validHttpUrl(embed[key])) {
            return `Invalid embed ${key}. Only HTTP and HTTPS URLs are allowed.`;
        }
    }
    if (embed?.fields?.length > 25) return 'An embed can contain at most 25 fields.';
    return null;
}

module.exports = { embedSchema, normalizeEmbed, validateMessageContent };
