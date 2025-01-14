const mongoose = require('mongoose');
const moment = require('moment');

// Define the schema for user statistics
const userStatsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
    },
    channelId: {
        type: String,
        required: true,
    },
    channelName: {
        type: String,
        required: true,
        trim: true,
    },
    userId: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
    },
    nickname: {
        type: String,
        trim: true,
        default: '',
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    dateString: {
        type: String,
        required: true,
        default: () => moment().format('YYYYMMDD'),
    },
    messageCount: {
        type: Number,
        required: true,
        min: [0, 'Message count cannot be negative'], // Message count cannot be negative
        default: 0, // Set default value to 0
    },
});

const Stats = mongoose.model('UserStats', userStatsSchema, 'message_stats');
module.exports = Stats;