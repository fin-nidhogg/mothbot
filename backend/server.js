const express = require('express');
const moment = require('moment');
const fs = require('fs');
const https = require('https');
const http = require('http');
const UserStats = require('./models/user_stats');
const UserConsent = require('./models/UserConsents');
const GeneralStats = require('./models/general_stats');
const helmet = require('helmet');

// Load environment variables from .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: envFile });

// Create Express app
const app = express();

// Require the database connection file
const dbConnection = require('./dbConnection');

// Add helmet middleware to secure the Express app
app.use(helmet());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Route for adding new user specific document or updating existing one
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

// Route for fetching full user activity
app.get('/stats/', async (req, res) => {
    const username = req.query.username;
    const userId = req.query.userid;
    const startDate = req.query.start;
    const endDate = req.query.end;

    // Query object
    const query = {
        $or: [
            { username: username },
            { userId: userId }
        ]
    };

    // Add date range to query if start and end dates are provided
    if (startDate && endDate) {
        const start = moment(startDate, 'YYYYMMDD').startOf('day').toDate();
        const end = moment(endDate, 'YYYYMMDD').endOf('day').toDate();
        query.date = {
            $gte: start,
            $lte: end,
        };

    }

    // Query the database
    try {
        const userActivity = await UserStats.find(query);

        if (userActivity.length === 0) {
            return res.status(404).json({ message: 'No user activity found' });
        }

        res.status(200).json(userActivity);
    } catch (err) {
        console.error('Error fetching user activity:', err);
        res.status(500).send('Internal server error');
    }
});

// Route for fetching users top channels by message count
app.get('/top-channels/', async (req, res) => {
    const username = req.query.username;
    const userId = req.query.userid;
    const startDate = req.query.start;
    const endDate = req.query.end;

    // Build the query object
    const query = {
        $or: [
            { username: username },
            { userId: userId }
        ]
    };

    // Add date range to query if startDate and/or endDate are provided
    if (startDate || endDate) {
        const start = startDate ? moment(startDate, 'YYYYMMDD').startOf('day').toDate() : new Date(0); // Oldest possible date if startDate is not provided
        const end = endDate ? moment(endDate, 'YYYYMMDD').endOf('day').toDate() : moment().endOf('day').toDate(); // Today's date if endDate is not provided

        if (!isNaN(start) && !isNaN(end)) {
            query.date = {
                $gte: start,
                $lte: end,
            };
        } else {
            return res.status(400).json({ message: 'Invalid date format' });
        }
    }

    // Debuggausta varten. Kommentoi ulos tuotannossa
    // console.log('Constructed query:', query); // Log the query

    // Query the database
    try {

        // Aggregate total message count
        const totalMessageCountResult = await UserStats.aggregate([
            { $match: query },
            { $group: { _id: null, totalMessageCount: { $sum: "$messageCount" } } },
            { $project: { _id: 0, totalMessageCount: 1 } }
        ]);

        const totalMessageCount = totalMessageCountResult.length > 0 ? totalMessageCountResult[0].totalMessageCount : 0;

        // Aggregate user message counts by channel
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

        res.status(200).json({
            totalMessageCount: totalMessageCount,
            topChannels: userActivity
        });

    } catch (err) {
        console.error('Error fetching user activity:', err);
        res.status(500).send('Internal server error');
    }
});

// POST /consent - create or update user consent document
app.post('/consent', async (req, res) => {
    const { userId, consent } = req.body;

    try {
        const updatedConsent = await UserConsent.findOneAndUpdate(
            { userId },
            { consent },
            { new: true, upsert: true } // Luo uusi asiakirja, jos sitä ei ole
        );
        res.json({ message: `Consent information updated for user ${userId}`, consent: updatedConsent.consent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update consent information.' });
    }
});

// Route for adding or updating general stats
app.post('/add-general', async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        // Expected structure of req.body:
        // {
        //   guildId: string,
        //   channelId: string,
        //   channelName: string,
        // }

        // Deconstruct the request body and create a new document or update an existing one
        const { guildId, channelId, channelName } = req.body;

        // Get the current date in 'YYYYMMDD' format for easier searches since full date is created by default in the model
        const dateString = moment().format('YYYYMMDD');

        // Find and update the document if it exists, otherwise create a new one
        const updatedStats = await GeneralStats.findOneAndUpdate(
            {
                guildId,
                channelId,
                channelName,
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

        // send response to client after successfully updating or creating the document
        res.status(200).json({
            message: 'General stats updated or created successfully',
            data: updatedStats,
        });
        console.log(updatedStats);

    } catch (err) {
        console.error('Error updating general stats:', err);
        res.status(500).send('Internal server error');
    }
});

// GET /consent/:userId - Fetch user consent status
app.get('/consent/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const userConsent = await UserConsent.findOne({ userId });
        if (userConsent) {
            res.json({
                consent: userConsent.consent
            });
        } else {
            res.json({ consent: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user consent information' });
    }
});


// Redirect HTTP to HTTPS
const httpApp = express();
httpApp.use((req, res, next) => {
    if (req.secure) {
        return next();
    }
    res.redirect(`https://${req.headers.host}${req.url}`);
});

// Start HTTP server
http.createServer(httpApp).listen(80, () => {
    console.log('HTTP server running on port 80');
});

// Conditionally start HTTPS server if USE_SSL is true
if (process.env.USE_SSL === 'true') {
    const sslOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        ca: fs.readFileSync(process.env.SSL_CA_PATH) // If you have a CA bundle
    };

    https.createServer(sslOptions, app).listen(443, () => {
        console.log('HTTPS server running on port 443');
    });
} else {
    // Start HTTP server if USE_SSL is false
    app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server is running on port ${process.env.SERVER_PORT}`);
    });
}
