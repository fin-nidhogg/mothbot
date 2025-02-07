const axios = require('axios');
const config = require('../config');

async function updateConsent(userId, consent) {
    try {
        const response = await axios.post(`${config.apiUrl}:${config.apiPort}/consent`, {
            userId,
            consent
        });

        console.log(response.data);
    } catch (error) {
        console.error('Error updating consent:', error);
    }
}

module.exports = updateConsent;