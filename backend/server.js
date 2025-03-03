const express = require('express');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables from .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

// Create Express app
const app = express();

// Require the database connection file
require('./dbConnection');

// Add helmet middleware to secure the Express app
app.use(helmet());
app.use(express.json());

// Import routes
const userStatsRoutes = require('./routes/userStatsRoutes');
const userConsentRoutes = require('./routes/userConsentRoutes');
const generalStatsRoutes = require('./routes/generalStatsRoutes');

// Use routes
app.use('/user-stats', userStatsRoutes);
app.use('/user-consent', userConsentRoutes);
app.use('/general-stats', generalStatsRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Start server
const PORT = process.env.SERVER_PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});