const { SlashCommandBuilder, MessageFlags, EntryPointCommandHandlerType } = require('discord.js');
const axios = require('axios');
const { startSession } = require('../../../backend/models/user_stats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('useractivity')
        .setDescription('Provides activity information about the user.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('he user to check activity for.')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('start')
                .setDescription('Earliest date to include (YYYYMMDD).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('end')
                .setDescription('Latest date to include (YYYYMMDD).')
                .setRequired(false)),

    async execute(interaction) {
        const username = interaction.options.getString('username');
        const start = interaction.options.getString('start');
        const end = interaction.options.getString('end');

        // Try to fetch user activity from the backend
        try {

            const response = await axios.get(`http://localhost:6969/top-channels/`, {
                params: {
                    username: username,
                    start: start,
                    end: end,
                },
            });
            const userActivity = response.data;
            // Log the response for debugging
            //console.log('User activity:', userActivity);

            // API Should handle empty responses and return a "No user activity found" message, but we'll check here just in case
            if (userActivity.length === 0) {
                return interaction.reply('No user activity found');
            }

            // Format response for nice display in Discord and send it to the user
            const activityMessage = userActivity.map((channel, index) => {
                return `${index + 1}. Channel: ${channel.channelName}  |  Messages: ${channel.messageCount}`;
            }).join('\n');

            // Send the message to the user as an ephemeral message
            return interaction.reply({ content: `User activity for ${username}:\n${activityMessage}`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return interaction.reply({ content: 'No user activity found', flags: MessageFlags.Ephemeral });
            }
            console.error('Error fetching user activity:', error.response.data.message);
            return interaction.reply({ content: 'Internal server error', flags: MessageFlags.Ephemeral });
        }
    },
};