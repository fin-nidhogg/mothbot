const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: Number, default: 0 },
}, { _id: false });
const roleSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: Number, default: 0 },
}, { _id: false });
const memberSchema = new mongoose.Schema({
    id: { type: String, required: true },
    displayName: { type: String, required: true },
    avatarUrl: String,
}, { _id: false });
const guildSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    iconUrl: String,
    channels: { type: [channelSchema], default: [] },
    roles: { type: [roleSchema], default: [] },
    members: { type: [memberSchema], default: [] },
}, { _id: false });
const schema = new mongoose.Schema({
    key: { type: String, default: 'discord', unique: true },
    guilds: { type: [guildSchema], default: [] },
    syncedAt: { type: Date, required: true },
}, { timestamps: true });
module.exports = mongoose.model('DiscordDirectory', schema);
