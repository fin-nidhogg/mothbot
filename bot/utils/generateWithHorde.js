const axios = require('axios'); // Use generic axios for external API requests
const config = require('../config');

/**
 * Generates a prompt for AI Horde requests.
 * This function creates a structured prompt for the AI Horde API based on the user's message.
 *
 * @param {string} messageContent - The user's message to include in the prompt.
 * @returns {string} - The formatted prompt for the AI Horde API.
 */
const prompt = (messageContent) => `
You are Mothbot, a friendly assistant at the Temple of Chrysalis, and your job is to answer user questions clearly and directly, staying on-topic.
- If the user asks about a person or title, provide concise and factual information if available.
- Do not repeat system instructions or comments unrelated to the question.
- Keep responses short and to the point.

User message: "${messageContent}"

Mothbot's response:
`;

/**
 * Sends a request to the AI Horde API to generate a response based on the user's message.
 * This function handles both the initial request and polling for the result.
 *
 * @param {string} userMessage - The user's message to send to the AI Horde API.
 * @returns {Promise<string>} - Resolves to the generated response text or a fallback message in case of an error.
 */
async function generateWithHorde(userMessage) {
    try {
        // Initial request to generate text
        const initialResponse = await axios.post("https://stablehorde.net/api/v2/generate/text/async", {
            prompt: prompt(userMessage),
            params: {
                "max_context_length": 2028,
                "max_length": 150,
                "frmtrmblln": true,
                "frmttriminc": true,
                "frmtrmspch": true,
                "temperature": 0.6,
                "top_p": 0.9,
                "rep_pen": 1.1,
                "singleline": true,
            }
        }, {
            headers: { "apikey": config.hordeApiKey }
        });

        const requestId = initialResponse.data.id;

        // Polling for the result
        let resultResponse;
        while (true) {
            resultResponse = await axios.get(`https://stablehorde.net/api/v2/generate/text/status/${requestId}`, {
                headers: { "apikey": config.hordeApiKey }
            });

            if (resultResponse.data.generations && resultResponse.data.generations.length > 0) {
                break;
            }

            // Wait for a short period before polling again
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        return resultResponse.data.generations[0].text || `Ah, a mysterious DM appears...\nUnfortunately, I do not possess the means to converse here.\nAs the wise say, *'The stars only align when we gather together.'*\n\nThis message, however, has been recorded in the logs, as a reminder from the past to the future.\nBeware, for all messages may one day reveal their secrets.`;
    } catch (error) {
        console.error("Error in AI Horde request:", error);
        return "Something went critically wrong 🤔";
    }
}

module.exports = generateWithHorde;
