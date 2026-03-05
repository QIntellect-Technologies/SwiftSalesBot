
const axios = require('axios');
require('dotenv').config();

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

async function sendMessage(to, text, buttons = [], list = null) {
    try {
        const token = process.env.WHATSAPP_TOKEN;
        if (!token) throw new Error('WHATSAPP_TOKEN is missing');

        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to
        };

        if (list) {
            payload = {
                ...payload,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: list.header || 'Swift Sales' },
                    body: { text: text },
                    footer: { text: list.footer || 'Select an option' },
                    action: {
                        button: list.buttonText || 'View Options',
                        sections: [{
                            title: list.title || 'Options',
                            rows: list.rows // [{ id: 'row1', title: 'Row 1', description: 'Desc' }]
                        }]
                    }
                }
            };
        } else if (buttons.length > 0) {
            payload = {
                ...payload,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: text },
                    action: {
                        buttons: buttons.map((btn, index) => ({
                            type: 'reply',
                            reply: {
                                id: btn.id || `btn_${index}`,
                                title: btn.title
                            }
                        }))
                    }
                }
            };
        } else {
            payload = {
                ...payload,
                type: 'text',
                text: { body: text }
            };
        }

        console.log('Sending WhatsApp Payload:', JSON.stringify(payload, null, 2));
        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('WhatsApp API Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { sendMessage };
