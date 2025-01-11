// Require the necessary modules for basic functionality
require('dotenv').config()
const { Client, Events, GatewayIntentBits } = require('discord.js');
const messageCount = new Map();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// When the client is ready, run this code (only once).
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Listen for messages
client.on('messageCreate', message => {
    // Prevent the bot from responding to its own messages
    if (message.author.bot) return;

    // Count and Log message count
    messageCount.set(message.channel.name, (messageCount.get(message.channel.name) || 0) + 1);
    messageCount.forEach((value, key) => {
        console.log(`Channel ${key} has ${value} messages`);
    });
});

// Log in to Discord with client's token
client.login(process.env.APP_TOKEN);
