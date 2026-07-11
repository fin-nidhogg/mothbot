const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { DateTime } = require('luxon');
const axios = require('../utils/axiosInstance');
let deliveryTimer;
let directoryTimer;
let running = false;

function allowedMentionsFromContent(content = '') {
    const users = [...content.matchAll(/<@!?(\d{17,20})>/g)].map(match => match[1]);
    const roles = [...content.matchAll(/<@&(\d{17,20})>/g)].map(match => match[1]);
    return {
        parse: [],
        users: [...new Set(users)],
        roles: [...new Set(roles)],
        repliedUser: false,
    };
}

function discordPayload(message) {
    const result = { allowedMentions: allowedMentionsFromContent(message.content) };
    if (message.content) result.content = message.content;
    if (message.embed) {
        const e = message.embed;
        const embed = new EmbedBuilder();
        if (e.title) embed.setTitle(e.title);
        if (e.description) embed.setDescription(e.description);
        if (e.url) embed.setURL(e.url);
        if (Number.isInteger(e.color)) embed.setColor(e.color);
        if (e.thumbnailUrl) embed.setThumbnail(e.thumbnailUrl);
        if (e.imageUrl) embed.setImage(e.imageUrl);
        if (e.footer) embed.setFooter({ text: e.footer });
        if (e.fields?.length) embed.addFields(e.fields);
        result.embeds = [embed];
    }
    return result;
}

function nextOccurrence(message, now = DateTime.now()) {
    const rule = message.recurrence;
    if (!rule) return null;
    const anchor = DateTime.fromISO(new Date(rule.anchor).toISOString(), { zone: 'utc' }).setZone(rule.timeZone);
    const after = now.setZone(rule.timeZone);
    if (!anchor.isValid || !after.isValid) throw new Error('Invalid recurring message time zone or anchor');

    if (rule.frequency === 'weekly') {
        const weekdays = new Set(rule.weekdays || []);
        const anchorWeek = anchor.startOf('week');
        for (let offset = 0; offset <= 3700; offset += 1) {
            const day = after.startOf('day').plus({ days: offset }).set({
                hour: anchor.hour, minute: anchor.minute, second: anchor.second, millisecond: 0,
            });
            if (day <= after || !weekdays.has(day.weekday)) continue;
            const weekDifference = Math.round(day.startOf('week').diff(anchorWeek, 'weeks').weeks);
            if (weekDifference >= 0 && weekDifference % rule.interval === 0) return day.toUTC().toISO();
        }
    }

    if (rule.frequency === 'monthly') {
        const anchorMonth = anchor.startOf('month');
        for (let offset = 0; offset <= 1200; offset += 1) {
            const month = after.startOf('month').plus({ months: offset });
            const monthDifference = Math.round(month.diff(anchorMonth, 'months').months);
            if (monthDifference < 0 || monthDifference % rule.interval !== 0) continue;
            const day = Math.min(rule.dayOfMonth, month.daysInMonth);
            const candidate = month.set({ day, hour: anchor.hour, minute: anchor.minute, second: anchor.second, millisecond: 0 });
            if (candidate > after) return candidate.toUTC().toISO();
        }
    }
    throw new Error('Could not calculate the next recurring occurrence');
}

async function syncDiscordDirectory(client, apiUrl, fetchMembers = false) {
    try {
        const guilds = [];
        for (const guild of client.guilds.cache.values()) {
            const channels = await guild.channels.fetch();
            if (fetchMembers) {
                try { await guild.members.fetch(); }
                catch (error) { console.warn("Could not fetch all members for " + guild.name + "; using the current cache:", error.message); }
            }
            const visibleChannels = channels
                .filter(channel => {
                    if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return false;
                    const permissions = channel.permissionsFor(guild.members.me);
                    return permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);
                })
                .map(channel => ({ id: channel.id, name: channel.name, position: channel.rawPosition }))
                .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
            const canMentionAnyRole = guild.members.me.permissions.has(PermissionFlagsBits.MentionEveryone);
            const roles = guild.roles.cache
                .filter(role => role.id !== guild.id && !role.managed && (role.mentionable || canMentionAnyRole))
                .map(role => ({ id: role.id, name: role.name, position: role.position }))
                .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name));
            const members = guild.members.cache
                .filter(member => !member.user.bot)
                .map(member => ({ id: member.id, displayName: member.displayName, avatarUrl: member.displayAvatarURL({ size: 32 }) }))
                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                .slice(0, 5000);
            guilds.push({ id: guild.id, name: guild.name, iconUrl: guild.iconURL({ size: 64 }) || undefined, channels: visibleChannels, roles, members });
        }
        guilds.sort((a, b) => a.name.localeCompare(b.name));
        await axios.put(`${apiUrl}/scheduled-messages/directory`, { guilds });
        console.log(`Scheduled message directory synced: ${guilds.length} guild(s)`);
    } catch (error) {
        console.error('Discord directory sync failed:', error.response?.data || error.message);
    }
}

async function poll(client, config) {
    if (running) return;
    running = true;
    try {
        for (let count = 0; count < config.batchSize; count += 1) {
            const { data } = await axios.post(`${config.apiUrl}/scheduled-messages/claim`, { workerId: client.user.id });
            if (!data.message) break;
            const scheduled = data.message;
            try {
                const guild = await client.guilds.fetch(scheduled.guildId);
                const channel = await guild.channels.fetch(scheduled.channelId);
                if (!channel?.isTextBased()) throw new Error('Configured channel is not text based or does not exist');
                const nextScheduledFor = nextOccurrence(scheduled);
                const sent = await channel.send(discordPayload(scheduled));
                await axios.post(`${config.apiUrl}/scheduled-messages/${scheduled._id}/sent`, {
                    discordMessageId: sent.id,
                    nextScheduledFor,
                });
            } catch (error) {
                await axios.post(`${config.apiUrl}/scheduled-messages/${scheduled._id}/failed`, { error: error.message });
                console.error(`Scheduled message ${scheduled._id} failed:`, error.message);
            }
        }
    } catch (error) {
        console.error('Scheduled message poll failed:', error.response?.data || error.message);
    } finally {
        running = false;
    }
}

function startScheduledMessageWorker(client, config) {
    if (!config.enabled || deliveryTimer) return;
    poll(client, config);
    syncDiscordDirectory(client, config.apiUrl, true);
    deliveryTimer = setInterval(() => poll(client, config), config.intervalSeconds * 1000);
    directoryTimer = setInterval(() => syncDiscordDirectory(client, config.apiUrl), 5 * 60 * 1000);
    deliveryTimer.unref();
    directoryTimer.unref();
}

module.exports = {
    startScheduledMessageWorker,
    discordPayload,
    allowedMentionsFromContent,
    nextOccurrence,
    syncDiscordDirectory,
};
