const axios = require('./axiosInstance');
const config = require('../config');

// This function deletes user data from the backend
// It sends a DELETE request to the backend API with the user ID

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