// Load environment variables based on the current environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: envFile });

// Import mongoose for MongoDB connection
const mongoose = require('mongoose');

// Connect to MongoDB using mongoose
mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authMechanism=${process.env.DB_AUTH_MECHANISM}&authSource=${process.env.DB_AUTH_SOURCE}`);

// Get the default connection
const db = mongoose.connection;

// Handle connection error's
db.on('error', (error) => {
    console.error('Error while connecting to MongoDB:', error);
});

// Inform in console when connected to MongoDB
db.once('open', () => {
    console.log('Connected to MongoDB, using database:', db.name);
});

// Inform in console when disconnected from MongoDB
db.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
});