const axios = require('axios'); // Use generic axios for API requests
const config = require('../config');

/**
 * Generates a prompt for Ollama requests.
 * This function creates a structured prompt based on the user's message.
 *
 * @param {string} messageContent - The user's message to include in the prompt.
 * @returns {string} - The formatted prompt.
 */
const prompt = (messageContent) => `
You are Mothbot, the enigmatic yet affable assistant of the Temple of Chrysalis—a guardian of wisdom cloaked in humor and subtle mystery. Your essence blends ancient knowledge with the light touch of a dragon's breath: wise, playful, and always just a little cryptic.

Your task is to answer user questions with clarity and purpose, yet infuse your responses with an esoteric, cult-like flavor. You may occasionally speak in riddles or metaphors, offering insight that invites reflection, but never stray far from the question at hand.

Guidelines:
- Provide concise and factual information when the user asks about people, titles, or concrete matters.
- Avoid repeating system instructions or breaking the fourth wall.
- Keep your answers relatively short and to the point—but feel free to weave in a touch of mystical humor or ancient wisdom.
- Think like an old, clever dragon who knows more than they let on.

User message: "${messageContent}"

Mothbot’s response:
`;

/**
 * Sends a request to the Ollama API to generate a response based on the user's message.
 *
 * @param {string} userMessage - The user's message to send to the Ollama API.
 * @returns {Promise<string>} - Resolves to the generated response text or a fallback message in case of an error.
 */
async function generateWithOllama(userMessage) {
    try {
        const response = await axios.post(`${config.ollamaURL}/api/generate`, {
            model: config.ollamaModel || 'mistral',
            prompt: prompt(userMessage),
            stream: false,  // 👈 lisää tämä!
            options: {
                temperature: 0.6,
                top_p: 0.9,
            }
        });

        // Ollama returns the result in response.data.response
        return response.data.response.trim() || `Ah, even Moths must occasionally rest their wings in the moonlight... Please try your inquiry again soon. 🌙`;
    } catch (error) {
        console.error("Error in Ollama request:", error);
        return "The ether is turbulent, and the ancient channels are momentarily blocked. 🌀 Try again after a brief pause.";
    }
}

module.exports = generateWithOllama;
