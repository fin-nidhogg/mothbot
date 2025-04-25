const axios = require('../utils/axiosInstance');
const config = require('../config');

/**
 * Calculates and sends the number of active users for the current day to the backend.
 *
 * @param {Object} guild - The Discord guild object.
 * @param {string} backendUrl - The backend URL to send the data to.
 * @returns {Promise<void>} - Resolves when the data is successfully sent.
 */
async function sendDailyActiveUsers(guild, backendUrl) {
    try {
        const activeUserSet = new Set();

        // Ensure all guild members are cached
        await guild.members.fetch();

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        console.log(`Calculating active users since: ${startOfToday.toISOString()}`);

        const textChannels = guild.channels.cache.filter(channel => channel.isTextBased());

        // Calculate the number of non-bot members
        const nonBotMembersCount = guild.members.cache.filter(member => !member.user.bot).size;

        for (const [channelId, channel] of textChannels) {
            if (activeUserSet.size >= nonBotMembersCount) {
                console.log('All users found before checking all channels.');
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
                    console.error(`Error fetching messages for channel ${channel.name}:`, error);
                    break;
                }

                if (messages.size === 0) {
                    break;
                }

                for (const [messageId, message] of messages) {
                    // If the message is older than today, stop fetching further
                    if (message.createdAt < startOfToday) {
                        fetching = false;
                        break;
                    }

                    // If it's a human user and not yet counted, add to the set
                    if (!message.author.bot && !activeUserSet.has(message.author.id)) {
                        activeUserSet.add(message.author.id);

                        // If we found all non-bot members, we can stop early
                        if (activeUserSet.size >= nonBotMembersCount) {
                            console.log('All non-bot members accounted for during fetching.');
                            fetching = false;
                            break;
                        }
                    }
                }

                lastMessageId = messages.last()?.id;
            }
        }

        console.log(`Active users counted: ${activeUserSet.size}`);

        const data = {
            date: now.toISOString().split('T')[0], // YYYY-MM-DD format
            activeUsers: activeUserSet.size,
        };

        console.log(`Sending active user data for date: ${data.date}`);

        const response = await axios.post(`${backendUrl}/general-stats/active-users`, data);
        console.log('Daily active users sent successfully:', response.data);

    } catch (error) {
        console.error('Error sending daily active users:', error);
    }
}

module.exports = { sendDailyActiveUsers };