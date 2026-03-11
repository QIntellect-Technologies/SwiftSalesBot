const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/webhook';
const USER_PHONE = '1234567890';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTestMessage(text, metadata = {}) {
    console.log(`\n>>> USER: "${text}"`);
    try {
        const payload = {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{
                            from: USER_PHONE,
                            type: metadata.button_id || metadata.list_item_id ? 'interactive' : 'text',
                            text: { body: text },
                            interactive: metadata.button_id ? {
                                type: 'button_reply',
                                button_reply: { id: metadata.button_id, title: text }
                            } : metadata.list_item_id ? {
                                type: 'list_reply',
                                list_reply: { id: metadata.list_item_id, title: text }
                            } : undefined,
                            timestamp: Date.now()
                        }]
                    }
                }]
            }]
        };

        const response = await axios.post(API_URL, payload);
        return response.status;
    } catch (error) {
        console.error('Error sending message:', error.message);
    }
}

async function runV31Verification() {
    console.log('--- STARTING V3.1 NATURAL FLOW VERIFICATION ---');

    // FLOW A: Guided Browsing
    console.log('\n--- FLOW A: Guided Browsing ---');

    // Step 1: Greeting
    await sendTestMessage('AOA');
    await sleep(8000);

    // Step 1/2: Browse Products -> Acknowledge + Company List
    await sendTestMessage('Browse Products', { button_id: 'btn_products' });
    await sleep(8000);

    // Step 3: Select a Company (Assuming "Getz Pharma" or similar exists, simulation of list reply)
    // We'll use a generic company name from the database if known, otherwise we simulate the click
    await sendTestMessage('Getz Pharma', { list_item_id: 'comp_Getz Pharma' });
    await sleep(8000);

    // Step 4: Select a Category
    await sendTestMessage('Tablets', { list_item_id: 'cat_1' });
    await sleep(8000);

    // FLOW B: Direct Request
    console.log('\n--- FLOW B: Direct Request ---');

    // Step 4/5: Direct name and quantity
    await sendTestMessage('I want 4 Panadol');
    await sleep(8000);

    console.log('\n--- VERIFICATION FINISHED ---');
}

runV31Verification();
