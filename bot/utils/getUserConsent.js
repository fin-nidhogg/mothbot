const axios = require('./axiosInstance'); // Import the axios instance with Chrysalis API-specific headers
const config = require('../config'); // Import the config file

/**
 * Retrieves the user's consent status from the API.
 * Sends a GET request to the API to check whether the user has opted in or out of data collection.
 *
 * @param {string} userId - The ID of the user whose consent status is being retrieved.
 * @returns {Promise<boolean>} - Resolves to `true` if the user has opted in, `false` if opted out, or `false` if an error occurs.
 */
async function getUserConsent(userId) {
    try {
        const response = await axios.get(`${config.apiUrl}/user-consent/${userId}`);
        if (response.status !== 200) {
            console.error('Error getting consent:', response.statusText);
            return false;
        } else {
            return response.data.consent;
        }
    } catch (error) {
        console.error('Error getting consent:', error.message);
        return false;
    }
}

module.exports = getUserConsent;