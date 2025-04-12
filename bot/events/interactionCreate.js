const { MessageFlags, flatten } = require('discord.js');
const updateUserConsent = require('../utils/updateUserConsent');
const { deleteUserData } = require('../utils/deleteUserData');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            await handleChatInputCommand(interaction);
        }
        // Handle button interactions
        else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        }
        // Handle autocomplete interactions
        else if (interaction.isAutocomplete()) {
            await handleAutocompleteInteraction(interaction);
        }
    },
};

// Handle slash commands
async function handleChatInputCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = 'There was an error while executing this command!';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
    }
}

// Handle button interactions
async function handleButtonInteraction(interaction) {
    switch (interaction.customId) {
        case 'optin_accept':
            await handleOptInAccept(interaction);
            break;
        case 'optin_reject':
            await handleOptInReject(interaction);
            break;
        case 'optout_confirm':
            await handleOptOutConfirm(interaction);
            break;
        case 'optout_cancel':
            await handleOptOutCancel(interaction);
            break;
        default:
            console.warn(`Unhandled button interaction: ${interaction.customId}`);
    }
}

// Handle "opt-in accept" button
async function handleOptInAccept(interaction) {
    await interaction.deferUpdate();

    // Store user consent
    updateUserConsent(interaction.user.id, true);
    console.log(`User ${interaction.user.id} has opted in to data collection.`);

    // Notify the user of success
    await interaction.editReply({
        content: '\n✅  **You have opted in to data collection.**\nYou can withdraw your consent at any time by using `/opt-out`.',
        components: [], // Remove buttons
        flags: MessageFlags.Ephemeral,
    });
}

// Handle "opt-in reject" button
async function handleOptInReject(interaction) {
    await interaction.deferUpdate();

    // Notify the user of rejection
    await interaction.editReply({
        content: '\n❌  **You have declined data collection.**',
        components: [], // Remove buttons
        flags: MessageFlags.Ephemeral,
    });

    console.log(`User ${interaction.user.id} has rejected the opt-in action.`);
}

// Handle "opt-out confirm" button
async function handleOptOutConfirm(interaction) {
    await interaction.deferUpdate();

    // Update user consent
    updateUserConsent(interaction.user.id, false);
    console.log(`User ${interaction.user.tag} has opted out of data collection.`);

    try {
        // Delete user data
        await deleteUserData(interaction.user.id);
        console.log(`User data for ${interaction.user.tag} has been deleted.`);
    } catch (error) {
        console.error(`Failed to delete user data for ${interaction.user.tag}:`, error);
    }

    // Notify the user of successful opt-out
    await interaction.editReply({
        content: `\n✅  **You have successfully opted out of data collection.**\nYour data will be deleted shortly.\nIf you change your mind, you can opt back in at any time using \`/opt-in\`.\n\n**Note:** _Your data may still be stored in backups for a limited time._`,
        components: [], // Remove buttons
        flags: MessageFlags.Ephemeral,
    });
}

// Handle "opt-out cancel" button
async function handleOptOutCancel(interaction) {
    await interaction.deferUpdate();

    // Notify the user of cancellation
    await interaction.editReply({
        content: `\n❌  **Opt-out cancelled.**\nYour data will continue to be collected.`,
        components: [], // Remove buttons
        flags: MessageFlags.Ephemeral,
    });

    console.log(`User ${interaction.user.id} has cancelled the opt-out action.`);
}

// Handle autocomplete interactions
async function handleAutocompleteInteraction(interaction) {
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
            value: member.user.username,
        }));

        const filtered = choices.filter(choice =>
            choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
        );

        const validChoices = filtered.slice(0, 25).map(choice => ({
            name: choice.name.toString(),
            value: choice.value.toString(),
        }));

        await interaction.respond(validChoices);
    }
}