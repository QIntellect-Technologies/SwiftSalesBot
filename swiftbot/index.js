console.error('🚀 >>> SWIFTBOT PROCESS STARTED AT:', new Date().toISOString());

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const {
    listCategories,
    getProductsByCategory,
    searchMedicine,
    getMedicineById,
    createOrder,
    listCompanies,
    getCategoriesByCompany,
    getProductsByCompanyAndCategory
} = require('./rag');
const { generateAIResponse } = require('./groq');
const { sendMessage } = require('./whatsapp');
const { getSession, updateSession, addToHistory, clearCart } = require('./memory');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Environment Validation
const PROCESS_ID = Math.random().toString(36).substring(7).toUpperCase();
const REQUIRED_ENV = ['WHATSAPP_PROVIDER', 'WATI_API_ENDPOINT', 'WATI_API_TOKEN', 'GROQ_API_KEY'];
console.error(`🔍 [PROCESS-START] ID: ${PROCESS_ID}`);
console.error('🔍 Checking Environment Variables...');
REQUIRED_ENV.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ MISSING ENV: ${key}`);
    } else {
        console.error(`✅ FOUND ENV: ${key} (${key === 'WHATSAPP_TOKEN' || key === 'GROQ_API_KEY' ? 'HIDDEN' : process.env[key]})`);
    }
});

// Global logger
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[CRITICAL-TRACE] ${timestamp} - ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swift_sales_token';


app.get('/', (req, res) => res.send('SwiftBot v3.1 Server is running!'));

app.get('/test-ping', (req, res) => {
    console.error('--- PING TEST RECEIVED ---');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/test-whatsapp', async (req, res) => {
    console.error('--- WHATSAPP TEST INITIATED ---');
    const testNumber = req.query.to || '923006782867';
    try {
        const result = await sendMessage(testNumber, 'SwiftBot Diagnostic: Outgoing message test successful! ✅');
        res.json({ success: true, result });
    } catch (error) {
        console.error('--- WHATSAPP TEST FAILED ---', error.message);
        res.status(500).json({ success: false, error: error.message, details: error.response?.data });
    }
});

app.get(['/webhook', '/whatsapp/webhook'], (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    console.error(`[WEBHOOK-VERIFY] Attempting verification. Mode: ${mode}, Token Match: ${token === VERIFY_TOKEN}`);
    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.error('✅ [WEBHOOK-VERIFY] Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        console.error('❌ [WEBHOOK-VERIFY] Verification failed.');
        res.sendStatus(403);
    }
});

// Meta Webhook Handler
app.post(['/webhook', '/whatsapp/webhook'], async (req, res) => {
    const body = req.body;
    console.error(`[META-WEBHOOK] Incoming Request Body: ${JSON.stringify(body, null, 2)}`);

    if (body.object === 'whatsapp_business_account') {
        res.sendStatus(200);
        try {
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

                if (!text && !metadata.button_id && !metadata.list_item_id) return;
                await processIncomingMessage(from, text, metadata);
            }
        } catch (error) {
            console.error('[CRITICAL ERROR] in Meta post-webhook processing:', error);
        }
    } else {
        console.error('[WEBHOOK] Received non-whatsapp object:', body.object);
        res.sendStatus(404);
    }
});

// Wati Webhook Handler (also support root for user convenience)
app.post(['/', '/wati/webhook'], async (req, res) => {
    const body = req.body;
    console.error(`[WATI-WEBHOOK] Incoming Request Body: ${JSON.stringify(body, null, 2)}`);
    
    // Normalize Wati payload
    const from = body.waId || body.senderNumber;
    const isBot = body.owner || body.isOwner || false;
    let text = body.text || body.data;
    let type = body.type;
    let metadata = {};

    if (!from) {
        console.error('[WATI-WEBHOOK] No sender ID found, skipping.');
        return res.sendStatus(200);
    }

    if (isBot) {
        console.log(`[WATI-WEBHOOK] Ignoring message sent by bot to ${from}`);
        return res.sendStatus(200);
    }

    res.sendStatus(200);

    try {
        if (type === 'button_reply' || (body.data && !body.text && type !== 'text')) {
            metadata.button_id = body.data; 
            text = body.text || body.data;
        } else if (type === 'list_reply') {
            metadata.list_item_id = body.data;
            text = body.text;
        } else {
            text = body.text || body.data;
        }

        if (!text && !metadata.button_id && !metadata.list_item_id) return;
        await processIncomingMessage(from, text, metadata);

    } catch (error) {
        console.error('[CRITICAL ERROR] in Wati post-webhook processing:', error);
    }
});

// Whapi Webhook Handler
const WHAPI_PROCESSED_IDS = new Set();
const WHAPI_LAST_MESSAGES = new Map(); // sender -> { text, timestamp }

app.post('/whapi/webhook', async (req, res) => {
    const body = req.body;
    const traceId = Math.random().toString(36).substring(7).toUpperCase();
    console.log(`[TRACE-${traceId}] ${new Date().toISOString()} - POST /whapi/webhook`);

    // Whapi usually sends an array of messages or a single message object
    const messages = body.messages || [body];
    
    res.sendStatus(200);

    for (const msg of messages) {
        if (!msg.from) continue;
        if (msg.from_me) {
            console.log(`[TRACE-${traceId}] Skipping bot message from ${msg.from}`);
            continue;
        }
        if (msg.from.includes('923703002588')) {
            console.log(`[TRACE-${traceId}] Skipping loop prevention message`);
            continue;
        }
        if (!msg.id) continue;

        // 1. ID-based deduplication
        if (WHAPI_PROCESSED_IDS.has(msg.id)) {
            console.log(`[TRACE-${traceId}] Skipping duplicate message ID: ${msg.id}`);
            continue;
        }
        WHAPI_PROCESSED_IDS.add(msg.id);
        
        // Keep set size manageable
        if (WHAPI_PROCESSED_IDS.size > 1000) {
            const firstId = WHAPI_PROCESSED_IDS.values().next().value;
            WHAPI_PROCESSED_IDS.delete(firstId);
        }

        try {
            const from = msg.from.split('@')[0];
            let text = "";
            let metadata = {};

            // Normalize Whapi payload
            if (msg.type === 'text') {
                text = msg.text.body;
            } else if (msg.type === 'interactive') {
                if (msg.interactive.type === 'button_reply') {
                    text = msg.interactive.button_reply.id;
                    metadata.button_id = msg.interactive.button_reply.id;
                } else if (msg.interactive.type === 'list_reply') {
                    text = msg.interactive.list_reply.id;
                    metadata.list_item_id = msg.interactive.list_reply.id;
                }
            } else if (msg.type === 'reply' && msg.reply) {
                if (msg.reply.type === 'buttons_reply' && msg.reply.buttons_reply) {
                    text = msg.reply.buttons_reply.id;
                    metadata.button_id = msg.reply.buttons_reply.id;
                } else if (msg.reply.type === 'list_reply' && msg.reply.list_reply) {
                    text = msg.reply.list_reply.id;
                    metadata.list_item_id = msg.reply.list_reply.id;
                }
            }

            // 2. Content-based deduplication (2 second window)
            const now = Date.now();
            const lastMsg = WHAPI_LAST_MESSAGES.get(from);
            if (lastMsg && lastMsg.text === text && (now - lastMsg.timestamp) < 2000) {
                console.log(`[TRACE-${traceId}] Skipping content duplicate from ${from}: "${text}"`);
                continue;
            }
            WHAPI_LAST_MESSAGES.set(from, { text, timestamp: now });

            // Strip Whapi prefixes like "ButtonsV3:" or "ListV3:" if present
            if (text && typeof text === 'string') {
                text = text.replace(/^(ButtonsV3:|ListV3:)/, '');
            }
            if (metadata.button_id && typeof metadata.button_id === 'string') {
                metadata.button_id = metadata.button_id.replace(/^(ButtonsV3:|ListV3:)/, '');
            }
            if (metadata.list_item_id && typeof metadata.list_item_id === 'string') {
                metadata.list_item_id = metadata.list_item_id.replace(/^(ButtonsV3:|ListV3:)/, '');
            }

            if (!text && !metadata.button_id && !metadata.list_item_id) continue;
            await processIncomingMessage(from, text, metadata);

        } catch (error) {
            console.error('[CRITICAL ERROR] in Whapi post-webhook processing:', error);
        }
    }
});

// SHARED MESSAGE PROCESSOR
async function processIncomingMessage(from, text, metadata = {}) {
    console.log(`[PROCESS] User Input: "${text}" from ${from}`);

    const session = getSession(from);
    let ragData = { query_type: 'none', retrieved_data: [] };
    let responseList = null;
    const normalizedText = (text || "").toLowerCase().trim();

    // --- STATE MACHINE & RAG LOGIC ---

    // 1. Check for Greeting
    const greetingRegex = /^(hi|hello|hey|start|menu|help|hii|helo|hay|hllo)/i;
    if (normalizedText.match(greetingRegex)) {
        updateSession(from, { current_step: 'greeting' });
    }
    // 2. Company List Request
    else if (normalizedText.includes('browse products') || normalizedText.includes('list companies') || metadata.button_id === 'btn_products' || metadata.button_id === 'btn_companies' || metadata.button_id === 'btn_add_more') {
        // Handle "Add More" context
        let companyName = session.selected_company;
        if (metadata.button_id === 'btn_add_more' && companyName) {
            // Stay in the same company's categories
            const categories = await getCategoriesByCompany(companyName);
            ragData = { query_type: 'category_list_filtered', company: companyName, retrieved_data: categories };
            updateSession(from, { current_step: 'browsing_categories_filtered', last_categories: categories });
            
            responseList = {
                header: `➕ ${companyName}`,
                buttonText: 'Categories',
                title: 'Available Categories',
                rows: categories.map(cat => ({
                    id: `cat_${cat.id}`,
                    title: `📂 ${cat.name.substring(0, 20)}`,
                    description: `View ${cat.name} medicines`.substring(0, 72)
                }))
            };
        } else {
            // Show all companies
            const companies = await listCompanies();
            ragData = { query_type: 'company_list', retrieved_data: companies };
            updateSession(from, { current_step: 'browsing_companies', last_companies: companies });

            responseList = {
                header: 'Swift Sales',
                buttonText: 'Select Company',
                title: 'Available Companies',
                rows: companies.map(comp => ({
                    id: `comp_${comp.name}`,
                    title: `🏭 ${comp.name.substring(0, 20)}`,
                    description: `View products from ${comp.name}`.substring(0, 72)
                }))
            };
        }
    }
    // 3. Company Selected
    else if (session.current_step === 'browsing_companies') {
        let companyName = null;
        if (metadata.list_item_id && metadata.list_item_id.startsWith('comp_')) {
            companyName = metadata.list_item_id.replace('comp_', '');
        } else if (session.last_companies) {
            const isNum = /^\d+$/.test(normalizedText);
            if (isNum) {
                const idx = parseInt(normalizedText) - 1;
                if (idx >= 0 && idx < session.last_companies.length) companyName = session.last_companies[idx].name;
            } else {
                const match = session.last_companies.find(c => c.name.toLowerCase() === normalizedText);
                if (match) companyName = match.name;
            }
        }

        if (companyName) {
            const categories = await getCategoriesByCompany(companyName);
            ragData = { query_type: 'category_list_filtered', company: companyName, retrieved_data: categories };
            updateSession(from, { current_step: 'browsing_categories_filtered', selected_company: companyName, last_categories: categories });
            // Disable responseList due to API limits, handled in cleanReply
            responseList = null; 
        } else {
            // Retry text
            const searchResults = await searchMedicine(text);
            if (searchResults.length > 0) {
                ragData = { query_type: 'product_search', retrieved_data: searchResults };
                updateSession(from, { last_products: searchResults });
            }
        }
    }
    // 4. Category Selected
    else if (session.current_step === 'browsing_categories_filtered') {
        let catId = null;
        const categories = session.last_categories || (await getCategoriesByCompany(session.selected_company));
        
        if (metadata.list_item_id && metadata.list_item_id.startsWith('cat_')) {
            catId = metadata.list_item_id.replace('cat_', '');
        } else if (categories) {
            const isNum = /^\d+$/.test(normalizedText);
            if (isNum) {
                const idx = parseInt(normalizedText) - 1;
                if (idx >= 0 && idx < categories.length) catId = categories[idx].id; // or name
            } else {
                const match = categories.find(c => c.name.toLowerCase() === normalizedText);
                if (match) catId = match.id;
            }
        }

        const selectedCat = categories.find(c => c.id == catId);
        if (selectedCat) {
            const products = await getProductsByCompanyAndCategory(session.selected_company, selectedCat.name, 1);
            ragData = { query_type: 'product_list', category: selectedCat.name, company: session.selected_company, retrieved_data: products };
            updateSession(from, { current_step: 'browsing_products', last_category: selectedCat.name, last_products: products, last_page: 1 });
            responseList = null;
        } else {
            const searchResults = await searchMedicine(text);
            if (searchResults.length > 0) {
                ragData = { query_type: 'product_search', retrieved_data: searchResults };
                updateSession(from, { last_products: searchResults });
            }
        }
    }
    // 5. Product Selected
    else if (session.current_step === 'browsing_products') {
        let prodId = null;
        const products = session.last_products || [];
        
        if (metadata.list_item_id && metadata.list_item_id.startsWith('prod_')) {
            prodId = metadata.list_item_id.replace('prod_', '');
        } else if (products) {
            const isNum = /^\d+$/.test(normalizedText);
            if (isNum) {
                const idx = parseInt(normalizedText) - 1;
                if (idx >= 0 && idx < products.length) prodId = products[idx].product_id;
            } else {
                const match = products.find(p => p.name.toLowerCase() === normalizedText);
                if (match) prodId = match.product_id;
            }
        }

        const product = products.find(p => p.product_id == prodId);
        if (product) {
            ragData = { query_type: 'product_details', retrieved_data: [product] };
            updateSession(from, { current_step: 'awaiting_quantity', selected_product: product });
        } else {
            const searchResults = await searchMedicine(text);
            if (searchResults.length > 0) {
                ragData = { query_type: 'product_search', retrieved_data: searchResults };
                updateSession(from, { last_products: searchResults });
            }
        }
    }
    // 6. Quantity Received
    else if (session.current_step === 'awaiting_quantity' && /^\d+$/.test(normalizedText)) {
        const qty = parseInt(normalizedText);
        const product = session.selected_product;
        if (product && qty > 0) {
            const subtotal = qty * product.price_unit;
            const newCartItem = {
                product_id: product.product_id,
                product_name: product.name,
                quantity: qty,
                unit_price: product.price_unit,
                subtotal: subtotal
            };
            const updatedCart = [...session.cart, newCartItem];
            updateSession(from, { cart: updatedCart, current_step: 'cart_updated' });
            ragData = { query_type: 'cart_update', retrieved_data: updatedCart };
        }
    }
    // 7. Address & Contact Collection Flow
    else if (normalizedText.match(/place order|confirm order|checkout/) || metadata.button_id === 'btn_checkout' || metadata.button_id === 'btn_confirm_order') {
        if (session.cart.length > 0) {
            updateSession(from, { current_step: 'awaiting_name' });
            ragData = { query_type: 'order_flow', step: 'name_request' };
        }
    }
    // 8. Name Received -> Ask for Phone
    else if (session.current_step === 'awaiting_name' && normalizedText.length > 2) {
        updateSession(from, { current_step: 'awaiting_phone', customer_name_real: text });
        ragData = { query_type: 'order_flow', step: 'phone_request', name: text };
    }
    // 9. Phone Received -> Ask for Address
    else if (session.current_step === 'awaiting_phone' && normalizedText.replace(/\D/g, '').length >= 10) {
        updateSession(from, { current_step: 'awaiting_address', customer_phone: text });
        ragData = { query_type: 'order_flow', step: 'address_request', phone: text };
    }
    // 10. Address Received -> Final Confirmation
    else if (session.current_step === 'awaiting_address' && normalizedText.length > 5) {
        const fullDetails = `${session.customer_name_real}, ${session.customer_phone}, ${text}`;
        updateSession(from, { current_step: 'confirming_order', delivery_address: fullDetails });
        ragData = { query_type: 'order_flow', step: 'final_confirmation', details: fullDetails };
    }
    // 8.5 Place Order Final
    else if (metadata.button_id === 'btn_place_order_now') {
        const orderResult = await createOrder({
            customer_name: session.customer_name_real || from,
            customer_phone: session.customer_phone || from,
            items: session.cart,
            total_amount: session.cart_total || 0,
            delivery_address: session.delivery_address,
            pharmacy_id: '048c8e94-10f2-4dff-ae9d-1eca2a746b46'
        });
        if (orderResult) {
            ragData = { query_type: 'order_success', order_number: orderResult.order_number };
            clearCart(from);
            updateSession(from, { current_step: 'order_placed' });
        }
    }
    // 9. About Us
    else if (normalizedText.includes('about us') || metadata.button_id === 'btn_about') {
        ragData = {
            query_type: 'about_us',
            retrieved_data: [{
                company: "Swift Sales Medicine Distributor",
                location: "Sardar Colony, Rahim Yar Khan",
                experience: "20+ Years",
                contact: "0300-8607811",
                specialty: "Exclusive distributor for Shrooq, Avant, Swiss IQ, Star, and Ospheric Pharma."
            }]
        };
        updateSession(from, { current_step: 'viewing_about' });
    }
    // 10. Default Search
    else {
        const searchResults = await searchMedicine(text);
        if (searchResults.length > 0) {
            ragData = { query_type: 'product_search', retrieved_data: searchResults };
            updateSession(from, { last_products: searchResults });
        }
    }

    // AI Response Generation
    const { content: aiReply, actions } = await generateAIResponse(text, ragData, session);

    // Process Actions
    let aiSuggestedButtons = [];
    if (actions && actions.length > 0) {
        let cart = [...session.cart];
        actions.forEach(action => {
            if (action.type === 'ADD_TO_CART') {
                cart.push({
                    product_id: action.product_id,
                    product_name: action.product_name,
                    quantity: action.quantity,
                    unit_price: action.price,
                    subtotal: action.quantity * action.price
                });
            } else if (action.type === 'SET_BUTTONS') {
                aiSuggestedButtons = action.buttons;
            } else if (action.type === 'CLEAR_CART') {
                cart = [];
            }
        });
        updateSession(from, { cart });
    }

    addToHistory(from, 'user', text);
    addToHistory(from, 'assistant', aiReply);

    // AI Reply Cleanup
    let cleanReply = aiReply
        .replace(/^\d+\.\s+.*$/gm, '')
        .replace(/^.* - .* - .*$/gm, '')
        .replace(/(🏠|🏭|🛍️|🔍|📦|✅|❌|➕|🔙|ℹ️)\s*.*?(?=($|\n))/g, '')
        .replace(/:\s*([^.!?\n]{2,},\s*){2,}[^.!?\n]{2,}(.|$)/g, ':')
        .replace(/main menu|list companies|browse categories/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (cleanReply.length < 5 || (ragData && ragData.query_type !== 'none')) {
        if (ragData.query_type === 'company_list') {
            const compList = ragData.retrieved_data.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
            cleanReply = `🏪 *SWIFT SALES MEDICINE DISTRIBUTOR*\n*Official Distribution Channel*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nPlease select a company from the list below by replying with its name:\n\n${compList}`;
            responseList = null; // Disable interactive list to bypass 10-item limit
        } else if (ragData.query_type === 'category_list_filtered') {
            const catList = ragData.retrieved_data.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
            cleanReply = `📂 *${ragData.company} Categories*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nExcellent choice! We have the following categories for *${ragData.company}*. Please select one by name:\n\n${catList}`;
            responseList = null;
        } else if (ragData.query_type === 'product_list') {
            const prodList = ragData.retrieved_data.map((p, i) => `${i + 1}. ${p.name} - Rs.${p.price_unit}`).join('\n');
            cleanReply = `💊 *${ragData.company} - ${ragData.category}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nWe have these medicines available. Please select the one you'd like to order from the list:\n\n${prodList}`;
            responseList = null;
        } else if (aiSuggestedButtons.length > 0) {
            cleanReply = aiReply + "\n\nPlease select an option from the buttons below:";
        } else if (responseList && responseList.rows && responseList.rows.length > 0) {
            cleanReply = `We found ${responseList.rows.length} items. Please select one from the menu below:`;
        }
    }

    let finalResponseList = responseList;
    if (responseList && (!responseList.rows || responseList.rows.length === 0)) {
        finalResponseList = null;
    }

    if (aiSuggestedButtons.length > 0 || finalResponseList) {
        const sentences = cleanReply.match(/[^.!?]+[.!?]+/g) || [cleanReply];
        if (sentences.length > 2) {
            cleanReply = sentences.slice(0, 2).join(' ').trim();
        }
    }

    // Buttons
    let buttons = [];
    if (aiSuggestedButtons.length > 0) {
        buttons = aiSuggestedButtons.map(b => ({ id: b.id || 'btn_ai', title: b.title }));
    } else {
        const lowerReply = cleanReply.toLowerCase();
        if (lowerReply.includes('welcome') || lowerReply.includes('how can i help you') || lowerReply.includes('welcome to swift sales')) {
            buttons = [{ id: 'btn_products', title: '🛍️ Browse Products' }, { id: 'btn_orders', title: '📦 My Orders' }, { id: 'btn_about', title: 'ℹ️ About Us' }];
        } else if (lowerReply.includes('which company')) {
            buttons = [{ id: 'btn_companies', title: '🏭 List Companies' }, { id: 'btn_search', title: '🔍 Search Name' }];
        } else if (lowerReply.includes('how many units') || lowerReply.includes('how many boxes')) {
            buttons = [{ id: 'btn_back', title: '🔙 Back' }];
        } else if (lowerReply.includes('added') && lowerReply.includes('order')) {
            buttons = [{ id: 'btn_add_more', title: '➕ Add More' }, { id: 'btn_checkout', title: '✅ Place Order' }];
        } else if (lowerReply.includes('delivery address')) {
            buttons = [{ id: 'btn_view_cart', title: '🛒 Edit Cart' }];
        } else if (lowerReply.includes('confirm this order')) {
            buttons = [{ id: 'btn_place_order_now', title: '✅ Place Order Now' }, { id: 'btn_edit', title: '✏️ Edit' }];
        } else if (lowerReply.includes('successfully placed') || lowerReply.includes('order again')) {
            buttons = [{ id: 'btn_reorder', title: '🛍️ Order Again' }, { id: 'btn_track', title: '📦 Track Order' }, { id: 'btn_main', title: '🏠 Main Menu' }];
        }
    }

    if (buttons.length === 0 && !finalResponseList) {
        buttons.push({ id: 'btn_main_menu', title: '🏠 Main Menu' });
    }

    // Diagnostic Marker
    const markedReply = `${cleanReply}\n\n◌${PROCESS_ID}`;

    await sendMessage(from, markedReply, buttons.slice(0, 3), finalResponseList);
}

