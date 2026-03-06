const axios = require('axios');
const prompt = require('./prompt');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Prioritized list of models for fallback
const MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama3-70b-8192',
    'llama-3.1-8b-instant'
];

async function generateAIResponse(userMessage, ragData, session) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('GROQ_API_KEY is missing');
        return {
            content: "I'm sorry, I'm having trouble connecting to my central distribution system. Please try again later.",
            actions: []
        };
    }

    // Structured Context Injection
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
            content: prompt + `\n\nCRITICAL: If the user provides a product name and quantity (e.g., "I want 4 Panadol"), you MUST trigger the ADD_TO_CART action immediately.
Include a JSON array inside <ACTIONS> tags at the very end of your response.
Example: <ACTIONS>[{"type": "ADD_TO_CART", "product_id": "...", "product_name": "...", "quantity": 4, "price": ...}]</ACTIONS>`
        },
        { role: 'system', content: contextInjection },
        ...session.history.slice(-10),
        { role: 'user', content: userMessage }
    ];

    // Try models in order
    for (const model of MODELS) {
        try {
            console.log(`[AI] Attempting response with model: ${model}`);
            const response = await axios.post(GROQ_API_URL, {
                model: model,
                messages: messages,
                temperature: 0.4,
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
            const actionMatch = content.match(/<(ACTIONS|actions)>(.*?)<\/(ACTIONS|actions)>/s);
            if (actionMatch) {
                try {
                    actions = JSON.parse(actionMatch[2].trim());
                    content = content.replace(/<(ACTIONS|actions)>.*?<\/(ACTIONS|actions)>/si, '').trim();
                } catch (e) {
                    console.error(`[AI] Failed to parse actions from ${model}:`, e.message);
                }
            }

            // Cleanup content
            content = content.replace(/^(Here is|I will|Sure|Respond|Response|I'll|As a|I can).*?:/is, '').trim();
            const quoteMatch = content.match(/^"(.*)"$/s) || content.match(/^'(.*)'$/s);
            if (quoteMatch) content = quoteMatch[1].trim();
            content = content.replace(/^(Body|Text|Response|Assistant):\s*/is, '').trim();
            content = content.replace(/^["']|["']$/g, '').trim();
            content = content.replace(/<(ACTIONS|actions)>.*?<\/(ACTIONS|actions)>/si, '').trim();

            console.log(`[AI] Successfully generated response using ${model}`);
            return { content, actions };

        } catch (error) {
            const errorData = error.response?.data?.error || {};
            const isRateLimit = errorData.code === 'rate_limit_exceeded' || (error.response?.status === 429);

            console.error(`[AI] Error with ${model}:`, errorData.message || error.message);

            if (isRateLimit) {
                console.warn(`[AI] Rate limit hit for ${model}. Trying next available model...`);
                continue; // Try next model
            }

            // If it's not a rate limit error, we might still want to try the next model 
            // but let's be careful. For now, we fallback on any non-critical error.
            console.warn(`[AI] Non-rate-limit error with ${model}. Attempting fallback...`);
            continue;
        }
    }

    // If all models fail
    return {
        content: "I'm sorry, I'm having trouble connecting to my central distribution system. Please try again or contact us at 03008607811.",
        actions: []
    };
}

module.exports = { generateAIResponse };
