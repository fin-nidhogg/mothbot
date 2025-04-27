const axios = require('../utils/axiosInstance');
const config = require('../config');
const { DateTime } = require('luxon');

/**
 * Calculates and sends the number of active users for the current day to the backend.
 * Includes optional debug logs and gracefully handles channels without permissions.
 *
 * @param {Object} guild - The Discord guild object.
 * @param {string} backendUrl - The backend URL to send the data to.
 * @param {boolean} debugMode - Whether to enable detailed debug output.
 * @returns {Promise<void>} - Resolves when the data is successfully sent.
 */
async function sendDailyActiveUsers(guild, backendUrl, debugMode = false) {
    try {
        const activeUserSet = new Set();

        // Ensure all guild members are cached
        await guild.members.fetch();

        const now = new Date();

        // Get today's start in Finnish time
        const startOfToday = DateTime.now().setZone(`${config.timeZone}`).startOf('day').toUTC().toJSDate();

        if (debugMode) {
            console.log(`\n=== [DEBUG] Starting daily active user calculation ===`);
            console.log(`[DEBUG] Calculating active users since: ${startOfToday.toISOString()}`);
        }

        const textChannels = guild.channels.cache.filter(channel => channel.isTextBased());

        const nonBotMembersCount = guild.members.cache.filter(member => !member.user.bot).size;
        if (debugMode) console.log(`[DEBUG] Non-bot members count: ${nonBotMembersCount}`);

        let totalFetchedMessages = 0;
        let totalSkippedChannels = 0;

        for (const [channelId, channel] of textChannels) {
            if (activeUserSet.size >= nonBotMembersCount) {
                if (debugMode) console.log(`[DEBUG] All users found before checking all channels.`);
                break;
            }

            let lastMessageId = null;
            let fetching = true;

            while (fetching) {
                const options = { limit: 100 };
                if (lastMessageId) options.before = lastMessageId;

                let messages;
                try {
                    messages = await channel.messages.fetch(options);
                } catch (error) {
                    if (debugMode) console.warn(`[DEBUG] Skipping channel "${channel.name}" (${channel.id}) - no permission to fetch messages or other error.`);
                    totalSkippedChannels++;
                    break; // Skip this channel if fetching fails
                }

                if (messages.size === 0) {
                    if (debugMode) console.log(`[DEBUG] No more messages in channel "${channel.name}".`);
                    break;
                }

                totalFetchedMessages += messages.size;

                for (const [messageId, message] of messages) {
                    if (debugMode) {
                        console.log(`[DEBUG] [${channel.name}] Message from ${message.author.username} at ${message.createdAt.toISOString()}`);
                    }

                    if (message.createdAt < startOfToday) {
                        if (debugMode) console.log(`[DEBUG] [${channel.name}] Reached message older than today, stopping fetch for this channel.`);
                        fetching = false;
                        break;
                    }

                    if (!message.author.bot && !activeUserSet.has(message.author.id)) {
                        if (debugMode) console.log(`[DEBUG] Marking user "${message.author.username}" as active.`);
                        activeUserSet.add(message.author.id);

                        if (activeUserSet.size >= nonBotMembersCount) {
                            if (debugMode) console.log(`[DEBUG] All non-bot members accounted for during fetching.`);
                            fetching = false;
                            break;
                        }
                    }
                }

                lastMessageId = messages.last()?.id;
            }
        }

        if (debugMode) {
            console.log(`\n=== [DEBUG] Finished scanning ===`);
            console.log(`[DEBUG] Total messages fetched: ${totalFetchedMessages}`);
            console.log(`[DEBUG] Total channels skipped: ${totalSkippedChannels}`);
            console.log(`[DEBUG] Total active users found: ${activeUserSet.size}`);
        }

        const data = {
            date: now.toISOString().split('T')[0], // YYYY-MM-DD format
            activeUsers: activeUserSet.size,
        };

        if (debugMode) {
            console.log(`\n[DEBUG] Sending active user data for date: ${data.date}`);
        }

        const response = await axios.post(`${backendUrl}/general-stats/active-users`, data);
        console.log('[INFO] Daily active users sent successfully:', response.data);

    } catch (error) {
        console.error('[ERROR] Error sending daily active users:', error);
    }
}

module.exports = { sendDailyActiveUsers };