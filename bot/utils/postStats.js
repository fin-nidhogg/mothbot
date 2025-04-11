const axios = require('./axiosInstance'); // import the axios instance with chrysalis API specific headers
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
        console.log('Bot - Data sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Bot - Error sending data:', error);
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
        console.log('Bot - General stats sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Bot - Error sending general stats:', error);
    }
}

module.exports = {
    postUserdata,
    postGeneralStats
};