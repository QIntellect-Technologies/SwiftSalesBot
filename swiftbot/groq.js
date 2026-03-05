
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
            {
                role: 'system',
                content: prompt + `\n\nCRITICAL: If you need to update the user's cart, include a JSON block at the very end of your response inside <ACTIONS> tags like this:
                <ACTIONS>[{"type": "ADD_TO_CART", "product_id": "...", "product_name": "...", "quantity": ..., "price": ...}]</ACTIONS>`
            },
            { role: 'system', content: contextInjection },
            ...session.history.slice(-10),
            { role: 'user', content: userMessage }
        ];

        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.1, // Lower temperature for more consistent action parsing
            max_tokens: 1024,
            top_p: 0.9,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        let content = response.data.choices[0].message.content || "";
        let actions = [];

        // Parse <ACTIONS> block
        const actionMatch = content.match(/<ACTIONS>(.*?)<\/ACTIONS>/s);
        if (actionMatch) {
            try {
                actions = JSON.parse(actionMatch[1]);
                content = content.replace(/<ACTIONS>.*?<\/ACTIONS>/s, '').trim();
            } catch (e) {
                console.error('Failed to parse AI actions:', e.message);
            }
        }

        // Robust cleaning:
        content = content.replace(/^(Here is|I will|Sure|Respond|Response|I'll|As a|I can).*?:/is, '').trim();
        const quoteMatch = content.match(/^"(.*)"$/s) || content.match(/^'(.*)'$/s);
        if (quoteMatch) content = quoteMatch[1].trim();
        content = content.replace(/^(Body|Text|Response|Assistant):\s*/is, '').trim();
        content = content.replace(/^["']|["']$/g, '').trim();

        return { content, actions };
    } catch (error) {
        console.error('Error in Groq AI response:', error.response?.data || error.message);
        return {
            content: "I'm sorry, I'm having trouble connecting to my central distribution system. Please try again or contact us at 03008607811.",
            actions: []
        };
    }
}

module.exports = { generateAIResponse };
