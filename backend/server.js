const express = require('express');
const moment = require('moment');
const UserStats = require('./models/user_stats');
const app = express();
const helmet = require('helmet');

// Require the database connection file
const dbConnection = require('./dbConnection');


// Add helmet middleware to secure the Express app
app.use(helmet());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Route for adding new document or updating existing one
app.post('/add', async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        // Expected structure of req.body:
        // {
        //   guildId: string,
        //   channelId: string,
        //   channelName: string,
        //   userId: string,
        //   username: string,
        //   nickname: string,
        // }

        // Deconstruct the request body and create a new document or update an existing one
        const { guildId, channelId, channelName, userId, username, nickname } = req.body;

        // Get the current date in 'YYYYMMDD' format for easier searches since full date is created by default in the model
        const dateString = moment().format('YYYYMMDD');

        // Find and update the document if it exists, otherwise create a new one
        const updatedStats = await UserStats.findOneAndUpdate(
            {
                guildId,
                channelId,
                channelName,
                userId,
                username,
                nickname,
                dateString,
            }, // Search criteria
            {
                $inc: { messageCount: 1 }, // If existing document found, increment messageCount by 1
            },
            {
                new: true, // Return the updated document
                upsert: true, // Create new document if it doesn't exist
                setDefaultsOnInsert: true, // set default values
            }
        );

        // send response to client after succesfully updating or creating the document
        res.status(200).json({
            message: 'Document updated or created successfully',
            data: updatedStats,
        });

    } catch (err) {
        console.error('Error updating stats:', err);
        res.status(500).send('Internal server error');
    }
});

// Start server
app.listen(process.env.SERVER_PORT, () => {
    console.log(`Server is running on port ${process.env.SERVER_PORT}`);
});
