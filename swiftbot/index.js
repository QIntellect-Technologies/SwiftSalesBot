
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

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swift_sales_token';

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry[0];
            const changes = entry.changes[0].value;

            if (changes.messages && changes.messages[0]) {
                const message = changes.messages[0];
                const from = message.from;
                let text = "";
                let metadata = {};

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

                if (!text) return res.sendStatus(200);

                const session = getSession(from);
                let ragData = { query_type: 'none', retrieved_data: [] };

                // --- STATE MACHINE & RAG LOGIC ---

                // 1. GREETING / MAIN MENU
                if (text.toLowerCase().match(/^(hi|hello|hey|salam|aoa|start)/)) {
                    updateSession(from, { current_step: 'greeting' });
                }

                // 2. SHOW PRODUCTS / CATEGORIES
                else if (text.toLowerCase().includes('show products') || text.toLowerCase().includes('categories')) {
                    const categories = await listCategories();
                    ragData = { query_type: 'category_list', retrieved_data: categories };
                    updateSession(from, { current_step: 'browsing_categories', last_categories: categories });
                }

                // 3. CATEGORY SELECTION (Numeric or specific)
                else if (session.current_step === 'browsing_categories' && /^\d+$/.test(text)) {
                    const index = parseInt(text) - 1;
                    const categories = session.last_categories || (await listCategories());
                    if (categories[index]) {
                        const products = await getProductsByCategory(categories[index].name, 1);
                        ragData = { query_type: 'product_list', category: categories[index].name, retrieved_data: products };
                        updateSession(from, {
                            current_step: 'browsing_products',
                            last_category: categories[index].name,
                            last_products: products,
                            last_page: 1
                        });
                    }
                }

                // 4. SEARCH / NATURAL LANGUAGE
                else {
                    const searchResults = await searchMedicine(text);
                    if (searchResults.length > 0) {
                        ragData = { query_type: 'product_search', retrieved_data: searchResults };
                        // Don't fix the step here, let AI decide if it's browsing or ordering
                    }
                }

                // --- AI GENERATION ---
                const aiReply = await generateAIResponse(text, ragData, session);

                // --- SESSION UPDATES ---
                addToHistory(from, 'user', text);
                addToHistory(from, 'assistant', aiReply);

                // --- UI ELEMENTS EXTRACTION ---
                const buttons = [];
                // Smart Button Detection based on AI response content/intent
                const lowerReply = aiReply.toLowerCase();

                if (lowerReply.includes('show products') || lowerReply.includes('what would you like to do')) {
                    buttons.push({ id: 'btn_products', title: '🛍️ Show Products' });
                    buttons.push({ id: 'btn_orders', title: '📦 My Orders' });
                    buttons.push({ id: 'btn_about', title: 'ℹ️ About Swift Sales' });
                } else if (lowerReply.includes('select a category')) {
                    // No buttons for list of >3 categories, prompt for numbers or list message
                } else if (lowerReply.includes('view my cart') || lowerReply.includes('add to cart')) {
                    buttons.push({ id: 'btn_view_cart', title: '🛒 View My Cart' });
                    buttons.push({ id: 'btn_categories', title: '🔙 Back to Categories' });
                    buttons.push({ id: 'btn_main', title: '🏠 Main Menu' });
                } else if (lowerReply.includes('confirm order') || lowerReply.includes('place order')) {
                    buttons.push({ id: 'btn_confirm', title: '✅ Place Order' });
                    buttons.push({ id: 'btn_edit', title: '✏️ Edit Order' });
                    buttons.push({ id: 'btn_cancel', title: '❌ Cancel' });
                } else if (buttons.length === 0) {
                    // Default fallback buttons if none specific found
                    buttons.push({ id: 'btn_products_small', title: '🛍️ Products' });
                    buttons.push({ id: 'btn_main_small', title: '🏠 Main Menu' });
                }

                // --- SEND MESSAGE ---
                await sendMessage(from, aiReply, buttons.slice(0, 3));
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`SwiftBot v3.0 running on port ${PORT}`);
});
