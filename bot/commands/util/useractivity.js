const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const { logCommand } = require('../../logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('useractivity')
        .setDescription('Provides activity information about the user.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Target user to check activity for.')
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
            console.log('Fetching from:', `${config.apiUrl}:${config.apiPort}/top-channels/`);
            const response = await axios.get(`${config.apiUrl}:${config.apiPort}/top-channels/`, {
                params: {
                    username: username,
                    start: start,
                    end: end,
                },
            });

            if (!response || !response.data) {
                console.error('Invalid response from backend:', response);
                return interaction.reply({ content: 'Internal server error', flags: MessageFlags.Ephemeral });
            }

            const { totalMessageCount, topChannels } = response.data;

            // Debuggaukseen, kommentoi ulos tuotannossa
            //console.log('User activity:', userActivity);

            // Get the user who requested the activity and write it to logfile  
            logCommand('useractivity', interaction.user.username, { username, start, end });

            // API Should handle empty responses and return a "No user activity found" message, but we'll check here just in case
            if (topChannels.length === 0) {
                return interaction.reply({ content: 'No user activity found', flags: MessageFlags.Ephemeral });
            }

            // Format response for nice display in Discord and send it to the user
            const topChannelsMessage = topChannels.map((channel, index) => {
                return `${index + 1}. Channel: ${channel.channelName}  |  Messages: ${channel.messageCount}`;
            }).join('\n');

            // Send the message to the user as an ephemeral message
            return interaction.reply({ content: `\nHeres some user activity stats for user: **${username}**\n\n**Total messages: ${totalMessageCount}**\n${topChannelsMessage}`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return interaction.reply({ content: 'No user activity found', flags: MessageFlags.Ephemeral });
            }
            console.error('Error fetching user activity:', error.response.data.message);
            return interaction.reply({ content: 'Internal server error', flags: MessageFlags.Ephemeral });
        }
    },
};