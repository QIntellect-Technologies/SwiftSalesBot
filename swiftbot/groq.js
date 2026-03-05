
const axios = require('axios');
const prompt = require('./prompt');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateAIResponse(userMessage, ragData, session) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY is missing');

        // Structured Context Injection (Section 6 of Prompt v3.0)
        const contextInjection = `
RAG_CONTEXT: ${JSON.stringify(ragData, null, 2)}

USER_SESSION: ${JSON.stringify({
            phone: session.userId,
            current_step: session.current_step,
            cart: session.cart,
            cart_total: session.cart_total,
            last_category: session.last_category,
            last_page: session.last_page
        }, null, 2)}
`;

        const messages = [
            { role: 'system', content: prompt },
            { role: 'system', content: contextInjection },
            ...session.history.slice(-10), // Last 10 messages for context
            { role: 'user', content: userMessage }
        ];

        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 0.9,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        let content = response.data.choices[0].message.content;

        // Clean leading/trailing quotes and extra whitespace
        content = content.trim();
        if (content.startsWith('"') && content.endsWith('"')) {
            content = content.substring(1, content.length - 1).trim();
        }

        return content;
    } catch (error) {
        console.error('Error in Groq AI response:', error.response?.data || error.message);
        return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again or contact us directly at 03008607811.";
    }
}

module.exports = { generateAIResponse };
