const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmbed, validateMessageContent } = require('../models/messageContent');
const MessageTemplate = require('../models/MessageTemplate');
const ScheduledMessage = require('../models/ScheduledMessage');

test('accepts text and embed message content', () => {
    assert.equal(validateMessageContent({ content: 'Hello' }), null);
    assert.equal(validateMessageContent({ content: '', embed: { title: 'Notice' } }), null);
});

test('normalizes empty and dependent embed URLs', () => {
    assert.deepEqual(normalizeEmbed({
        authorName: '', authorIconUrl: ' https://example.com/author.png ', authorUrl: ' ',
        imageUrl: ' ', thumbnailUrl: '', footer: '', footerIconUrl: 'https://example.com/footer.png',
    }), { authorName: '', footer: '' });
    assert.deepEqual(normalizeEmbed({
        authorName: 'Council', authorIconUrl: ' https://example.com/author.png ',
        imageUrl: ' https://example.com/image.png ', thumbnailUrl: 'https://example.com/thumb.png',
    }), {
        authorName: 'Council', authorIconUrl: 'https://example.com/author.png',
        imageUrl: 'https://example.com/image.png', thumbnailUrl: 'https://example.com/thumb.png',
    });
});

test('rejects empty content and unsafe embed URLs', () => {
    assert.equal(validateMessageContent({ content: '  ' }), 'Message must contain text or an embed.');
    assert.match(
        validateMessageContent({ content: '', embed: { imageUrl: 'javascript:alert(1)' } }),
        /Only HTTP and HTTPS/,
    );
});

test('rejects Discord content and field limits', () => {
    assert.match(validateMessageContent({ content: 'x'.repeat(2001) }), /2,000/);
    assert.match(
        validateMessageContent({
            embed: {
                fields: Array.from({ length: 26 }, (_, index) => ({ name: String(index), value: 'value' })),
            },
        }),
        /at most 25/,
    );
});

test('template and scheduled message schemas preserve snapshot metadata', () => {
    assert.ok(MessageTemplate.schema.path('defaultChannelId'));
    assert.ok(MessageTemplate.schema.path('status'));
    assert.ok(ScheduledMessage.schema.path('sourceTemplateId'));
    assert.ok(ScheduledMessage.schema.path('sourceTemplateVersion'));
    assert.ok(MessageTemplate.schema.path('embed.footerIconUrl'));
    assert.ok(MessageTemplate.schema.path('embed.authorName'));
});
