const axios = require('axios');
const config = require('../config');

/**
 * Creates a GitHub issue in a private repository.
 *
 * @param {string} title - The title of the issue.
 * @param {string} body - The body (description) of the issue.
 * @returns {Promise<void>}
 */
async function createGitHubIssue(title, body) {

    try {
        const response = await axios.post(
            `https://api.github.com/repos/${config.githubRepo}/issues`,
            {
                title: title,
                body: body,
                labels: ['feedback'], // You can automatically tag issues if you want
            },
            {
                headers: {
                    Authorization: `token ${config.githubToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            }
        );

        console.log('[INFO] GitHub issue created successfully:', response.data.html_url);
    } catch (error) {
        console.error('[ERROR] Failed to create GitHub issue:', error.response?.data || error.message);
    }
}

module.exports = { createGitHubIssue };
