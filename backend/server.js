const express = require('express');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

// Create Express app
const app = express();

// Require the database connection file
require('./dbConnection');

// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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
    res.sendFile(path.join(__dirname, 'public', 'fallback.html'));
});

// Start server
const PORT = process.env.SERVER_PORT || 9696;
const HOST = process.env.SERVER_HOST || 'localhost';
app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});