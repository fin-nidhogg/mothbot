const axios = require('axios');
const config = require('../config');

async function getConsent(userId) {
    try {
        const response = await axios.get(`${config.apiUrl}:${config.apiPort}/consent/${userId}`);
        if (response.status !== 200) {
            console.error('Error getting consent:', response.statusText);
            return false;
        } else {
            return response.data.consent;
        }
    } catch (error) {
        console.error('Error getting consent:', error);
    }
}

module.exports = getConsent;