const axios = require('./axiosInstance');
const config = require('../config');

/**
 * Fetches and sends message history for all users in all accessible text channels in a guild.
 * @param {Object} client - The Discord client instance.
 */
async function fetchAndSendAllMessages(client) {
    const twoYearsAgo = calculateTwoYearsAgo();
    const afterId = dateToSnowflake(twoYearsAgo);

    console.log(`Fetching messages after: ${twoYearsAgo.toISOString()} (Snowflake: ${afterId})`);

    let totalMessagesFetched = 0;
    let totalMessagesSent = 0;

    const guildPromises = client.guilds.cache.map(async (guild) => {
        console.log(`Processing guild: ${guild.name}`);
        const { fetchedMessages, sentMessages } = await processGuildChannels(guild, afterId);

        totalMessagesFetched += fetchedMessages;
        totalMessagesSent += sentMessages;
    });

    await Promise.all(guildPromises);

    // Print summary
    console.log(`\n=== Summary ===`);
    console.log(`Total messages fetched: ${totalMessagesFetched}`);
    console.log(`Total messages sent: ${totalMessagesSent}`);
    console.log(`================\n`);
}

/**
 * Calculates the date two years ago from today.
 * @returns {Date} - The date two years ago.
 */
function calculateTwoYearsAgo() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return twoYearsAgo;
}

/**
 * Converts a Date object to a Discord Snowflake ID.
 * @param {Date} date - The date to convert.
 * @returns {string} - The Snowflake ID as a string.
 */
function dateToSnowflake(date) {
    const DISCORD_EPOCH = BigInt(1420070400000);
    const timestamp = BigInt(date.getTime());
    return ((timestamp - DISCORD_EPOCH) << 22n).toString();
}

/**
 * Processes all accessible text channels in a guild and fetches messages for all users.
 * @param {Object} guild - The guild to process.
 * @param {string} afterId - The Snowflake ID to start fetching messages after.
 * @returns {Object} - Summary of fetched and sent messages.
 */
async function processGuildChannels(guild, afterId) {
    let fetchedMessages = 0;
    let sentMessages = 0;

    const channelPromises = guild.channels.cache.map(async (channel) => {
        if (channel.isTextBased()) {
            try {
                const { fetched, sent } = await processChannelMessages(channel, afterId, guild.id);
                fetchedMessages += fetched;
                sentMessages += sent;
            } catch (error) {
                console.error(`Error processing channel ${channel.name} (${channel.id}):`, error.message);
            }
        } else {
            console.log(`Skipping non-text channel: ${channel.name} (${channel.id})`);
        }
    });

    await Promise.all(channelPromises);

    return {
        fetchedMessages,
        sentMessages,
    };
}

/**
 * Fetches messages from a channel and sends them to the API in chunks.
 * @param {Object} channel - The channel to fetch messages from.
 * @param {string} afterId - The Snowflake ID to start fetching messages after.
 * @param {string} guildId - The ID of the guild the channel belongs to.
 * @returns {Object} - Number of fetched and sent messages.
 */
async function processChannelMessages(channel, afterId, guildId) {
    let lastMessageId = afterId;
    const processedMessageIds = new Set();
    let collectedMessages = [];
    let fetchedMessages = 0;
    let sentMessages = 0;

    while (true) {
        const fetchedBatch = await channel.messages.fetch({
            limit: 100,
            after: lastMessageId,
        });

        if (fetchedBatch.size === 0 || !fetchedBatch.last()) {
            break;
        }

        fetchedMessages += fetchedBatch.size;

        // Add all messages to the collection
        for (const msg of fetchedBatch.values()) {
            if (!processedMessageIds.has(msg.id)) {
                const formatted = formatMessage(msg, channel);
                collectedMessages.push(formatted);
                processedMessageIds.add(msg.id);

                // Send messages to API in chunks of 100
                if (collectedMessages.length >= 100) {
                    await sendMessagesToAPI(collectedMessages.splice(0, 100), guildId);
                    sentMessages += 100;
                }
            }
        }

        // Update lastMessageId to the ID of the last fetched message
        lastMessageId = fetchedBatch.last().id;
    }

    // Send any remaining messages
    if (collectedMessages.length > 0) {
        await sendMessagesToAPI(collectedMessages, guildId);
        sentMessages += collectedMessages.length;
    }

    return { fetched: fetchedMessages, sent: sentMessages };
}

/**
 * Formats a message into the required structure.
 * @param {Object} msg - The message to format.
 * @param {Object} channel - The channel the message belongs to.
 * @returns {Object} - The formatted message.
 */
function formatMessage(msg, channel) {
    return {
        channelId: msg.channel.id,
        channelName: channel.name,
        createdAt: msg.createdAt.toISOString(),
        userId: msg.author.id,
        username: msg.author.username,
        nickname: msg.member?.displayName || null,
        content: msg.content,
    };
}

/**
 * Sends a chunk of messages to the API.
 * @param {Array} messages - The messages to send.
 * @param {string} guildId - The ID of the guild the messages belong to.
 */
async function sendMessagesToAPI(messages, guildId) {
    try {
        await axios.post(`${config.apiUrl}/user-stats/process-messages`, {
            guildId,
            messages,
        });
    } catch (error) {
        console.error('Error sending messages to API:', error.message);
    }
}

module.exports = { fetchAndSendAllMessages };