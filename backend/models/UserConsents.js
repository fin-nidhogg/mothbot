const mongoose = require('mongoose');

const userConsentSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    consent: { type: Boolean, required: true }
}, { timestamps: true }); // Adds timestamps for createdAt and updatedAt for each document

const UserConsent = mongoose.model('UserConsents', userConsentSchema);

module.exports = UserConsent;