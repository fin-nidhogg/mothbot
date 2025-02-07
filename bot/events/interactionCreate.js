const { MessageFlags } = require('discord.js');

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
                await interaction.reply({ content: '✅ **You have opted in to data collection.** You can withdraw your consent at any time by using /opt-out.', ephemeral: true });

                // Store user consent in a database or memory (implement your own logic here)
                console.log(`User ${interaction.user.tag} has opted in to data collection.`);

            } else if (interaction.customId === 'optin_reject') {
                await interaction.reply({ content: '❌ You have declined data collection.', ephemeral: true });

                // Implement logic to ensure data isn't stored for this user
                console.log(`User ${interaction.user.tag} has declined data collection.`);

            } else if (interaction.customId === 'optout_confirm') {
                // Logic to remove the user from the data collection (opt-out)
                // Add any necessary code to delete the user's data or update the system.

                console.log(`User ${interaction.user.tag} has opted out of data collection.`);

                await interaction.reply({
                    content: `You have successfully opted out of data collection. Your data will be deleted.`,
                    ephemeral: true
                });
            } else if (interaction.customId === 'optout_cancel') {
                // Cancel the opt-out action
                console.log(`User ${interaction.user.tag} has cancelled the opt-out action.`);

                await interaction.reply({
                    content: `Opt-out cancelled. Your data will continue to be collected.`,
                    ephemeral: true
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