const config = require('../config');
const runmode = process.env.NODE_ENV;

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log('Bot started in ' + runmode + ' mode');
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log(`Bot is using API: ${config.apiUrl}`);
        console.log(`Horde generation is ${config.hordeEnabled ? 'enabled' : 'disabled'}`);
    },
};