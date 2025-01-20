//////////////////////////////////////
// Imports section
//////////////////////////////////////

require('dotenv').config()
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const axios = require('axios');

//////////////////////////////////////
// Client section
//////////////////////////////////////

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Dynamically read all command files from the commands directory

client.commands = new Collection();
const folderPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(folderPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(folderPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// When the client is ready, run this code (only once).
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

//////////////////////////////////////
// General functions section ie. logger
//////////////////////////////////////

// Function to send a POST request to the backend
async function sendPostRequest(guildId, channelId, channelName, userId, username, nickname) {

    try {
        const response = await axios.post('http://localhost:6969/add', {
            guildId,
            channelId,
            channelName,
            userId,
            username,
            nickname,
        });
        console.log('Data sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Error sending data:', error);
    }
}

//////////////////////////////////////
// Event listeners section
//////////////////////////////////////

// Listen and log messages to mongodb
client.on('messageCreate', message => {
    // Prevent the bot from responding and counting its own messages
    if (message.author.bot) return;

    console.log(`Message received from user ${message.author.id}`);
    const guildId = message.guildId;
    const channelId = message.channelId;
    const channelName = message.channel.name;
    const userId = message.author.id;
    const username = message.author.username;
    const nickname = message.member ? message.member.displayName : null;

    sendPostRequest(guildId, channelId, channelName, userId, username, nickname);
});

// Listen interactions and run the appropriate command
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
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
});


// Log in to Discord with client's token
client.login(process.env.APP_TOKEN); 