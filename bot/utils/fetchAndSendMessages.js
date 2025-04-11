const axios = require('./axiosInstance');
const config = require('../config');

// Fetches the message history for a specific user and sends it to the API.
async function fetchAndSendMessages(client, userId) {
    client.guilds.cache.forEach(async (guild) => {
        console.log(`Processing guild: ${guild.name}`);

        guild.channels.cache.forEach(async (channel) => {
            if (channel.isTextBased()) {
                try {
                    let messages = [];
                    let lastMessageId = null;

                    // Fetch message history iteratively
                    do {
                        const fetchedMessages = await channel.messages.fetch({
                            limit: 100,
                            before: lastMessageId,
                        });

                        if (fetchedMessages.size === 0) {
                            break;
                        }

                        // Filter messages for the specific user
                        const userMessages = fetchedMessages.filter(msg => msg.author.id === userId);
                        messages = [...messages, ...userMessages.map(msg => ({
                            channelId: msg.channel.id,
                            channelName: channel.name,
                            createdAt: msg.createdAt.toISOString(),
                            nickname: msg.member ? msg.member.displayName : null,
                            username: msg.author.username,
                        }))];

                        lastMessageId = fetchedMessages.last().id;
                    } while (lastMessageId);

                    // Send messages to the API
                    if (messages.length > 0) {
                        await axios.post(`${config.apiUrl}/user-stats/process-messages`, {
                            userId,
                            guildId: guild.id,
                            messages,
                        });
                        console.log(`Sent ${messages.length} messages for user ${userId} in guild ${guild.name}`);
                    }
                } catch (error) {
                    console.error(`Error fetching messages in channel ${channel.name}:`, error.message);
                }
            }
        });
    });
}

module.exports = { fetchAndSendMessages };