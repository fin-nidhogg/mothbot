// Require the necessary modules for basic functionality
require('dotenv').config()
const { Client, Events, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// When the client is ready, run this code (only once).
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Function to send a POST request to the backend
async function sendPostRequest(guildId, channelId, channelName, userId, username, nickname, date) {

    try {
        const response = await axios.post('http://localhost:6969/add', {
            guildId,
            channelId,
            channelName,
            userId,
            username,
            nickname,
            date: date
        });
        console.log('Data sent successfully:', response.status + ' ' + response.statusText);
    } catch (error) {
        console.error('Error sending data:', error);
    }
}


// Listen and log messagecounts to mongodb
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
    const date = Date.now();

    sendPostRequest(guildId, channelId, channelName, userId, username, nickname, date);
});

// Log in to Discord with client's token
client.login(process.env.APP_TOKEN); 