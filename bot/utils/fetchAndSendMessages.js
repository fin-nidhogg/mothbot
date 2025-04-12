const axios = require('./axiosInstance');
const config = require('../config');

/**
 * Fetches and sends a user's message history from all accessible text channels in a guild.
 * @param {Object} client - The Discord client instance.
 * @param {string} userId - The ID of the user whose messages are being fetched.
 */
async function fetchAndSendMessages(client, userId) {
    const threeYearsAgo = calculateThreeYearsAgo();
    const afterId = dateToSnowflake(threeYearsAgo);

    console.log(`Fetching messages after: ${threeYearsAgo.toISOString()} (Snowflake: ${afterId})`);

    let totalChannelsProcessed = 0;
    let totalChannelsSkipped = 0;
    let totalMessagesFetched = 0;
    let totalMessagesSent = 0;
    const skippedChannels = [];

    const guildPromises = client.guilds.cache.map(async (guild) => {
        console.log(`Processing guild: ${guild.name}`);
        const { processed, skipped, fetchedMessages, sentMessages, skippedDetails } = await processGuildChannels(guild, userId, afterId);

        totalChannelsProcessed += processed;
        totalChannelsSkipped += skipped;
        totalMessagesFetched += fetchedMessages;
        totalMessagesSent += sentMessages;
        skippedChannels.push(...skippedDetails);
    });

    await Promise.all(guildPromises);

    // Print summary
    console.log(`\n=== Summary ===`);
    console.log(`Total channels processed: ${totalChannelsProcessed}`);
    console.log(`Total channels skipped: ${totalChannelsSkipped}`);
    console.log(`Total messages fetched: ${totalMessagesFetched}`);
    console.log(`Total messages sent: ${totalMessagesSent}`);
    if (skippedChannels.length > 0) {
        console.log(`Skipped channels:`);
        skippedChannels.forEach(({ name, id, reason }) => {
            console.log(`- ${name} (${id}): ${reason}`);
        });
    }
    console.log(`================\n`);
}

/**
 * Calculates the date three years ago from today.
 * @returns {Date} - The date three years ago.
 */
function calculateThreeYearsAgo() {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    return threeYearsAgo;
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
 * Processes all accessible text channels in a guild and fetches messages for a specific user.
 * @param {Object} guild - The guild to process.
 * @param {string} userId - The ID of the user whose messages are being fetched.
 * @param {string} afterId - The Snowflake ID to start fetching messages after.
 * @returns {Object} - Summary of processed and skipped channels, and message counts.
 */
async function processGuildChannels(guild, userId, afterId) {
    let processedChannels = 0;
    let skippedChannels = 0;
    let fetchedMessages = 0;
    let sentMessages = 0;
    const skippedDetails = [];

    const channelPromises = guild.channels.cache.map(async (channel) => {
        if (channel.isTextBased()) {
            try {
                const { fetched, sent } = await processChannelMessages(channel, userId, afterId, guild.id);
                processedChannels++;
                fetchedMessages += fetched;
                sentMessages += sent;
            } catch (error) {
                if (error.code === 50001) {
                    skippedChannels++;
                    skippedDetails.push({ name: channel.name, id: channel.id, reason: 'No access' });
                } else {
                    skippedChannels++;
                    skippedDetails.push({ name: channel.name, id: channel.id, reason: `Error: ${error.message}` });
                }
            }
        } else {
            skippedChannels++;
            skippedDetails.push({ name: channel.name, id: channel.id, reason: 'Not a text channel' });
        }
    });

    await Promise.all(channelPromises);

    return {
        processed: processedChannels,
        skipped: skippedChannels,
        fetchedMessages,
        sentMessages,
        skippedDetails,
    };
}

/**
 * Fetches messages from a channel and sends them to the API in chunks.
 * @param {Object} channel - The channel to fetch messages from.
 * @param {string} userId - The ID of the user whose messages are being fetched.
 * @param {string} afterId - The Snowflake ID to start fetching messages after.
 * @param {string} guildId - The ID of the guild the channel belongs to.
 * @returns {Object} - Number of fetched and sent messages.
 */
async function processChannelMessages(channel, userId, afterId, guildId) {
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

        // Filter messages authored by the specified user
        const userMessages = fetchedBatch.filter(msg => {
            if (!msg.author || processedMessageIds.has(msg.id)) {
                return false;
            }
            return msg.author.id === userId;
        });

        // Add filtered messages to the collection
        for (const msg of userMessages.values()) {
            const formatted = formatMessage(msg, channel);
            collectedMessages.push(formatted);
            processedMessageIds.add(msg.id);

            // Send messages to API in chunks of 100
            if (collectedMessages.length >= 100) {
                await sendMessagesToAPI(collectedMessages.splice(0, 100), userId, guildId);
                sentMessages += 100;
            }
        }

        // Update lastMessageId to the ID of the last fetched message
        lastMessageId = fetchedBatch.last().id;
    }

    // Send any remaining messages
    if (collectedMessages.length > 0) {
        await sendMessagesToAPI(collectedMessages, userId, guildId);
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
        nickname: msg.member?.displayName || null,
        username: msg.author.username,
    };
}

/**
 * Sends a chunk of messages to the API.
 * @param {Array} messages - The messages to send.
 * @param {string} userId - The ID of the user whose messages are being sent.
 * @param {string} guildId - The ID of the guild the messages belong to.
 */
async function sendMessagesToAPI(messages, userId, guildId) {
    try {
        await axios.post(`${config.apiUrl}/user-stats/process-messages`, {
            userId,
            guildId,
            messages,
        });
    } catch (error) {
        console.error('Error sending messages to API:', error.message);
    }
}

module.exports = { fetchAndSendMessages };