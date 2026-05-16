const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

function formatDuration(ms) {
    if (!Number.isFinite(ms)) {
        return 'n/a';
    }

    if (ms < 1000) {
        return `${ms} ms`;
    }

    return `${(ms / 1000).toFixed(2)} s`;
}

function getErrorDetails(error) {
    if (error.response) {
        return {
            title: `HTTP ${error.response.status}`,
            description: error.response.statusText || 'The website returned an error.',
        };
    }

    if (error.code === 'ECONNABORTED') {
        return {
            title: 'Timeout',
            description: 'The website did not respond before the timeout.',
        };
    }

    return {
        title: error.code || 'Yhteysvirhe',
        description: error.message || 'Could not connect to the website.',
    };
}

function createDownEmbed(monitor, result) {
    const details = getErrorDetails(result.error);

    return new EmbedBuilder()
        .setColor(0xd83c3e)
        .setTitle(`Website down: ${monitor.name}`)
        .setURL(monitor.url)
        .setDescription('The monitor detected an issue. No further downtime alerts will be sent until the website has recovered.')
        .addFields(
            { name: 'Website', value: monitor.url },
            { name: 'Error', value: `${details.title}: ${details.description}` },
            { name: 'Response time', value: formatDuration(result.durationMs), inline: true },
            { name: 'Check interval', value: `${monitor.intervalSeconds} s`, inline: true },
            { name: 'Failed checks', value: `${result.failureCount}/${monitor.failureThreshold}`, inline: true },
        )
        .setTimestamp();
}

function createUpEmbed(monitor, result) {
    return new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(`Website recovered: ${monitor.name}`)
        .setURL(monitor.url)
        .setDescription('The website is responding again. Monitoring has returned to normal.')
        .addFields(
            { name: 'Website', value: monitor.url },
            { name: 'Status', value: `HTTP ${result.status}`, inline: true },
            { name: 'Response time', value: formatDuration(result.durationMs), inline: true },
        )
        .setTimestamp();
}

async function checkWebsite(monitor) {
    const startedAt = Date.now();

    try {
        const response = await axios.get(monitor.url, {
            timeout: monitor.timeoutMs,
            maxRedirects: 5,
            validateStatus: status => status >= 200 && status < 400,
            headers: {
                'User-Agent': 'Mothbot Website Monitor',
            },
        });

        return {
            ok: true,
            status: response.status,
            durationMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            ok: false,
            error,
            durationMs: Date.now() - startedAt,
        };
    }
}

async function resolveChannel(client, channelId) {
    const cachedChannel = client.channels.cache.get(channelId);

    if (cachedChannel) {
        return cachedChannel;
    }

    return client.channels.fetch(channelId);
}

async function sendMonitorMessage(client, channelId, embed) {
    const channel = await resolveChannel(client, channelId);

    if (!channel || !channel.isTextBased()) {
        throw new Error(`Website monitor channel ${channelId} is not a text channel.`);
    }

    await channel.send({ embeds: [embed] });
}

function validateMonitorConfig(monitor) {
    if (!monitor.enabled) {
        return 'disabled';
    }

    if (!monitor.url) {
        return 'WEBSITE_MONITOR_URL is missing';
    }

    if (!monitor.channelId) {
        return 'WEBSITE_MONITOR_CHANNEL_ID is missing';
    }

    try {
        new URL(monitor.url);
    } catch {
        return 'WEBSITE_MONITOR_URL is not a valid URL';
    }

    if (monitor.intervalSeconds < 10) {
        return 'WEBSITE_MONITOR_INTERVAL_SECONDS must be at least 10';
    }

    if (monitor.timeoutMs < 1000) {
        return 'WEBSITE_MONITOR_TIMEOUT_MS must be at least 1000';
    }

    if (!Number.isInteger(monitor.failureThreshold) || monitor.failureThreshold < 1) {
        return 'WEBSITE_MONITOR_FAILURE_THRESHOLD must be an integer of at least 1';
    }

    return null;
}

function startWebsiteMonitor(client, monitor) {
    const configError = validateMonitorConfig(monitor);

    if (configError) {
        if (configError !== 'disabled') {
            console.warn(`[WebsiteMonitor] Not started: ${configError}`);
        }

        return null;
    }

    let lastState = 'unknown';
    let failureCount = 0;
    let inFlight = false;

    const runCheck = async () => {
        if (inFlight) {
            console.warn('[WebsiteMonitor] Previous check is still running, skipping this cycle.');
            return;
        }

        inFlight = true;

        try {
            const result = await checkWebsite(monitor);

            if (!result.ok) {
                failureCount += 1;

                if (failureCount >= monitor.failureThreshold && lastState !== 'down') {
                    await sendMonitorMessage(
                        client,
                        monitor.channelId,
                        createDownEmbed(monitor, { ...result, failureCount }),
                    );
                    console.warn(`[WebsiteMonitor] ${monitor.url} is down after ${failureCount} failed checks.`);
                    lastState = 'down';
                }

                return;
            }

            failureCount = 0;

            if (lastState === 'down') {
                await sendMonitorMessage(client, monitor.channelId, createUpEmbed(monitor, result));
                console.log(`[WebsiteMonitor] ${monitor.url} recovered.`);
            }

            lastState = 'up';
        } catch (error) {
            console.error('[WebsiteMonitor] Failed to process monitor check:', error);
        } finally {
            inFlight = false;
        }
    };

    runCheck();
    const interval = setInterval(runCheck, monitor.intervalSeconds * 1000);

    console.log(`[WebsiteMonitor] Monitoring ${monitor.url} every ${monitor.intervalSeconds} seconds.`);

    return interval;
}

module.exports = {
    startWebsiteMonitor,
};
