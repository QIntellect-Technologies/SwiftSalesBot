
console.error('🚀 >>> SWIFTBOT PROCESS STARTED AT:', new Date().toISOString());

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { listCategories, getProductsByCategory, searchMedicine, createOrder } = require('./rag');
const { generateAIResponse } = require('./groq');
const { sendMessage } = require('./whatsapp');
const { getSession, updateSession, addToHistory, clearCart } = require('./memory');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Global logger to see ANY request hitting the server
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[CRITICAL-TRACE] ${timestamp} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.error('[CRITICAL-RAW-BODY]:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// High-frequency Heartbeat to PROVE logs are working
setInterval(() => {
    console.error(`[ALIVE-PING] Monitoring active at ${new Date().toISOString()} - Total Mem: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
}, 30000); // Every 30 seconds

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swift_sales_token';

app.get('/', (req, res) => {
    console.error('[HTTP-HIT] Root URL / visited');
    res.send('SwiftBot v3.0 Server is running!');
});

app.get('/webhook', (req, res) => {
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
app.post('/webhook', async (req, res) => {
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
                let responseList = null; // For WhatsApp List Messages

                // --- STATE MACHINE & RAG LOGIC ---
                const normalizedText = text.toLowerCase().trim();

                if (normalizedText.match(/^(hi|hello|hey|salam|aoa|asalam|start|begin|menu|help|hii|helo)/i)) {
                    console.log('[PROCESS] Intent: Greeting');
                    updateSession(from, { current_step: 'greeting' });
                } else if (normalizedText.includes('show products') || normalizedText.includes('categories') || normalizedText.includes('browse')) {
                    console.log('[DEBUG] Fetching categories...');
                    const categories = await listCategories();
                    ragData = { query_type: 'category_list', retrieved_data: categories };
                    updateSession(from, { current_step: 'browsing_categories', last_categories: categories });

                    // Prepare List Message for categories
                    responseList = {
                        header: 'Swift Sales Categories',
                        buttonText: 'Categories',
                        title: 'Select Category',
                        rows: categories.map((cat, idx) => ({
                            id: `cat_${cat.id}`,
                            title: cat.name.substring(0, 24),
                            description: `Browse ${cat.name}`.substring(0, 72)
                        }))
                    };
                } else if (normalizedText.match(/confirm order|place order|yes/i) && session.cart.length > 0) {
                    // PLACE REAL ORDER IN SUPABASE
                    console.log('[ORDER] Placed order for:', from);
                    const orderResult = await createOrder({
                        customer_name: from, // or address if collected
                        items: session.cart,
                        total: session.cart_total,
                        pharmacy_id: '048c8e94-10f2-4dff-ae9d-1eca2a746b46' // Fixed for now or set dynamic
                    });

                    if (orderResult) {
                        ragData = { query_type: 'order_success', order_number: orderResult.order_number };
                        clearCart(from);
                        updateSession(from, { current_step: 'order_placed' });
                    }
                } else if (session.current_step === 'browsing_categories' && metadata.list_item_id) {
                    const catId = metadata.list_item_id.replace('cat_', '');
                    const categories = session.last_categories || (await listCategories());
                    const selectedCat = categories.find(c => c.id == catId);
                    if (selectedCat) {
                        console.log(`[DEBUG] Category selected: ${selectedCat.name}`);
                        const products = await getProductsByCategory(selectedCat.name, 1);
                        ragData = { query_type: 'product_list', category: selectedCat.name, retrieved_data: products };
                        updateSession(from, {
                            current_step: 'browsing_products',
                            last_category: selectedCat.name,
                            last_products: products,
                            last_page: 1
                        });
                    }
                } else {
                    console.log(`[DEBUG] Searching for: ${text}`);
                    const searchResults = await searchMedicine(text);
                    if (searchResults.length > 0) {
                        ragData = { query_type: 'product_search', retrieved_data: searchResults };
                        // AI will parse if we should add to cart
                    }
                }

                console.log('[AI] Generating response...');
                const { content: aiReply, actions } = await generateAIResponse(text, ragData, session);
                console.log(`[AI] Response generated (${aiReply.length} chars), Actions: ${actions.length}`);

                // --- PROCESS AI ACTIONS ---
                let aiSuggestedButtons = [];
                if (actions && actions.length > 0) {
                    let cart = [...session.cart];
                    actions.forEach(action => {
                        if (action.type === 'ADD_TO_CART') {
                            const existingItemIndex = cart.findIndex(item => item.product_id === action.product_id);
                            if (existingItemIndex > -1) {
                                cart[existingItemIndex].quantity += action.quantity;
                                cart[existingItemIndex].subtotal = cart[existingItemIndex].quantity * cart[existingItemIndex].unit_price;
                            } else {
                                cart.push({
                                    product_id: action.product_id,
                                    product_name: action.product_name,
                                    quantity: action.quantity,
                                    unit_price: action.price,
                                    subtotal: action.quantity * action.price
                                });
                            }
                        } else if (action.type === 'SET_BUTTONS') {
                            aiSuggestedButtons = action.buttons;
                        }
                    });
                    updateSession(from, { cart });
                }

                addToHistory(from, 'user', text);
                addToHistory(from, 'assistant', aiReply);

                // --- UI ELEMENTS ---
                let buttons = [];
                if (aiSuggestedButtons.length > 0) {
                    buttons = aiSuggestedButtons.map(b => ({ id: b.id || 'btn_ai', title: b.title }));
                } else {
                    const lowerReply = aiReply.toLowerCase();
                    if (lowerReply.includes('welcome') || lowerReply.includes('what would you like to do')) {
                        buttons.push({ id: 'btn_products', title: '🛍️ Show Products' });
                        buttons.push({ id: 'btn_orders', title: '📦 My Orders' });
                        buttons.push({ id: 'btn_about', title: 'ℹ️ About Us' });
                    } else if (lowerReply.includes('add to cart') || (normalizedText.match(/\d+/) && session.current_step === 'browsing_products')) {
                        buttons.push({ id: 'btn_view_cart', title: '🛒 View Cart' });
                        buttons.push({ id: 'btn_checkout', title: '💳 Checkout' });
                        buttons.push({ id: 'btn_categories', title: '📁 Categories' });
                    } else if (lowerReply.includes('cart') || lowerReply.includes('subtotal')) {
                        buttons.push({ id: 'btn_confirm_order', title: '✅ Place Order' });
                        buttons.push({ id: 'btn_products', title: '➕ Add More' });
                        buttons.push({ id: 'btn_cancel', title: '❌ Cancel' });
                    }
                }

                // AI sometimes mentions cart but we need to update state if it says "Added to cart"
                if (aiReply.includes('Added to your cart!')) {
                    // We assume the AI logic in generateAIResponse/groq handles the actual cart array calculation
                    // But if not, we would need to parse it here. 
                    // For now, we rely on generateAIResponse to have updated the session object passed to it.
                }

                // Fallback: Ensure at least one button exists for interaction
                if (buttons.length === 0 && !responseList) {
                    buttons.push({ id: 'btn_main_fallback', title: '🏠 Main Menu' });
                }

                console.log('[SEND] Sending message to WhatsApp...');
                await sendMessage(from, aiReply, buttons.slice(0, 3), responseList);
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
