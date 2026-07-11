const DiscordDirectory = require('../models/DiscordDirectory');

exports.get = async (req, res) => {
    try {
        const directory = await DiscordDirectory.findOne({ key: 'discord' }).lean();
        res.json({ guilds: directory?.guilds || [], syncedAt: directory?.syncedAt || null });
    } catch (error) {
        console.error('Failed to read Discord directory:', error);
        res.status(500).json({ error: 'Failed to load the Discord server directory.' });
    }
};

exports.sync = async (req, res) => {
    try {
        const guilds = Array.isArray(req.body.guilds) ? req.body.guilds : null;
        if (!guilds) return res.status(400).json({ error: 'guilds must be an array.' });
        const directory = await DiscordDirectory.findOneAndUpdate(
            { key: 'discord' },
            { guilds, syncedAt: new Date() },
            { new: true, upsert: true, runValidators: true },
        );
        res.json({ syncedAt: directory.syncedAt, guildCount: directory.guilds.length });
    } catch (error) {
        console.error('Failed to sync Discord directory:', error);
        res.status(400).json({ error: error.message });
    }
};
