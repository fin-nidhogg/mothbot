const axios = require('axios');
const config = require('../config');

async function updateUserConsent(userId, consent) {
    try {
        const response = await axios.post(`${config.apiUrl}/user-consent`, {
            userId,
            consent
        });

        console.log(response.data);
    } catch (error) {
        console.error('Error updating consent:', error);
    }
}

module.exports = updateUserConsent;