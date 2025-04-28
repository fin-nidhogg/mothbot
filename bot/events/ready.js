const config = require('../config');
const cron = require('node-cron');
const runmode = process.env.NODE_ENV;

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot started in ${runmode} mode \n------------------------`);
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log(`Bot is using API: ${config.apiUrl} \n------------------------`);
        console.log(`Bot is running on ${client.guilds.cache.size} servers`);
        console.log(`Bot is using ${client.channels.cache.size} channels`);
        console.log(`Horde generation is ${config.hordeEnabled ? 'enabled' : 'disabled'}`);

        // Load cronjobs
        cron.schedule('55 20 * * *', async () => {
            console.log('Running daily active users calculation...');
            const guild = client.guilds.cache.get(config.guildId);
            if (guild) {
                try {
                    // Wait for the sendDailyActiveUsers function to complete
                    await require('../cronjobs/calculateDAU').sendDailyActiveUsers(guild, config.apiUrl, true);
                    console.log('Daily active users calculation completed.');
                } catch (error) {
                    console.error('Error during daily active users calculation:', error);
                }
            } else {
                console.error('Guild not found. Unable to calculate daily active users.');
            }
        });
    },
};