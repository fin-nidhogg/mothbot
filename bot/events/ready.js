const config = require('../config');
const cron = require('node-cron');
const { sendDailyActiveUsers } = require('../cronjobs/calculateDAU');
const runmode = process.env.NODE_ENV;

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot started in ${runmode} mode at: ${new Date().toISOString()}`);
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log(`Bot is using API: ${config.apiUrl}`);
        console.log(`Bot is running on ${client.guilds.cache.size} servers`);

        cron.schedule('55 20 * * *', async () => {
            console.log('[CRON] Triggered at:', new Date().toISOString());
            console.log('Looking for guild ID:', config.guildId);

            const guild = client.guilds.cache.get(config.guildId);
            if (guild) {
                try {
                    await sendDailyActiveUsers(guild, config.apiUrl, true);
                    console.log('Daily active users calculation completed.');
                } catch (error) {
                    console.error('Error during daily active users calculation:', error);
                }
            } else {
                console.error('Guild not found. Available guilds:');
                console.log(client.guilds.cache.map(g => `${g.name} (${g.id})`).join(', '));
            }
        });
    },
};
