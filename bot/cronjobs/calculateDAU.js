const axios = require('../utils/axiosInstance');
const config = require('../config');
const { DateTime } = require('luxon');

/**
 * Calculates and sends the number of active users for the current day to the backend.
 *
 * @param {Object} guild - The Discord guild object.
 * @param {string} backendUrl - The backend URL to send the data to.
 * @param {boolean} debugMode - Enable detailed debug output.
 * @returns {Promise<void>}
 */
async function sendDailyActiveUsers(guild, backendUrl, debugMode = false) {
    try {
        const activeUserSet = new Set();
        await guild.members.fetch(); // Cache all members

        const now = DateTime.utc();
        const startOfToday = now.setZone(config.timeZone).startOf('day').toUTC();

        if (debugMode) {
            console.log(`\n=== [DEBUG] Starting daily active user collection ===`);
            console.log(`[DEBUG] Current time (UTC): ${now.toISO()}`);
            console.log(`[DEBUG] Start of today (UTC equivalent): ${startOfToday.toISO()}`);
        }

        const textChannels = guild.channels.cache.filter(c => c.isTextBased());
        const nonBotMembers = guild.members.cache.filter(m => !m.user.bot);
        const nonBotMemberCount = nonBotMembers.size;

        if (debugMode) console.log(`[DEBUG] Non-bot members in guild: ${nonBotMemberCount}`);

        let totalFetchedMessages = 0;
        let totalSkippedChannels = 0;

        for (const [channelId, channel] of textChannels) {
            if (activeUserSet.size >= nonBotMemberCount) break; // No need to continue

            let lastMessageId = undefined;
            let keepFetching = true;

            while (keepFetching) {
                const fetchOptions = { limit: 100 };
                if (lastMessageId) fetchOptions.before = lastMessageId;

                let messages;
                try {
                    messages = await channel.messages.fetch(fetchOptions);
                } catch (error) {
                    if (debugMode) console.warn(`[DEBUG] Skipping channel "${channel.name}" (cannot fetch messages)`);
                    totalSkippedChannels++;
                    break;
                }

                if (messages.size === 0) break;

                totalFetchedMessages += messages.size;

                for (const [id, message] of messages) {
                    const messageTime = DateTime.fromJSDate(message.createdAt).toUTC();

                    if (debugMode) {
                        console.log(`[DEBUG] [${channel.name}] Message at: ${messageTime.toISO()} by ${message.author.username}`);
                    }

                    if (messageTime < startOfToday) {
                        keepFetching = false;
                        break;
                    }

                    if (!message.author.bot && !activeUserSet.has(message.author.id)) {
                        activeUserSet.add(message.author.id);

                        if (debugMode) console.log(`[DEBUG] Marked active: ${message.author.username}`);

                        if (activeUserSet.size >= nonBotMemberCount) {
                            keepFetching = false;
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
            console.log(`[DEBUG] Total channels skipped (no permission/errors): ${totalSkippedChannels}`);
            console.log(`[DEBUG] Total unique active users found: ${activeUserSet.size}`);
        }

        const postData = {
            date: now.setZone(config.timeZone).toISODate(), // Today's date in server timezone
            activeUsers: activeUserSet.size,
        };

        if (debugMode) {
            console.log(`\n[DEBUG] Sending data to backend:`, postData);
        }

        const response = await axios.post(`${backendUrl}/general-stats/active-users`, postData);

        console.log('[INFO] Daily active users sent successfully:', response.data);
    } catch (error) {
        console.error('[ERROR] Failed to send daily active users:', error);
    }
}

module.exports = { sendDailyActiveUsers };