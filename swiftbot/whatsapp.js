
const axios = require('axios');
require('dotenv').config();

const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'meta';
const WHAPI_API_TOKEN = process.env.WHAPI_API_TOKEN;
const WHAPI_BASE_URL = 'https://gate.whapi.cloud';

// Wati Configuration (legacy/fallback)
const WATI_API_ENDPOINT = process.env.WATI_API_ENDPOINT;
const WATI_API_TOKEN = process.env.WATI_API_TOKEN;

async function sendMetaMessage(to, text, buttons = [], list = null) {
    const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
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
                            rows: list.rows
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
                                title: (btn.title || '').substring(0, 20)
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

        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error sending Meta message:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
}

/**
 * Wati API Implementation
 */
async function sendWatiMessage(to, text, buttons = null, list = null) {
    const baseUrl = WATI_API_ENDPOINT;
    const token = WATI_API_TOKEN;

    if (!baseUrl || !token) {
        throw new Error('WATI_API_ENDPOINT or WATI_API_TOKEN is missing');
    }

    try {
        let authHeader = token;
        // Only add Bearer if it's a JWT (starts with ey...) and doesn't already have it
        if (!authHeader.startsWith('Bearer ') && authHeader.startsWith('ey')) {
            authHeader = `Bearer ${authHeader}`;
        }
        
        let endpoint = `${baseUrl}/api/v1/sendSessionMessage/${to}?text=${encodeURIComponent(text)}`;
        let payload = null;
        let headers = { 'Authorization': authHeader };

        if (list) {
            endpoint = `${baseUrl}/api/v1/sendInteractiveListMessage?whatsappNumber=${to}`;
            payload = {
                header: list.header || 'Swift Sales',
                body: text,
                footer: list.footer || 'Select an option',
                buttonText: list.buttonText || 'View Options',
                sections: [{
                    title: list.title || 'Options',
                    rows: list.rows.map(row => ({
                        id: row.id,
                        title: row.title.substring(0, 24),
                        description: row.description ? row.description.substring(0, 72) : ''
                    }))
                }]
            };
        } else if (buttons && buttons.length > 0) {
            endpoint = `${baseUrl}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${to}`;
            payload = {
                header: '',
                body: text,
                footer: '',
                buttons: buttons.map(btn => ({
                    id: btn.id,
                    text: btn.title.substring(0, 20)
                }))
            };
        }

        const response = payload 
            ? await axios.post(endpoint, payload, { headers })
            : await axios.post(endpoint, {}, { headers });

        console.log('Wati API Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('Error sending Wati message:', error.message);
        if (error.response) {
            console.error('Wati API Error Response:', JSON.stringify({
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            }, null, 2));
        }
        return null;
    }
}

/**
 * Whapi API Implementation
 */
async function sendWhapiMessage(to, text, buttons = null, list = null) {
    console.log(`[WHAPI-SEND] Sending to ${to}: "${text.substring(0, 50)}..."`);
    const token = WHAPI_API_TOKEN;
    const baseUrl = WHAPI_BASE_URL;

    if (!token) {
        console.error('WHAPI_API_TOKEN is missing!');
        return null;
    }

    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        let endpoint = `${baseUrl}/messages/text`;
        let payload = {
            "to": to,
            "body": text
        };

        if (buttons && buttons.length > 0) {
            endpoint = `${baseUrl}/messages/interactive`;
            payload = {
                "to": to,
                "type": "button",
                "body": { "text": text },
                "action": {
                    "buttons": buttons.map(b => ({
                        "type": "quick_reply",
                        "id": b.id,
                        "title": b.title
                    }))
                }
            };
        } else if (list && list.rows && list.rows.length > 0) {
            endpoint = `${baseUrl}/messages/interactive`;
            payload = {
                "to": to,
                "type": "list",
                "body": text,
                "action": {
                    "button": list.buttonText || "Select",
                    "sections": [{
                        "title": list.title || "Options",
                        "rows": list.rows.map(row => ({
                            "id": row.id,
                            "title": row.title.substring(0, 24),
                            "description": row.description ? row.description.substring(0, 72) : ""
                        }))
                    }]
                }
            };
        }

        const response = await axios.post(endpoint, payload, { headers });
        console.log('Whapi API Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('Error sending Whapi message:', error.message);
        if (error.response) {
            console.error('Whapi API Error Response:', JSON.stringify({
                status: error.response.status,
                data: error.response.data
            }, null, 2));
        }
        return null;
    }
}

/**
 * Main function to send messages through the selected provider
 */
async function sendMessage(to, text, buttons = null, list = null) {
    if (WHATSAPP_PROVIDER === 'wati') {
        return sendWatiMessage(to, text, buttons, list);
    } else if (WHATSAPP_PROVIDER === 'whapi') {
        return sendWhapiMessage(to, text, buttons, list);
    } else {
        return sendMetaMessage(to, text, buttons, list);
    }
}

module.exports = { sendMessage };
