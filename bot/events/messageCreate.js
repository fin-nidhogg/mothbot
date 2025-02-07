const { generateWithHorde } = require('../utils/generateWithHorde');
const sendPostRequest = require('../utils/sendPostRequest');
const { logCommand } = require('../logger');
const config = require('../config');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // if the message is a DM and Horde is enabled, log it and reply with a generated message, else reply with a default message
        if (!message.guild && !message.author.bot) {
            const authorName = message.author.nickname || message.author.username;
            const replyMessage = await generateWithHorde("Respond shortly to this given message with a slight mystical humor: " + message.content);
            console.log(`DM Received from ${message.author.tag}: ${message.content}`);
            logCommand('DM from', authorName, { message: message.content });

            // Check if horde is enabled in the environment variables and reply accordingly
            if (config.hordeEnabled === 'true') {
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

            // Extract fields and Log the message to the database
            const guildId = message.guildId;
            const channelId = message.channelId;
            const channelName = message.channel.name;
            const userId = message.author.id;
            const username = message.author.username;
            const nickname = message.member ? message.member.displayName : null;
            sendPostRequest(guildId, channelId, channelName, userId, username, nickname);
        }
    },
};