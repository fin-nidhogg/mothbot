const axios = require('axios');
const config = require('../config'); // Import the config file

// Function to send a POST request to the bot's own db API for user data
async function postUserdata(guildId, channelId, channelName, userId, username, nickname) {
    try {
        const response = await axios.post(`${config.apiUrl}/user-stats/add`, {
            guildId,
            channelId,
            channelName,
            userId,
            username,
            nickname,
        });
        console.log('Data sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Error sending data:', error);
    }
}

// Function to send a POST request to the bot's own db API for general stats
async function postGeneralStats(guildId, channelId, channelName) {
    try {
        const response = await axios.post(`${config.apiUrl}/general-stats/add`, {
            guildId,
            channelId,
            channelName,
        });
        console.log('General stats sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Error sending general stats:', error);
    }
}

module.exports = {
    postUserdata,
    postGeneralStats
};