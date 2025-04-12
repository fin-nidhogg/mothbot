const axios = require('./axiosInstance');
const config = require('../config');

// Helper function to split an array into chunks
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// Fetches the message history for a specific user and sends it to the API.
async function fetchAndSendMessages(client, userId) {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 3); // Calculate the date three years ago

    const guildPromises = client.guilds.cache.map(async (guild) => {
        console.log(`Processing guild: ${guild.name}`);

        const channelPromises = guild.channels.cache.map(async (channel) => {
            if (channel.isTextBased()) {
                try {
                    let messages = [];
                    let lastMessageId = null;

                    // Fetch message history iteratively
                    while (true) {
                        const fetchedMessages = await channel.messages.fetch({
                            limit: 100,
                            before: lastMessageId,
                        });

                        if (fetchedMessages.size === 0) {
                            break; // No more messages to fetch
                        }

                        // Filter messages for the specific user and within the last 2 years
                        const userMessages = fetchedMessages.filter(msg => {
                            return msg.author.id === userId && msg.createdAt >= twoYearsAgo;
                        });

                        // If no messages are within the last 2 years, stop fetching
                        if (userMessages.size === 0) {
                            break;
                        }

                        messages = [...messages, ...userMessages.map(msg => ({
                            channelId: msg.channel.id,
                            channelName: channel.name,
                            createdAt: msg.createdAt.toISOString(),
                            nickname: msg.member ? msg.member.displayName : null,
                            username: msg.author.username,
                        }))];

                        lastMessageId = fetchedMessages.last().id; // Update lastMessageId
                    }

                    // Split messages into chunks to avoid payload size issues
                    const messageChunks = chunkArray(messages, 100); // Adjust chunk size as needed
                    for (const chunk of messageChunks) {
                        await axios.post(`${config.apiUrl}/user-stats/process-messages`, {
                            userId,
                            guildId: guild.id,
                            messages: chunk,
                        });
                        console.log(`Sent ${chunk.length} messages for user ${userId} in guild ${guild.name}, channel ${channel.name}`);
                    }
                } catch (error) {
                    if (error.code === 50001) {
                        console.warn(`⚠️ No access to channel: ${channel.name} (${channel.id}), skipping.`);
                    } else {
                        console.error(`Error fetching messages in channel ${channel.name}:`, error.message);
                    }
                }
            }
        });

        // Wait for all channels in the guild to finish processing
        await Promise.all(channelPromises);
    });

    // Wait for all guilds to finish processing
    await Promise.all(guildPromises);

    console.log(`Finished fetching and sending messages for user ${userId}.`);
}

module.exports = { fetchAndSendMessages };