//////////////////////////////////////
// Imports section
//////////////////////////////////////

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, Partials } = require('discord.js');
const axios = require('axios');
const { logCommand } = require('./logger');

// Load environment variables depending on the environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: envFile });

/* Really ugly way to fetch initial messages.. should be refactored in future. You know what i mean... 
Run only once for initial db population and comment out. 
Also remember comment out the function call from line 92 */

// const { handleFetchMessages } = require('./fetchmessages');

//////////////////////////////////////
// Client section
//////////////////////////////////////

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});

////////////////////////////////////////////////////////////////////
// Dynamically read all command files from the commands directory
////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////
// When the client is ready, run this code (only once).
////////////////////////////////////////////////////////////////////

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    console.log(`Bot is using API: ${process.env.API_URL}:${process.env.API_PORT}`);
});

////////////////////////////////////////////////////////////////////
// General functions section ie. logger
////////////////////////////////////////////////////////////////////

// Function to create a new messagelog entry in the database
// This is invoked every time a message is received via the messageCreate event

// Function to send a POST request to the bots own db API
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

// Function to make AI Horde requests
async function generateWithHorde(prompt) {
    try {
        // Initial request to generate text
        const initialResponse = await axios.post("https://stablehorde.net/api/v2/generate/text/async", {
            prompt: prompt,
            params: {
                "max_context_length": 200,
                "max_length": 200,
		"frmttriminc": true,
                "temperature": 1,
		"top_p": 0.9,
		"rep_pen": 1.2
            }
        }, {
            headers: { "apikey": process.env.HORDE_API_KEY }
        });

        // For debugging
        console.log('AI Horde initial response:', initialResponse.data);

        const requestId = initialResponse.data.id;

        // Polling for the result
        let resultResponse;
        while (true) {
            resultResponse = await axios.get(`https://stablehorde.net/api/v2/generate/text/status/${requestId}`, {
                headers: { "apikey": process.env.HORDE_API_KEY }
            });

            // For debugging
            console.log('AI Horde polling response:', resultResponse.data);

            if (resultResponse.data.generations && resultResponse.data.generations.length > 0) {
                break;
            }

            // Wait for a short period before polling again
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        return resultResponse.data.generations[0].text || `Ah, a mysterious DM appears...\nUnfortunately, I do not possess the means to converse here.\nAs the wise say, *'The stars only align when we gather together.'*\n\nThis message, however, has been recorded in the logs, as a reminder from the past to the future.\nBeware, for all messages may one day reveal their secrets.`;
    } catch (error) {
        console.error("Error in AI Horde request:", error);
        return "Something went critically wrong 🤔";
    }
}

////////////////////////////////////////////////////////////////////
// Event listeners section
////////////////////////////////////////////////////////////////////

// Listen and log messages to mongodb
client.on('messageCreate', async message => {
    console.log(`Received message: ${message.content} from ${message.author.tag}`);

    // if the message is a DM and Horde is enabled, log it and reply with a generated message, else reply with a default message
    if (!message.guild && !message.author.bot) {
        const authorName = message.author.nickname || message.author.username;
        const replyMessage = await generateWithHorde("Respond shortly to this given message with a slight mystical humor: " + message.content);
        console.log(`DM Received from ${message.author.tag}: ${message.content}`);
        logCommand('DM from', authorName, { message: message.content });

        // Check if horde is enabled in the environment variabless and reply accordingly
        if (process.env.HORDE_ENABLED === 'true') {
            message.reply(replyMessage);
        } else {
            try {
                await message.reply(`Ah, a mysterious DM appears...\nUnfortunately, I do not possess the means to converse here.\nAs the wise say, *'The stars only align when we gather together.'*\n\nThis message, however, has been recorded in the logs, as a reminder from the past to the future.\nBeware, for all messages may one day reveal their secrets.`);
            } catch (error) {
                console.error('Error sending DM reply:', error);
            }
        }

    } else {
        // Prevent the bot from responding and counting its own messages
        if (message.author.bot) return;

        // Do not use this in production. This is  only for initial db population
        /* if (message.content === '!fetchmessages') {
            await message.reply('Reading whole message history...');
            await handleFetchMessages(message);
            await message.reply('Message history reguested, starting to store messages...\nThis may take a while depending on the amount of messages.');
        } */

        // Extract fields and Log the message to the database
        const guildId = message.guildId;
        const channelId = message.channelId;
        const channelName = message.channel.name;
        const userId = message.author.id;
        const username = message.author.username;
        const nickname = message.member ? message.member.displayName : null;
        sendPostRequest(guildId, channelId, channelName, userId, username, nickname);
    }
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
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isAutocomplete()) return;

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'username') {
        // Check if the focused option value is empty
        if (!focusedOption.value) {
            // Respond with an empty array or a default set of choices
            return interaction.respond([]);
        }

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

        // Ensure choices are correctly formatted and limit to 25
        const validChoices = filtered.slice(0, 25).map(choice => ({
            name: choice.name.toString(),
            value: choice.value.toString()
        }));

        await interaction.respond(validChoices);
    }
});

// Log in to Discord with client's token
client.login(process.env.APP_TOKEN); 
