
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { listCategories, getProductsByCategory, searchMedicine } = require('./rag');
const { generateAIResponse } = require('./groq');
const { sendMessage } = require('./whatsapp');
const { getSession, updateSession, addToHistory } = require('./memory');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Global logger to see ANY request hitting the server
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (Object.keys(req.headers).length > 0) {
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
    }
    next();
});

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swift_sales_token';

app.get('/', (req, res) => {
    res.send('SwiftBot v3.0 Server is running!');
});

app.get('/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[VERIFY] Mode: ${mode}, Token: ${token}`);

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[VERIFY] Webhook Verified Successfully');
        res.status(200).send(challenge);
    } else {
        console.warn('[VERIFY] Webhook Verification Failed');
        res.sendStatus(403);
    }
});

// Refactored to handle processing asynchronously
app.post('/whatsapp/webhook', async (req, res) => {
    const body = req.body;
    console.log('--- INCOMING WEBHOOK ---');
    console.log(JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
        // Acknowledge Meta immediately to prevent timeouts
        res.sendStatus(200);

        try {
            const entry = body.entry[0];
            const changes = entry.changes[0].value;

            if (changes.messages && changes.messages[0]) {
                const message = changes.messages[0];
                const from = message.from;
                let text = "";
                let metadata = {};

                console.log(`[MESSAGE] From: ${from}, Type: ${message.type}`);

                if (message.type === 'interactive') {
                    if (message.interactive.type === 'button_reply') {
                        text = message.interactive.button_reply.title;
                        metadata.button_id = message.interactive.button_reply.id;
                    } else if (message.interactive.type === 'list_reply') {
                        text = message.interactive.list_reply.title;
                        metadata.list_item_id = message.interactive.list_reply.id;
                    }
                } else if (message.type === 'text') {
                    text = message.text.body;
                }

                if (!text) {
                    console.log('[DEBUG] No text content found in message');
                    return;
                }

                console.log(`[PROCESS] User Input: "${text}"`);

                const session = getSession(from);
                let ragData = { query_type: 'none', retrieved_data: [] };

                // --- STATE MACHINE & RAG LOGIC ---
                if (text.toLowerCase().match(/^(hi|hello|hey|salam|aoa|start)/)) {
                    updateSession(from, { current_step: 'greeting' });
                } else if (text.toLowerCase().includes('show products') || text.toLowerCase().includes('categories')) {
                    console.log('[DEBUG] Fetching categories...');
                    const categories = await listCategories();
                    ragData = { query_type: 'category_list', retrieved_data: categories };
                    updateSession(from, { current_step: 'browsing_categories', last_categories: categories });
                } else if (session.current_step === 'browsing_categories' && /^\d+$/.test(text)) {
                    const index = parseInt(text) - 1;
                    const categories = session.last_categories || (await listCategories());
                    if (categories[index]) {
                        console.log(`[DEBUG] Category selected: ${categories[index].name}`);
                        const products = await getProductsByCategory(categories[index].name, 1);
                        ragData = { query_type: 'product_list', category: categories[index].name, retrieved_data: products };
                        updateSession(from, {
                            current_step: 'browsing_products',
                            last_category: categories[index].name,
                            last_products: products,
                            last_page: 1
                        });
                    }
                } else {
                    console.log(`[DEBUG] Searching for: ${text}`);
                    const searchResults = await searchMedicine(text);
                    if (searchResults.length > 0) {
                        ragData = { query_type: 'product_search', retrieved_data: searchResults };
                    }
                }

                console.log('[AI] Generating response...');
                const aiReply = await generateAIResponse(text, ragData, session);
                console.log(`[AI] Response generated (${aiReply.length} chars)`);

                addToHistory(from, 'user', text);
                addToHistory(from, 'assistant', aiReply);

                // --- UI ELEMENTS ---
                const buttons = [];
                const lowerReply = aiReply.toLowerCase();

                if (lowerReply.includes('show products') || lowerReply.includes('what would you like to do')) {
                    buttons.push({ id: 'btn_products', title: '🛍️ Show Products' });
                    buttons.push({ id: 'btn_orders', title: '📦 My Orders' });
                    buttons.push({ id: 'btn_about', title: 'ℹ️ About Swift Sales' });
                } else if (lowerReply.includes('view my cart') || lowerReply.includes('add to cart')) {
                    buttons.push({ id: 'btn_view_cart', title: '🛒 View My Cart' });
                    buttons.push({ id: 'btn_categories', title: '🔙 Categories' });
                    buttons.push({ id: 'btn_main', title: '🏠 Main Menu' });
                } else if (lowerReply.includes('confirm order') || lowerReply.includes('place order')) {
                    buttons.push({ id: 'btn_confirm', title: '✅ Place Order' });
                    buttons.push({ id: 'btn_edit', title: '✏️ Edit Order' });
                    buttons.push({ id: 'btn_cancel', title: '❌ Cancel' });
                } else {
                    buttons.push({ id: 'btn_products_small', title: '🛍️ Products' });
                    buttons.push({ id: 'btn_main_small', title: '🏠 Main Menu' });
                }

                console.log('[SEND] Sending message to WhatsApp...');
                await sendMessage(from, aiReply, buttons.slice(0, 3));
                console.log('[DONE] Interaction cycle complete for', from);
            }
        } catch (error) {
            console.error('[CRITICAL ERROR] in processing loop:', error);
        }
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] SwiftBot v3.0 running on 0.0.0.0:${PORT}`);
});
