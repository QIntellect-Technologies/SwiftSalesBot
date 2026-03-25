
const axios = require('axios');

const WATI_PAYLOAD_TEXT = {
    "waId": "923006782867",
    "text": "hi",
    "type": "text",
    "id": "ABEGFR...",
    "timestamp": 1711263000
};

const WATI_PAYLOAD_BUTTON = {
    "waId": "923006782867",
    "text": "Browse Products",
    "type": "button_reply",
    "data": "btn_products"
};

async function runTest() {
    try {
        console.log('Testing Wati Text Webhook...');
        const res1 = await axios.post('http://localhost:3000/wati/webhook', WATI_PAYLOAD_TEXT);
        console.log('Response 1 Status:', res1.status);

        console.log('\nTesting Wati Button Webhook...');
        const res2 = await axios.post('http://localhost:3000/wati/webhook', WATI_PAYLOAD_BUTTON);
        console.log('Response 2 Status:', res2.status);

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response data:', error.response.data);
    }
}

runTest();
