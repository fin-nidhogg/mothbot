const { SlashCommandBuilder, Message, MessageFlags } = require('discord.js');
const { logCommand } = require('../../logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Give some initial help to the user ie. where to find info about temple'),
    async execute(interaction) {
        logCommand('help', interaction.user.username);
        const botname = interaction.client.user.username;
        const message =
            `Hello! I am the ${config.botname}! As your humble servant, I am here to assist you with all your temple needs!
    
    Heres some links to start with:
    
    :butterfly:     **[Temple Website](https://templeofchrysalis.com/)**
    :butterfly:     **[The principle](https://templeofchrysalis.com/principles/)**
    :butterfly:     **[The Edict](https://templeofchrysalis.com/the-temple/the-edict/)**
    :butterfly:     **[Kaleidoscopes](https://templeofchrysalis.com/kaleidoscopes/)**
    :butterfly:     **[Reality shaping](https://templeofchrysalis.com/reality-shaping/)**
    :butterfly:     **[Chrysoteria](https://templeofchrysalis.com/chrysoteria/)**
    
    Don't forget to check out the <#${config.helpchannelId}> and <#${config.questionchannelId}> channels for more information!`;

        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
};