// --- ADMIN API ROUTES (SQLite Integration) ---
const db = require('./db');

// Add a simple logging middleware for the API
app.use('/api', (req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] 🌐 API REQUEST: ${req.method} ${req.originalUrl}`);
    next();
});

app.get('/api/medicines', async (req, res) => {
    try {
        console.log(`  └─ Fetching all medicines from database...`);
        const rows = await db.all('SELECT m.*, c.name as category_name FROM medicines m LEFT JOIN categories c ON m.category_id = c.id');
        console.log(`  └─ ✅ SUCCESS: Returned ${rows.length} medicines to Admin Panel.`);
        res.json(rows);
    } catch (err) {
        console.error(`  └─ ❌ ERROR fetching medicines:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/medicines', async (req, res) => {
    try {
        const data = Array.isArray(req.body) ? req.body : [req.body];
        console.log(`  └─ Initiating bulk insert for ${data.length} medicines...`);
        
        await db.run('BEGIN TRANSACTION');
        const insertStmt = 'INSERT INTO medicines (name, manufacturer, price, cost_price, stock, category_id, generic_name, package_size, batch_number, expiry_date, image_url, min_order_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        for (const med of data) {
            await db.run(insertStmt, [
                med.name, med.manufacturer, med.price || 0, med.cost_price || 0, med.stock || 0, med.category_id || null, med.generic_name || null, med.package_size || null, med.batch_number || null, med.expiry_date || null, med.image_url || null, med.min_order_qty || 1
            ]);
        }
        
        await db.run('COMMIT');
        console.log(`  └─ ✅ SUCCESS: Inserted ${data.length} medicines.`);
        res.json({ success: true, count: data.length });
    } catch (err) {
        await db.run('ROLLBACK');
        console.error(`  └─ ❌ ERROR in bulk insert:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/medicines/:id', async (req, res) => {
    try {
        console.log(`  └─ Updating medicine ID: ${req.params.id}`);
        const { name, manufacturer, price, cost_price, stock, category_id, generic_name, package_size } = req.body;
        await db.run(
            'UPDATE medicines SET name=?, manufacturer=?, price=?, cost_price=?, stock=?, category_id=?, generic_name=?, package_size=? WHERE id=?',
            [name, manufacturer, price, cost_price, stock, category_id, generic_name, package_size, req.params.id]
        );
        console.log(`  └─ ✅ SUCCESS: Medicine updated.`);
        res.json({ success: true });
    } catch (err) {
        console.error(`  └─ ❌ ERROR updating medicine:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/medicines/:id', async (req, res) => {
    try {
        console.log(`  └─ Deleting medicine ID: ${req.params.id}`);
        await db.run('DELETE FROM medicines WHERE id = ?', [req.params.id]);
        console.log(`  └─ ✅ SUCCESS: Medicine deleted.`);
        res.json({ success: true });
    } catch (err) {
        console.error(`  └─ ❌ ERROR deleting medicine:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        console.log(`  └─ Fetching all categories...`);
        const rows = await db.all('SELECT * FROM categories');
        console.log(`  └─ ✅ SUCCESS: Returned ${rows.length} categories.`);
        res.json(rows);
    } catch (err) {
        console.error(`  └─ ❌ ERROR fetching categories:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        console.log(`  └─ Fetching all orders...`);
        const rows = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        console.log(`  └─ ✅ SUCCESS: Returned ${rows.length} orders.`);
        res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items) })));
    } catch (err) {
        console.error(`  └─ ❌ ERROR fetching orders:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

const BOT_PORT = process.env.PORT || process.env.BOT_PORT || 3001;
app.listen(BOT_PORT, '0.0.0.0', () => console.log(`[SERVER] SQLite SwiftBot v4.0 running on port ${BOT_PORT}`));
