const config = require('../../config');
const axios = require('../../utils/axiosInstance'); // Import the axios instance with chrysalis API specific headers
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('general-stats')
        .setDescription('Fetch general statistics for a given date range.')
        .addStringOption(option =>
            option.setName('start_date')
                .setDescription('The start date in YYYY-MM-DD format')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('end_date')
                .setDescription('The end date in YYYY-MM-DD format')
                .setRequired(true)),
    async execute(interaction) {
        const startDate = interaction.options.getString('start_date');
        const endDate = interaction.options.getString('end_date');

        // Validate date format
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return interaction.reply({
                content: 'Invalid date format. Please use YYYY-MM-DD.',
                ephemeral: true,
            });
        }

        try {
            // Fetch data from the backend
            console.log('Sending request to backend with params:', { start: startDate, end: endDate });
            const response = await axios.get(`${config.apiUrl}/general-stats/active-users`, {
                params: { start: startDate, end: endDate },
            });

            const { totalActiveUsers } = response.data;
            console.log('Response from backend:', response.data);
            // Reply with the statistics
            await interaction.reply({
                content: `📊 **General Statistics**\n- **Active Users**: ${totalActiveUsers}\n- **Date Range**: ${startDate} to ${endDate}`,
                flags: MessageFlags.Ephemeral
            }
            );
        } catch (error) {
            console.error('Error fetching general stats:', error);
            await interaction.reply({
                content: 'An error occurred while fetching the statistics. Please try again later.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};

// Helper function to validate date format
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return !isNaN(date.getTime());
}