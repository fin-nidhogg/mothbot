const cron = require('node-cron');
const config = require('../config');
const { sendDailyActiveUsers } = require('../cronjobs/calculateDAU');
const { startWebsiteMonitor } = require('../cronjobs/monitorWebsite');
const { startScheduledMessageWorker } = require('../cronjobs/sendScheduledMessages');
const runmode = process.env.NODE_ENV;

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        const localTime = new Date().toLocaleString('fi-FI', { timeZone: config.timeZone });
        const utcTime = new Date().toISOString();

        console.log('\n==================== BOT STATUS ====================');
        console.log(`🟢 Bot started in ${runmode} mode`);
        console.log(`👤 Logged in as:        ${client.user.tag}`);
        console.log(`🌍 Time (local):        ${localTime}`);
        console.log(`🌐 Time (UTC):          ${utcTime}`);
        console.log(`🛠️  API in use:         ${config.apiUrl}`);
        console.log(`📡 Connected servers:   ${client.guilds.cache.size}`);
        console.log('====================================================\n');

        startWebsiteMonitor(client, config.websiteMonitor);
        startScheduledMessageWorker(client, { ...config.scheduledMessages, apiUrl: config.apiUrl });

        cron.schedule('55 23 * * *', async () => {
            const now = new Date();
            const localNow = now.toLocaleString('fi-FI', { timeZone: config.timeZone });

            console.log('\n========= [CRON] Daily Active User Trigger =========');
            console.log(`🕓 Trigger time (local): ${localNow}`);
            console.log(`🕓 Trigger time (UTC):   ${now.toISOString()}`);
            console.log(`🔍 Looking for guild ID: ${config.guildId}`);

            const guild = client.guilds.cache.get(config.guildId);

            if (!guild) {
                console.error('❌ Guild not found. Available guilds:');
                console.log(client.guilds.cache.map(g => `- ${g.name} (${g.id})`).join('\n'));
                return;
            }

            try {
                await sendDailyActiveUsers(guild, config.apiUrl, true);
                console.log('✅ Daily active users report sent successfully.');
            } catch (error) {
                console.error('❌ Error during daily active users calculation:\n', error);
            }

            console.log('====================================================\n');
        }, {
            timezone: config.timeZone
        });
    },
};
