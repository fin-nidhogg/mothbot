const config = require('../config');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log(`Bot is using API: ${config.apiUrl}:${config.apiPort}`);
        console.log(`Horde generation is ${config.hordeEnabled ? 'enabled' : 'disabled'}`);
    },
};