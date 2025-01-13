const express = require('express');
const UserStats = require('./models/user_stats');
const app = express();
const helmet = require('helmet');
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
        //   date: string
        // }

        // Deconstruct the request body and create a new document or update an existing one
        const { guildId, channelId, channelName, userId, username, nickname, date } = req.body;
        const updatedStats = await UserStats.findOneAndUpdate(
            {
                guildId,
                channelId,
                channelName,
                userId,
                username,
                nickname,
                date
            }, // Search criteria
            {
                $inc: { messageCount: 1 }, // Increment messageCount by 1
            },
            {
                new: true, // Return the updated document
                upsert: true, // Create new document if it doesn't exist
                setDefaultsOnInsert: true, // set default values
            }
        );

    } catch (err) {
        console.error('Error updating stats:', err);
        res.status(500).send('Internal server error');
    }
});

// Start server
const PORT = process.env.SERVER_PORT || 6969;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
