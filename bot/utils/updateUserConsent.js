/**
 * Updates the user's consent status in the API.
 * Sends a POST request to the API to update whether the user has opted in or out of data collection.
 *
 * @param {string} userId - The ID of the user whose consent status is being updated.
 * @param {boolean} consent - The consent status (true for opt-in, false for opt-out).
 * @returns {Promise<void>} - Resolves when the consent status is successfully updated.
 */
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