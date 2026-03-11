require('dotenv').config();
const { generateAIResponse } = require('./groq');

async function testAI() {
    const session = {
        userId: '12345',
        history: [],
        cart: [],
        current_step: 'greeting'
    };

    console.log('--- TEST 0: Greeting (Hi) ---');
    const res0 = await generateAIResponse('Hi', { query_type: 'none', retrieved_data: [] }, { ...session, current_step: 'greeting' });
    console.log('BOT:', res0.content);

    console.log('\n--- TEST 1: Requesting Products (Acknowledgment check) ---');
    const res1 = await generateAIResponse('I want to see some medicines', { query_type: 'none', retrieved_data: [] }, session);
    console.log('BOT:', res1.content);

    console.log('\n--- TEST 2: Direct Request (Quantity extraction) ---');
    const res2 = await generateAIResponse('I want 5 Panadol', {
        query_type: 'product_search',
        retrieved_data: [{ product_id: 'p1', name: 'Panadol', price_unit: 100 }]
    }, session);
    console.log('BOT:', res2.content);
    console.log('ACTIONS:', JSON.stringify(res2.actions));
}

testAI();
