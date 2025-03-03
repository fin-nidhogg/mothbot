const moment = require('moment');
const UserStats = require('../models/user_stats');

// Controller function to add or update user stats
exports.addOrUpdateUserStats = async (req, res) => {
    try {
        // Check if the request body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const { guildId, channelId, channelName, userId, username, nickname } = req.body;
        const dateString = moment().format('YYYYMMDD');

        // Find and update the user stats document, or create a new one if it doesn't exist
        const updatedStats = await UserStats.findOneAndUpdate(
            { guildId, channelId, channelName, userId, username, nickname, dateString },
            { $inc: { messageCount: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Respond with the updated or created document
        res.status(200).json({ message: 'Document updated or created successfully', data: updatedStats });
    } catch (err) {
        console.error('Error updating stats:', err);
        res.status(500).send('Internal server error');
    }
};

// Controller function to get user stats
exports.getUserStats = async (req, res) => {
    const { username, userid: userId, start, end } = req.query;

    // Build the query to find user stats by username or userId
    const query = { $or: [{ username }, { userId }] };

    // Add date range to the query if start and end dates are provided
    if (start && end) {
        const startDate = moment(start, 'YYYYMMDD').startOf('day').toDate();
        const endDate = moment(end, 'YYYYMMDD').endOf('day').toDate();
        query.date = { $gte: startDate, $lte: endDate };
    }

    try {
        // Find user stats based on the query
        const userActivity = await UserStats.find(query);
        if (userActivity.length === 0) {
            return res.status(404).json({ message: 'No user activity found' });
        }
        // Respond with the user stats
        res.status(200).json(userActivity);
    } catch (err) {
        console.error('Error fetching user activity:', err);
        res.status(500).send('Internal server error');
    }
};

// Controller function to get top channels for a user
exports.getTopChannels = async (req, res) => {
    const { username, userid: userId, start, end } = req.query;

    // Build the query to find user stats by username or userId
    const query = { $or: [{ username }, { userId }] };

    // Add date range to the query if start or end dates are provided
    if (start || end) {
        const startDate = start ? moment(start, 'YYYYMMDD').startOf('day').toDate() : new Date(0);
        const endDate = end ? moment(end, 'YYYYMMDD').endOf('day').toDate() : moment().endOf('day').toDate();
        if (!isNaN(startDate) && !isNaN(endDate)) {
            query.date = { $gte: startDate, $lte: endDate };
        } else {
            return res.status(400).json({ message: 'Invalid date format' });
        }
    }

    try {
        // Aggregate total message count for the user
        const totalMessageCountResult = await UserStats.aggregate([
            { $match: query },
            { $group: { _id: null, totalMessageCount: { $sum: "$messageCount" } } },
            { $project: { _id: 0, totalMessageCount: 1 } }
        ]);

        const totalMessageCount = totalMessageCountResult.length > 0 ? totalMessageCountResult[0].totalMessageCount : 0;

        // Aggregate top channels for the user
        const userActivity = await UserStats.aggregate([
            { $match: query },
            { $group: { _id: { channelId: "$channelId", channelName: "$channelName" }, messageCount: { $sum: "$messageCount" } } },
            { $sort: { messageCount: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, channelName: "$_id.channelName", messageCount: 1 } }
        ]);

        if (userActivity.length === 0) {
            return res.status(404).json({ message: 'No user activity found' });
        }

        // Respond with the total message count and top channels
        res.status(200).json({ totalMessageCount, topChannels: userActivity });
    } catch (err) {
        console.error('Error fetching user activity:', err);
        res.status(500).send('Internal server error');
    }
};