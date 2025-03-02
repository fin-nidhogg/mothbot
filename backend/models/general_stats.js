const mongoose = require('mongoose');
const moment = require('moment');

const GeneralStatsSchema = new mongoose.Schema({
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
    },
    dateString: {
        type: String,
        required: true,
        default: () => moment().format('YYYYMMDD'),
    },
    messageCount: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

const GeneralStats = mongoose.model('GeneralStats', GeneralStatsSchema);

module.exports = GeneralStats;