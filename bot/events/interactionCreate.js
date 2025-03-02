const { MessageFlags } = require('discord.js');
const updateUserConsent = require('../utils/updateUserConsent');
const getUserConsent = require('../utils/getUserConsent');

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
                // Check if the user has already opted in for data collection
                if (getUserConsent(interaction.user.id)) {
                    await interaction.reply({ content: '✅ **You have already opted in to data collection.**', flags: MessageFlags.Ephemeral });
                    return;
                }
                else {
                    // User has opted in for data collection
                    await interaction.reply({ content: '✅ **You have opted in to data collection.** You can withdraw your consent at any time by using /opt-out.', flags: MessageFlags.Ephemeral });
                    // Store user consent in a database.
                    updateUserConsent(interaction.user.id, true);
                    console.log(`User ${interaction.user.tag} has opted in to data collection.`);
                }
            } else if (interaction.customId === 'optin_reject') {
                await interaction.reply({ content: '❌ You have declined data collection.', flags: MessageFlags.Ephemeral });

                // No concent, no data, so no need to store anything
                console.log(`User ${interaction.user.tag} has declined data collection.`);

            } else if (interaction.customId === 'optout_confirm') {

                // Logic to flag the user to be deleted from the data collection (opt-out)
                // Check if the user has already opted out
                if (!getUserConsent(interaction.user.id)) {
                    await interaction.reply({
                        content: `You have already opted out of data collection. If you have changed your mind, you can opt back in at any time using \`/opt-in\`.`,
                        flags: MessageFlags.Ephemeral
                    });
                    // Consent found so let's update the user consent to false
                } else {
                    updateUserConsent(interaction.user.id, false);
                    console.log(`User ${interaction.user.tag} has opted out of data collection.`);

                    await interaction.reply({
                        content: `You have successfully opted out of data collection.Your data will be deleted shortly. If you change your mind, you can opt back in at any time using \`/opt-in\` \n\n**Note:** _Your data may still be stored in backups for a limited time._`,
                        flags: MessageFlags.Ephemeral
                    });
                }


            } else if (interaction.customId === 'optout_cancel') {

                // Cancel the opt-out action no action needed
                console.log(`User ${interaction.user.tag} has cancelled the opt - out action.`);

                await interaction.reply({
                    content: `Opt - out cancelled.Your data will continue to be collected.`,
                    flags: MessageFlags.Ephemeral
                });
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