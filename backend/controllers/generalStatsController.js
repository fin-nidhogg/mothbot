const moment = require('moment');
const GeneralStats = require('../models/general_stats');

// Controller function to add or update general stats
exports.addOrUpdateGeneralStats = async (req, res) => {
    try {
        // Check if the request body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const { guildId, channelId, channelName } = req.body;
        const dateString = moment().format('YYYYMMDD');

        // Find and update the general stats document, or create a new one if it doesn't exist
        const updatedStats = await GeneralStats.findOneAndUpdate(
            { guildId, channelId, channelName, dateString },
            { $inc: { messageCount: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Respond with the updated or created document
        res.status(200).json({ message: 'General stats updated or created successfully', data: updatedStats });
    } catch (err) {
        console.error('Error updating general stats:', err);
        res.status(500).send('Internal server error');
    }
};