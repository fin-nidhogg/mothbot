const axios = require('axios');
const config = require('../config'); // Assuming you have a config module for environment variables

// Function to send a POST request to the bot's own db API
async function sendPostRequest(guildId, channelId, channelName, userId, username, nickname) {
    try {
        const response = await axios.post(`${config.apiUrl}:${config.apiPort}/add`, {
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

module.exports = sendPostRequest;