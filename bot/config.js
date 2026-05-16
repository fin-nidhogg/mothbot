const dotenv = require('dotenv');
const path = require('path');

// Determine the correct .env file based on the NODE_ENV environment variable
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';

// Load environment variables from the specified .env file
dotenv.config({ path: path.resolve(__dirname, envFile) });

module.exports = {
    apiUrl: process.env.API_URL,
    hordeApiKey: process.env.HORDE_API_KEY,
    hordeEnabled: process.env.HORDE_ENABLED === 'true',
    appToken: process.env.APP_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    helpchannelId: process.env.HELP_CHANNEL_ID,
    questionchannelId: process.env.QUESTIONS_CHANNEL_ID,
    botSecret: process.env.BOT_SECRET,
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    timeZone: process.env.TIME_ZONE || 'Europe/Helsinki',
    ollamaURL: process.env.OLLAMA_URL,
    websiteMonitor: {
        enabled: process.env.WEBSITE_MONITOR_ENABLED === 'true',
        url: process.env.WEBSITE_MONITOR_URL,
        channelId: process.env.WEBSITE_MONITOR_CHANNEL_ID,
        name: process.env.WEBSITE_MONITOR_NAME || process.env.WEBSITE_MONITOR_URL,
        intervalSeconds: Number(process.env.WEBSITE_MONITOR_INTERVAL_SECONDS) || 60,
        timeoutMs: Number(process.env.WEBSITE_MONITOR_TIMEOUT_MS) || 10000,
        failureThreshold: Number(process.env.WEBSITE_MONITOR_FAILURE_THRESHOLD) || 1,
    },
};
