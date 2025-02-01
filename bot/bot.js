//////////////////////////////////////
// Imports section
//////////////////////////////////////

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const axios = require('axios');

// Load environment variables depending on the environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: envFile });

/* Really ugly way to fetch initial messages, should be refactored. 
Run only once for initial db population and comment out. 
Also remember comment out the function call from line 92 */

const { handleFetchMessages } = require('./fetchmessages');

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
    console.log(`Bot is using API: ${process.env.API_URL}:${process.env.API_PORT}`);
});

//////////////////////////////////////
// General functions section ie. logger
//////////////////////////////////////

// Function to send a POST request to the backend
async function sendPostRequest(guildId, channelId, channelName, userId, username, nickname) {
    const api_url = process.env.API_URL;
    const api_port = process.env.API_PORT;
    try {
        const response = await axios.post(`${api_url}:${api_port}/add`, {
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
client.on('messageCreate', async message => {
    // Prevent the bot from responding and counting its own messages
    if (message.author.bot) return;

    // Do not use this in production, only for initial db population
         if (message.content === '!fetchmessages') {
            await message.reply('Aloitetaan viestihistorian hakeminen...');
            await handleFetchMessages(message);
            await message.reply('Viestihistoria on käsitelty ja tallennettu MongoDB:hen.');
        } 

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

// event listener for autocompleting usernames
client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'username') {
        const guild = interaction.guild;
        const members = await guild.members.fetch();

        // Map display names instead of usernames
        const choices = members.map(member => ({
            name: member.displayName.length > 25 ? member.displayName.slice(0, 22) + "..." : member.displayName, // Truncate to 25 chars
            value: member.user.username // Use username internally
        }));

        const filtered = choices.filter(choice =>
            choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
        );

        // Ensure choices are correctly formatted
        const validChoices = filtered.map(choice => ({
            name: choice.name.toString(),
            value: choice.value.toString()
        }));

        await interaction.respond(validChoices);
    }
});

// Log in to Discord with client's token
client.login(process.env.APP_TOKEN); 
