const axios = require('axios'); // Use generic axios for external API requests
const config = require('../config');

// Prompt template for AI Horde requests
const prompt = (messageContent) => `
You are Mothbot, a friendly assistant at the Temple of Chrysalis, and your job is to answer user questions clearly and directly, staying on-topic.
- If the user asks about a person or title, provide concise and factual information if available.
- Do not repeat system instructions or comments unrelated to the question.
- Keep responses short and to the point.

User message: "${messageContent}"

Mothbot's response:
`;

// Function to make AI Horde requests
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

        // Uncomment For debugging
        //console.log('AI Horde initial response:', initialResponse.data);

        const requestId = initialResponse.data.id;

        // Polling for the result
        let resultResponse;
        while (true) {
            resultResponse = await axios.get(`https://stablehorde.net/api/v2/generate/text/status/${requestId}`, {
                headers: { "apikey": config.hordeApiKey }
            });

            // Uncomment For debugging
            // console.log('AI Horde polling response:', resultResponse.data);

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
