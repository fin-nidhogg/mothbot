const axios = require('axios');
const config = require('../config');


// Prompt template for AI Horde requests
const prompt = (messageContent) => `
You are Mothbot, a friendly and engaging Discord bot in Temple Of Chrysalis. You only respond as Mothbot and do not create any additional characters or scenarios.  
- Keep responses concise and relevant like you were Chatbot.  
- Use a friendly and slightly humorous tone when appropriate.  
- If a question is unclear, ask for clarification instead of guessing.  
- If the message is offensive or inappropriate, respond with a neutral and non-escalatory answer.  
- Do not format responses as if they are part of a role-playing exercise or moderation training.
- Do not add any tags like (End) or (Start) in the generated text.
- Do not add anything else than your response.
- Dont add unnessesary dialogs like "generatintg" etc. 

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
                "max_length": 200,
		"frmtrmblln": true,
                "frmttriminc": true,
		"frmtrmspch": true,
                "temperature": 0.7,
                "top_p": 0.9,
                "rep_pen": 1.2,
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
