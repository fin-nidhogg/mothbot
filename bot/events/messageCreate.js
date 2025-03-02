const { postUserdata, postGeneralStats } = require('../utils/postStats');
const getUserConsent = require('../utils/getUserConsent');
const generateWithHorde = require('../utils/generateWithHorde');
const { logCommand } = require('../logger');
const config = require('../config');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (!message.guild && !message.author.bot) {
            await handleDirectMessage(message);
        } else {
            await handleGuildMessage(message);
        }
    },
};


async function handleDirectMessage(message) {
    const authorName = message.author.nickname || message.author.username;
    logCommand('DM from', authorName, { message: message.content });

    if (config.hordeEnabled) {
        console.log(`DM Received from ${message.author.tag}: Responding with AI Horde...`);
        // Show typing indicator while generating response
        let typing = setInterval(() => message.channel.sendTyping(), 5000); // Jatkuva indikaattori
        try {
            const replyMessage = await generateWithHorde(message.content);
            clearInterval(typing); // Delete typing indicator when response is ready
            message.reply(replyMessage);
        } catch {
            console.error("Error in AI Horde request");
            message.reply("Something went critically wrong 🤔");
        }

    } else {
        try {
            console.log(`DM Received from ${message.author.tag}: Responding without AI Horde...`)
            await message.reply(`Ah, a mysterious DM appears...\nUnfortunately, I do not possess the means to converse here.\nAs the wise say, *'The stars only align when we gather together.'*\n\nThis message, however, has been recorded in the logs, as a reminder from the past to the future.\nBeware, for all messages may one day reveal their secrets.`);
        } catch (error) {
            console.error('Error sending DM reply:', error);
        }
    }
}

// Handle messages in guilds. If user has given consent, send message info to the API.
async function handleGuildMessage(message) {
    if (message.author.bot) return;

    // Get message info for sending to the API
    const guildId = message.guildId;
    const channelId = message.channelId;
    const channelName = message.channel.name;
    const userId = message.author.id;
    const username = message.author.username;
    const nickname = message.member ? message.member.displayName : null;

    // Log general stats to database
    postGeneralStats(guildId, channelId, channelName);

    // check if user has given consent to log messages in our database
    const consent = await getUserConsent(message.author.id);
    if (!consent) {
        // User has not given consent, store only general stats
        console.log(`User ${message.author.id} has not given consent, moving on.`);
        return;
    } else {
        // User has given consent, store message info to database
        postUserdata(guildId, channelId, channelName, userId, username, nickname);
    }
}