const axios = require('axios');
require('dotenv').config();

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('Phone Number ID:', phoneNumberId);

    try {
        // 1. Get Phone Number Details
        console.log('\n1. Fetching Phone Number Details...');
        const res = await axios.get(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', JSON.stringify(res.data, null, 2));

        // 2. Try simple Hello World Text with NO PREVIEW
        console.log('\n2. Attempting Simple Text Message (No Preview)...');
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "923008607811",
            type: "text",
            text: { body: "Diagnostic Test: Hello world!" }
        };

        const sendRes = await axios.post(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Send Success:', sendRes.data);

    } catch (error) {
        console.error('\n--- ERROR ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Request Payload:', error.config.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

diagnose();
