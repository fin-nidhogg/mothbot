const axios = require('./axiosInstance'); // Import the axios instance with Chrysalis API-specific headers
const config = require('../config'); // Import the config file

/**
 * Sends user-specific data to the bot's database API.
 * This function posts user statistics, such as guild, channel, and user information.
 *
 * @param {string} guildId - The ID of the guild where the data is being collected.
 * @param {string} channelId - The ID of the channel where the data is being collected.
 * @param {string} channelName - The name of the channel where the data is being collected.
 * @param {string} userId - The ID of the user whose data is being collected.
 * @param {string} username - The username of the user whose data is being collected.
 * @param {string|null} nickname - The nickname of the user in the guild, or null if none exists.
 * @returns {Promise<void>} - Resolves when the data is successfully sent.
 */
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
        console.error('Bot - Error sending user data:', error.message);
    }
}

/**
 * Sends general channel statistics to the bot's database API.
 * This function posts general statistics, such as guild and channel information.
 *
 * @param {string} guildId - The ID of the guild where the data is being collected.
 * @param {string} channelId - The ID of the channel where the data is being collected.
 * @param {string} channelName - The name of the channel where the data is being collected.
 * @returns {Promise<void>} - Resolves when the data is successfully sent.
 */
async function postGeneralStats(guildId, channelId, channelName) {
    try {
        const response = await axios.post(`${config.apiUrl}/general-stats/add`, {
            guildId,
            channelId,
            channelName,
        });
        console.log('Bot - General stats sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Bot - Error sending general stats:', error.message);
    }
}

module.exports = {
    postUserdata,
    postGeneralStats,
};