const { MessageFlags } = require('discord.js');
const updateUserConsent = require('../utils/updateUserConsent');
const { deleteUserData } = require('../utils/deleteUserData');
const { fetchAndSendMessages } = require('../utils/fetchAndSendMessages');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                }
            }
        }

        // Handle button interactions
        else if (interaction.isButton()) {
            if (interaction.customId === 'optin_accept') {
                await interaction.deferUpdate();
                // User has opted in for data collection, send a confirmation message
                await interaction.editReply({
                    content: '\n✅  **You have opted in to data collection.**\nYou can withdraw your consent at any time by using \`/opt-out\`.',
                    components: [], // Remove buttons
                    flags: MessageFlags.Ephemeral
                });

                // Store user consent in a database.
                updateUserConsent(interaction.user.id, true);

                // Log the user's consent
                console.log(`User ${interaction.user.id} has opted in to data collection.`);

                try {
                    // Fetch and send the user's message history
                    await fetchAndSendMessages(interaction.client, interaction.user.id);
                    await interaction.followUp({
                        content: '✅ Your message history has been processed and stored.',
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (error) {
                    console.error('Error fetching messages:', error);
                    await interaction.followUp({
                        content: '❌ An error occurred while fetching your message history.',
                        flags: MessageFlags.Ephemeral,
                    });
                }

            } else if (interaction.customId === 'optin_reject') {
                await interaction.deferUpdate();

                // User has declined data collection, send a confirmation message
                await interaction.editReply({
                    content: '\n❌  **You have declined data collection.**',
                    components: [], // Remove buttons
                    flags: MessageFlags.Ephemeral
                });

                // Log the rejection
                console.log(`User ${interaction.user.id} has rejected the opt-in action.`);

            } else if (interaction.customId === 'optout_confirm') {
                await interaction.deferUpdate();

                // Update the user consent to false
                updateUserConsent(interaction.user.id, false);

                console.log(`User ${interaction.user.tag} has opted out of data collection.`);
                // Call the function to delete user data
                try {
                    await deleteUserData(interaction.user.id);
                    console.log(`User data for ${interaction.user.tag} has been deleted.`);
                } catch (error) {
                    console.error(`Failed to delete user data for ${interaction.user.tag}:`, error);
                }

                // Send a confirmation message to the user
                await interaction.editReply({
                    content: `\n✅  **You have successfully opted out of data collection.**\nYour data will be deleted shortly.\nIf you change your mind, you can opt back in at any time using \`/opt-in\` \n\n**Note:** _Your data may still be stored in backups for a limited time._`,
                    components: [], // Remove buttons
                    flags: MessageFlags.Ephemeral
                });

            } else if (interaction.customId === 'optout_cancel') {
                // User has cancelled the opt-out action, send a confirmation message
                await interaction.deferUpdate();

                await interaction.editReply({
                    content: `\n❌  **Opt-out cancelled.**\nYour data will continue to be collected.`,
                    components: [], // Remove buttons
                    flags: MessageFlags.Ephemeral
                });

                // Log the cancellation
                console.log(`User ${interaction.user.id} has cancelled the opt-out action.`);
            }
        }

        // Handle autocomplete interactions
        else if (interaction.isAutocomplete()) {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'username') {
                if (!focusedOption.value) {
                    return interaction.respond([]);
                }

                const guild = interaction.guild;
                const members = await guild.members.fetch();

                // Filter members by the focused option value and return the first 25 (the max Discord allows)
                const choices = members.map(member => ({
                    name: member.displayName.length > 25 ? member.displayName.slice(0, 22) + "..." : member.displayName,
                    value: member.user.username
                }));

                const filtered = choices.filter(choice =>
                    choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                );

                const validChoices = filtered.slice(0, 25).map(choice => ({
                    name: choice.name.toString(),
                    value: choice.value.toString()
                }));

                await interaction.respond(validChoices);
            }
        }
    },
};