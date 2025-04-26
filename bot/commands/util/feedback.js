const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createGitHubIssue } = require('../../utils/createGitHubIssue');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send a feature request or bug report to the developers.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Select the type of feedback')
                .setRequired(true)
                .addChoices(
                    { name: 'Bug Report', value: 'bug' },
                    { name: 'Feature Request', value: 'feature' },
                ))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Short title (5-10 words)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Detailed description')
                .setRequired(true)),

    async execute(interaction) {
        const type = interaction.options.getString('type');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');

        await interaction.reply({ content: '📨 Submitting your feedback...', flags: MessageFlags.Ephemeral });

        const formattedTitle = `[${type.toUpperCase()}] ${title}`;
        const formattedBody = `
**Type:** ${type === 'bug' ? 'Bug Report' : 'Feature Request'}
**Reported by:** ${interaction.user.tag} (${interaction.user.id})

**Description:**
${description}
        `.trim();

        try {
            await createGitHubIssue(formattedTitle, formattedBody);
            await interaction.followUp({ content: '✅ Your feedback has been sent to the developers!', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('[ERROR] Failed to submit feedback:', error);
            await interaction.followUp({ content: '❌ Failed to send feedback. Please try again later.', flags: MessageFlags.Ephemeral });
        }
    }
};