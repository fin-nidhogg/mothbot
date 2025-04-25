const mongoose = require('mongoose');

const dailyActiveUsersSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true }, // Date of the record
    activeUsers: { type: Number, required: true }, // Active users count
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields for auditing purposes

module.exports = mongoose.model('DailyActiveUsers', dailyActiveUsersSchema);