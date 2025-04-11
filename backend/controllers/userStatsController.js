const moment = require('moment');
const UserStats = require('../models/user_stats');
const UserConsent = require('../models/UserConsents');

// Controller function to bulk process user messages
exports.processUserMessages = async (req, res) => {
    try {
        const { userId, guildId, messages } = req.body;

        // Validate request body
        if (!userId || !guildId || !messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Invalid request. Missing required fields or messages is not an array.' });
        }

        // Check if the user has given consent
        const userConsent = await UserConsent.findOne({ userId });
        if (!userConsent || !userConsent.consent) {
            return res.status(403).json({ message: 'User has not given consent for data collection.' });
        }

        // Group messages by channelId, userId, and dateString
        const groupedMessages = messages.reduce((acc, msg) => {
            // Format dateString as YYYYMMDD using moment
            const dateString = moment(msg.createdAt).format('YYYYMMDD');
            const key = `${msg.channelId}-${userId}-${dateString}`;

            if (!acc[key]) {
                acc[key] = {
                    channelId: msg.channelId,
                    guildId,
                    userId,
                    dateString,
                    channelName: msg.channelName,
                    nickname: msg.nickname,
                    username: msg.username,
                    messageCount: 0,
                };
            }

            acc[key].messageCount += 1;
            return acc;
        }, {});

        // Convert grouped messages to bulk operations
        const bulkOperations = Object.values(groupedMessages).map((group) => {
            // Ensure the date is correctly formatted using moment
            const date = moment(group.dateString, 'YYYYMMDD').toDate();

            return {
                updateOne: {
                    filter: {
                        channelId: group.channelId,
                        userId: group.userId,
                        dateString: group.dateString,
                    },
                    update: {
                        $inc: { messageCount: group.messageCount },
                        $setOnInsert: {
                            channelName: group.channelName,
                            nickname: group.nickname,
                            username: group.username,
                            guildId: group.guildId,
                            date, // Correctly formatted date
                        },
                    },
                    upsert: true,
                },
            };
        });

        // Perform bulk write operation
        const messagesCollection = await UserStats.collection;
        await messagesCollection.bulkWrite(bulkOperations);

        res.status(200).json({ message: 'Messages processed successfully.' });
    } catch (error) {
        console.error('Error processing user messages:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

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

// Controller function to delete all data related to a specific user
exports.deleteUserData = async (req, res) => {
    const { userId } = req.params;

    try {
        // Delete user stats
        const userStatsResult = await UserStats.deleteMany({ userId });
        console.log(`Deleted ${userStatsResult.deletedCount} user stats documents for user ${userId}`);

        res.status(200).json({
            message: `All data related to user ${userId} has been deleted.`,
            deletedStats: userStatsResult.deletedCount,
        });

    } catch (error) {
        console.error('Error deleting user data:', error);
        res.status(500).json({ message: 'Internal server error while deleting user data.' });
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