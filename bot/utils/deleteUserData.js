const axios = require('./axiosInstance');
const config = require('../config');

/**
 * Deletes user data from the backend.
 * Sends a DELETE request to the backend API to remove all data associated with the specified user ID.
 *
 * @param {string} userId - The ID of the user whose data is to be deleted.
 * @returns {Promise<Object>} - Resolves with the response data from the API if successful.
 * @throws {Error} - Throws an error if the deletion fails.
 */
async function deleteUserData(userId) {
    try {
        const response = await axios.delete(`${config.apiUrl}/user-stats/delete-user/${userId}`);
        console.log(`Success: ${response.data.message}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting user data:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to delete user data.');
    }
}

module.exports = { deleteUserData };