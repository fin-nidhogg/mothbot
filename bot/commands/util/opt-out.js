const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

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

        await interaction.reply({
            content: `You are about to withdraw your consent for data collection. Are you sure you want to opt-out?\n
**Data will no longer be collected**, and your existing data will be deleted. You can always opt back in later.\n
Do you want to proceed?`,
            components: [row],
            flags: MessageFlags.Ephemeral// Only the user sees this message
        });
    }
};