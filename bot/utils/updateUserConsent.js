const axios = require('./axiosInstance'); // import the axios instance with chrysalis API specific headers
const config = require('../config');

async function updateUserConsent(userId, consent) {
    try {
        const response = await axios.post(`${config.apiUrl}/user-consent`, {
            userId,
            consent
        });

        console.log('Bot - Consent updated successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Bot - Error updating consent:', error);
    }
}

module.exports = updateUserConsent;