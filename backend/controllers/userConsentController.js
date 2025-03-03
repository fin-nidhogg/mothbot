const UserConsent = require('../models/UserConsents');

// Controller function to create or update user consent
exports.createOrUpdateConsent = async (req, res) => {
    const { userId, consent } = req.body;

    try {
        // Find and update the user consent document, or create a new one if it doesn't exist
        const updatedConsent = await UserConsent.findOneAndUpdate(
            { userId },
            { consent },
            { new: true, upsert: true }
        );
        // Respond with the updated or created consent information
        res.json({ message: `Consent information updated for user ${userId}`, consent: updatedConsent.consent });
    } catch (error) {
        console.error('Error updating consent information:', error);
        res.status(500).json({ error: 'Failed to update consent information.' });
    }
};

// Controller function to get user consent
exports.getUserConsent = async (req, res) => {
    const { userId } = req.params;

    try {
        // Find the user consent document by userId
        const userConsent = await UserConsent.findOne({ userId });
        if (userConsent) {
            // Respond with the user consent information
            res.json({ consent: userConsent.consent });
        } else {
            // Respond with false if no consent information is found
            res.json({ consent: false });
        }
    } catch (error) {
        console.error('Error fetching user consent information:', error);
        res.status(500).json({ error: 'Failed to fetch user consent information' });
    }
};