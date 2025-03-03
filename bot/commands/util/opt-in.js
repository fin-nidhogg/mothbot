const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const getUserConsent = require('../../utils/getUserConsent');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('opt-in')
        .setDescription('Accept or decline activity tracking.'),

    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('optin_accept')
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('optin_reject')
                .setLabel('❌ Decline')
                .setStyle(ButtonStyle.Danger)
        );

        // Check if the user has already given consent
        const consent = await getUserConsent(interaction.user.id);
        if (consent) {
            await interaction.reply({
                content: `\n✅  **You have already opted in to data collection.** \n\nPerhaps you change your mind?\nUse \`/opt-out\` to withdraw your consent.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        // Else open the consent dialog
        await interaction.reply({
            content: `\n**📢 Data Collection Notice**\n\nThis bot collects activity data on this server to provide statistics and engagement insights.\n
✅ **What data is collected?**  
- The number of messages you send per day and per channel (**not message content**)  
- The channels where messages are sent  
- Your Discord user ID, current Discord display name, and Discord username  
- When you join and leave voice channels\n
🔒 **Data Retention and Your Rights**  
- **Retention:** Data is stored for **up to 2 years**, after which it is permanently deleted.  
- **Access & Removal:** You have the right to view and delete your data:  
  - **View your data:** Use \`/mydata\` (Currently not working so email if you want to check you data).  
  - **Withdraw consent & delete your data:** Use \`/opt-out\` to remove your stored data.  
\nDo you consent to data collection?`,
            components: [row],
            flags: MessageFlags.Ephemeral // Only the user sees this message
        });
    }
};