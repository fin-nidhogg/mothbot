const moment = require('moment');
const DailyActiveUsers = require('../models/dailyActiveUsers');

/**
 * Retrieves the total number of active users for a specific date or date range.
 * This function uses MongoDB aggregation to sum up the active user counts for the given date or date range.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} - Sends the total active user count as a JSON response.
 */
exports.getDailyActiveUsers = async (req, res) => {
    const { date, start, end } = req.query;

    try {
        // Build the match stage for the aggregation pipeline
        const matchStage = {};

        if (date) {
            // Query for a specific date
            const queryDate = moment(date, 'YYYY-MM-DD');
            if (!queryDate.isValid()) {
                return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
            }
            matchStage.date = queryDate.startOf('day').toDate();
        } else if (start || end) {
            // Query for a date range
            const startDate = start ? moment(start, 'YYYY-MM-DD').startOf('day') : moment(0); // Default to epoch if no start date
            const endDate = end ? moment(end, 'YYYY-MM-DD').endOf('day') : moment(); // Default to now if no end date

            if (!startDate.isValid() || !endDate.isValid()) {
                return res.status(400).json({ message: 'Invalid date format for start or end. Please use YYYY-MM-DD.' });
            }

            // Ensure the time range is valid
            if (startDate.isAfter(endDate)) {
                return res.status(400).json({ message: 'Start date cannot be after end date.' });
            }

            matchStage.date = { $gte: startDate.toDate(), $lte: endDate.toDate() };
        } else {
            return res.status(400).json({ message: 'Please provide either a date or a date range (start and/or end).' });
        }

        // Aggregation pipeline
        const pipeline = [
            { $match: matchStage }, // Match documents based on the query
            {
                $group: {
                    _id: null, // No grouping key, we want a single result
                    totalActiveUsers: { $max: "$activeUsers" }, // Sum the activeUsers field
                },
            },
            {
                $project: {
                    _id: 0, // Exclude the _id field
                    totalActiveUsers: 1, // Include the totalActiveUsers field
                },
            },
        ];

        // Execute the aggregation pipeline
        const result = await DailyActiveUsers.aggregate(pipeline);

        // Check if there is a result
        if (result.length === 0) {
            return res.status(404).json({ message: 'No data found for the specified date or range.' });
        }

        // Respond with the total active users
        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Error retrieving daily active users:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Saves the number of active users for a specific date.
 * This function is called by the bot to send daily active user data to the backend.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} - Sends a success or error response.
 */
exports.saveDailyActiveUsers = async (req, res) => {
    const { date, activeUsers } = req.body;

    try {
        // Validate the request body
        if (!date || activeUsers === undefined) { // Tarkista, että activeUsers ei ole undefined
            return res.status(400).json({ message: 'Missing required fields: date and activeUsers.' });
        }

        const parsedDate = moment(date, 'YYYY-MM-DD');
        if (!parsedDate.isValid()) {
            return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
        }

        // Save or update the daily active users in the database
        const result = await DailyActiveUsers.findOneAndUpdate(
            { date: parsedDate.startOf('day').toDate() },
            { activeUsers },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'Daily active users saved successfully.', data: result });
    } catch (error) {
        console.error('Error saving daily active users:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};