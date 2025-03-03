const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const getUserConsent = require('../../utils/getUserConsent');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('opt-out')
        .setDescription('Withdraw your consent for data collection.'),

    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('optout_confirm')
                .setLabel('✅ Confirm Opt-out')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('optout_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        // Check if the user has already opted out of data collection or havn't opted in yet
        const consent = await getUserConsent(interaction.user.id);
        if (!consent) {
            await interaction.reply({
                content: `\n❌  **You have not opted in to data collection yet.**\nYou can always opt in using command: \`/opt-in\`.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        // Else open the withdraw consent dialog
        await interaction.reply({
            content: `You are about to withdraw your consent for data collection. Are you sure you want to opt-out?\n
**Data will no longer be collected**, and your existing data will be deleted. You can always opt back in later.\n
Do you want to proceed?`,
            components: [row],
            flags: MessageFlags.Ephemeral// Only the user sees this message
        });
    }
};