const axios = require('axios');
const config = require('../config');

// Function to make AI Horde requests
async function generateWithHorde(prompt) {
    try {
        // Initial request to generate text
        const initialResponse = await axios.post("https://stablehorde.net/api/v2/generate/text/async", {
            prompt: prompt,
            params: {
                "max_context_length": 200,
                "max_length": 200,
                "frmttriminc": true,
                "temperature": 1,
                "top_p": 0.9,
                "rep_pen": 1.2
            }
        }, {
            headers: { "apikey": config.hordeApiKey }
        });

        // For debugging
        console.log('AI Horde initial response:', initialResponse.data);

        const requestId = initialResponse.data.id;

        // Polling for the result
        let resultResponse;
        while (true) {
            resultResponse = await axios.get(`https://stablehorde.net/api/v2/generate/text/status/${requestId}`, {
                headers: { "apikey": config.hordeApiKey }
            });

            // For debugging
            console.log('AI Horde polling response:', resultResponse.data);

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