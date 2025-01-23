const fs = require('fs');
const path = require('path');

// Ensure the logs directory exists
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const logFile = path.join(logDirectory, 'commands.log');

function logCommand(commandName, username, args = {}) {
    const timestamp = new Date().toISOString();
    const argsString = Object.entries(args).map(([key, value]) => `${key}: ${value}`).join(', ');
    const logMessage = `${timestamp} - Command: ${commandName}, User to blame: ${username}, Args: { ${argsString} }\n`;
    fs.appendFileSync(logFile, logMessage, 'utf8');
}

module.exports = { logCommand };