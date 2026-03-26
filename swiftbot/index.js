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
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
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

const PORT = process.env.PORT || 3005;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swift_sales_token';

app.get('/', (req, res) => res.send('SwiftBot v4.1 Server is running!'));

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

// Wati Webhook Handler
app.post(['/', '/wati/webhook'], async (req, res) => {
    const body = req.body;
    console.error(`[WATI-WEBHOOK] Incoming Request Body: ${JSON.stringify(body, null, 2)}`);
    
    const from = body.waId || body.senderNumber;
    const isBot = body.owner || body.isOwner || false;
    let text = body.text || body.data;
    let type = body.type;
    let metadata = {};

    if (!from) return res.sendStatus(200);
    if (isBot) return res.sendStatus(200);

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
const WHAPI_LAST_MESSAGES = new Map();

app.post('/whapi/webhook', async (req, res) => {
    console.error(`[WHAPI-TRACE] Incoming POST /whapi/webhook | Body Keys: ${Object.keys(req.body)}`);
    const body = req.body;
    const messages = body.messages || [body];
    res.sendStatus(200);

    for (const msg of messages) {
        console.error(`[WHAPI-TRACE] Processing message from: ${msg.from} | Type: ${msg.type} | ID: ${msg.id}`);
        if (!msg.from || msg.from_me || !msg.id) {
            console.error(`[WHAPI-TRACE] Skipping message. Reason: ${!msg.from ? 'No from' : msg.from_me ? 'From me' : 'No ID'}`);
            continue;
        }
        if (WHAPI_PROCESSED_IDS.has(msg.id)) {
            console.error(`[WHAPI-TRACE] Skipping duplicate ID: ${msg.id}`);
            continue;
        }
        WHAPI_PROCESSED_IDS.add(msg.id);
        if (WHAPI_PROCESSED_IDS.size > 1000) WHAPI_PROCESSED_IDS.delete(WHAPI_PROCESSED_IDS.values().next().value);

        try {
            const from = msg.from.split('@')[0];
            let text = "";
            let metadata = {};

            if (msg.type === 'text') text = msg.text.body;
            else if (msg.type === 'interactive' || (msg.type === 'reply' && msg.reply)) {
                const sub = msg.interactive || msg.reply;
                const reply = sub.button_reply || sub.buttons_reply || sub.list_reply;
                if (reply) {
                    text = reply.id;
                    metadata.button_id = reply.id;
                }
            }

            const now = Date.now();
            const lastMsg = WHAPI_LAST_MESSAGES.get(from);
            if (lastMsg && lastMsg.text === text && (now - lastMsg.timestamp) < 2000) {
                console.error(`[WHAPI-TRACE] Skipping content duplicate from ${from}`);
                continue;
            }
            WHAPI_LAST_MESSAGES.set(from, { text, timestamp: now });

            if (text && typeof text === 'string') text = text.replace(/^(ButtonsV3:|ListV3:)/, '');
            if (metadata.button_id && typeof metadata.button_id === 'string') metadata.button_id = metadata.button_id.replace(/^(ButtonsV3:|ListV3:)/, '');

            console.error(`[WHAPI-TRACE] Final Processed Text: "${text}" | Metadata: ${JSON.stringify(metadata)}`);
            if (!text && !metadata.button_id) {
                console.error(`[WHAPI-TRACE] No text or button_id found, skipping processIncomingMessage`);
                continue;
            }
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

    // 1. Check for Greeting or Navigation
    const greetingRegex = /^(hi|hello|hey|start|menu|help|hii|helo|hay|hllo)/i;
    if (normalizedText.match(greetingRegex) || metadata.button_id === 'btn_main_menu' || metadata.button_id === 'btn_back') {
        Object.assign(session, updateSession(from, { current_step: 'main_menu' }));
    }
    else if (metadata.button_id === 'btn_medicine_list') {
        Object.assign(session, updateSession(from, { current_step: 'medicine_list_view' }));
    }
    // 2. Company/Product Browsing
    else if (normalizedText.includes('browse products') || normalizedText.includes('list companies') || metadata.button_id === 'btn_products' || metadata.button_id === 'btn_companies' || metadata.button_id === 'btn_add_more') {
        let companyName = session.selected_company;
        if (metadata.button_id === 'btn_add_more' && companyName) {
            const categories = await getCategoriesByCompany(companyName);
            ragData = { query_type: 'category_list_filtered', company: companyName, retrieved_data: categories };
            Object.assign(session, updateSession(from, { current_step: 'browsing_categories_filtered', last_categories: categories }));
        } else {
            const companies = await listCompanies();
            ragData = { query_type: 'company_list', retrieved_data: companies };
            Object.assign(session, updateSession(from, { current_step: 'browsing_companies', last_companies: companies }));
        }
    }
    else if (session.current_step === 'browsing_companies') {
        let companyName = null;
        if (metadata.list_item_id?.startsWith('comp_')) companyName = metadata.list_item_id.replace('comp_', '');
        else if (session.last_companies) {
            const isNum = /^\d+$/.test(normalizedText);
            if (isNum) {
                const idx = parseInt(normalizedText) - 1;
                if (idx >= 0 && idx < session.last_companies.length) companyName = session.last_companies[idx].name;
            } else {
                companyName = session.last_companies.find(c => c.name.toLowerCase() === normalizedText)?.name;
            }
        }
        if (companyName) {
            const categories = await getCategoriesByCompany(companyName);
            ragData = { query_type: 'category_list_filtered', company: companyName, retrieved_data: categories };
            Object.assign(session, updateSession(from, { current_step: 'browsing_categories_filtered', selected_company: companyName, last_categories: categories }));
        }
    }
    else if (session.current_step === 'browsing_categories_filtered') {
        let catId = null;
        const categories = session.last_categories || [];
        if (metadata.list_item_id?.startsWith('cat_')) catId = metadata.list_item_id.replace('cat_', '');
        else {
            const isNum = /^\d+$/.test(normalizedText);
            if (isNum) {
                const idx = parseInt(normalizedText) - 1;
                if (idx >= 0 && idx < categories.length) catId = categories[idx].id;
            } else {
                catId = categories.find(c => c.name.toLowerCase() === normalizedText)?.id;
            }
        }
        const selectedCat = categories.find(c => c.id == catId);
        if (selectedCat) {
            const products = await getProductsByCompanyAndCategory(session.selected_company, selectedCat.name, 1);
            ragData = { query_type: 'product_list', category: selectedCat.name, company: session.selected_company, retrieved_data: products };
            Object.assign(session, updateSession(from, { current_step: 'browsing_products', last_category: selectedCat.name, last_products: products, last_page: 1 }));
        }
    }
    else if (session.current_step === 'browsing_products') {
        let prodId = null;
        const products = session.last_products || [];
        if (metadata.list_item_id?.startsWith('prod_')) prodId = metadata.list_item_id.replace('prod_', '');
        else {
            const isNum = /^\d+$/.test(normalizedText);
            if (isNum) {
                const idx = parseInt(normalizedText) - 1;
                if (idx >= 0 && idx < products.length) prodId = products[idx].product_id;
            } else {
                prodId = products.find(p => p.name.toLowerCase() === normalizedText)?.product_id;
            }
        }
        const product = products.find(p => p.product_id == prodId);
        if (product) {
            ragData = { query_type: 'product_details', retrieved_data: [product] };
            Object.assign(session, updateSession(from, { current_step: 'awaiting_quantity', selected_product: product }));
        }
    }
    // 3. Ordering Flow
    else if (session.current_step === 'awaiting_quantity' && /^\d+$/.test(normalizedText)) {
        const qty = parseInt(normalizedText);
        const product = session.selected_product;
        if (product && qty > 0) {
            const updatedCart = [...session.cart, { product_id: product.product_id, product_name: product.name, quantity: qty, unit_price: product.price_unit, subtotal: qty * product.price_unit }];
            Object.assign(session, updateSession(from, { cart: updatedCart, current_step: 'cart_updated' }));
            ragData = { query_type: 'cart_update', retrieved_data: updatedCart };
        }
    }
    else if (normalizedText.match(/place order|confirm order|checkout/) || metadata.button_id === 'btn_checkout') {
        if (session.cart.length > 0) {
            Object.assign(session, updateSession(from, { current_step: 'awaiting_name' }));
            ragData = { query_type: 'order_flow', step: 'name_request' };
        }
    }
    else if (session.current_step === 'awaiting_name' && normalizedText.length > 2) {
        Object.assign(session, updateSession(from, { current_step: 'awaiting_phone', customer_name_real: text }));
        ragData = { query_type: 'order_flow', step: 'phone_request', name: text };
    }
    else if (session.current_step === 'awaiting_phone' && normalizedText.replace(/\D/g, '').length >= 10) {
        Object.assign(session, updateSession(from, { current_step: 'awaiting_address', customer_phone: text }));
        ragData = { query_type: 'order_flow', step: 'address_request', phone: text };
    }
    else if (session.current_step === 'awaiting_address' && normalizedText.length > 5) {
        const fullDetails = `${session.customer_name_real}, ${session.customer_phone}, ${text}`;
        Object.assign(session, updateSession(from, { current_step: 'confirming_order', delivery_address: fullDetails }));
        ragData = { query_type: 'order_flow', step: 'final_confirmation', details: fullDetails };
    }
    else if (metadata.button_id === 'btn_place_order_now') {
        const orderResult = await createOrder({ customer_name: session.customer_name_real || from, customer_phone: session.customer_phone || from, items: session.cart, total_amount: session.cart_total || 0, delivery_address: session.delivery_address, pharmacy_id: '048c8e94-10f2-4dff-ae9d-1eca2a746b46' });
        if (orderResult) {
            ragData = { query_type: 'order_success', order_number: orderResult.order_number };
            clearCart(from);
            Object.assign(session, updateSession(from, { current_step: 'order_placed' }));
        }
    }
    // 4. About Us
    else if (normalizedText.includes('about us') || metadata.button_id === 'btn_about') {
        ragData = { query_type: 'about_us', retrieved_data: [{ company: "Swift Sales Medicine Distributor", location: "Sardar Colony, Rahim Yar Khan", specialty: "Exclusive distributor for Shrooq, Avant, Swiss IQ, Star, and Ospheric Pharma." }] };
        Object.assign(session, updateSession(from, { current_step: 'viewing_about' }));
    }
    // 5. Default: Search
    else {
        const searchResults = await searchMedicine(text);
        if (searchResults.length > 0) {
            ragData = { query_type: 'product_search', retrieved_data: searchResults };
            Object.assign(session, updateSession(from, { last_products: searchResults }));
        }
    }

    // AI Generation
    let aiPrompt = text;
    if (session.current_step === 'main_menu') aiPrompt = "User said Hi. Respond strictly with: 'Hi, welcome to Swift Sale'.";
    else if (session.current_step === 'medicine_list_view') aiPrompt = "User wants to see the medicine list. Respond with: 'You can view our complete medicine inventory by downloading the CSV file below.'";

    const { content: aiReply, actions } = await generateAIResponse(aiPrompt, ragData, session);

    // AI Actions
    let aiSuggestedButtons = [];
    if (actions && actions.length > 0) {
        let cart = [...session.cart];
        actions.forEach(a => {
            if (a.type === 'ADD_TO_CART') cart.push({ product_id: a.product_id, product_name: a.product_name, quantity: a.quantity, unit_price: a.price, subtotal: a.quantity * a.price });
            else if (a.type === 'SET_BUTTONS') aiSuggestedButtons = a.buttons;
        });
        updateSession(from, { cart });
    }

    addToHistory(from, 'user', text);
    addToHistory(from, 'assistant', aiReply);

    let cleanReply = aiReply.replace(/(🏠|🏭|🛍️|🔍|📦|✅|❌|➕|🔙|ℹ️)\s*.*?(?=($|\n))/g, '').trim();

    if (session.current_step === 'main_menu') {
        cleanReply = "Hi, welcome to Swift Sale";
    } else if (session.current_step === 'medicine_list_view') {
        cleanReply = "You can view our complete medicine inventory by downloading the CSV file below.";
    }

    if (ragData.query_type === 'company_list') {
        const compList = ragData.retrieved_data.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
        cleanReply = `🏪 *SWIFT SALES MEDICINE DISTRIBUTOR*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nPlease select a company:\n\n${compList}`;
    } else if (ragData.query_type === 'category_list_filtered') {
        const catList = ragData.retrieved_data.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
        cleanReply = `📂 *${ragData.company} Categories*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nPlease select a category:\n\n${catList}`;
    } else if (ragData.query_type === 'product_list') {
        const prodList = ragData.retrieved_data.map((p, i) => `${i + 1}. ${p.name} - Rs.${p.price_unit}`).join('\n');
        cleanReply = `💊 *${ragData.company} - ${ragData.category}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nPlease select a medicine:\n\n${prodList}`;
    }

    let buttons = [];
    if (aiSuggestedButtons.length > 0 && session.current_step !== 'main_menu' && session.current_step !== 'medicine_list_view') {
        buttons = aiSuggestedButtons.map(b => ({ id: b.id || 'btn_ai', title: b.title }));
    }
    else {
        const lowerReply = cleanReply.toLowerCase();
        if (session.current_step === 'main_menu' || lowerReply.includes('welcome to swift sale')) {
            buttons = [{ id: 'btn_medicine_list', title: '💊 Medicine List' }, { id: 'btn_about', title: 'ℹ️ About Us' }];
        } else if (session.current_step === 'medicine_list_view') {
            const baseUrl = process.env.RAILWAY_STATIC_URL || 'swift-sales-panel-production.up.railway.app';
            cleanReply += `\n\n📄 *Download Link:*\nhttps://${baseUrl}/api/inventory/download`;
            buttons = [{ id: 'btn_back', title: '🔙 Back' }];
        } else if (lowerReply.includes('welcome') || lowerReply.includes('how can i help')) buttons = [{ id: 'btn_products', title: '🛍️ Browse Products' }, { id: 'btn_about', title: 'ℹ️ About Us' }];
        else if (lowerReply.includes('added to cart')) buttons = [{ id: 'btn_add_more', title: '➕ Add More' }, { id: 'btn_checkout', title: '✅ Place Order' }];
        else if (lowerReply.includes('successfully placed')) buttons = [{ id: 'btn_main_menu', title: '🏠 Main Menu' }];
    }

    if (buttons.length === 0) buttons.push({ id: 'btn_main_menu', title: '🏠 Main Menu' });

    await sendMessage(from, `${cleanReply}\n\n◌${PROCESS_ID}`, buttons.slice(0, 3));
}

// --- ADMIN API ROUTES ---
const db = require('./db');
try { db.db.exec('ALTER TABLE medicines ADD COLUMN product_id TEXT'); } catch(_) {}
try { db.db.exec("ALTER TABLE medicines ADD COLUMN stock_status TEXT DEFAULT 'In Stock'"); } catch(_) {}

app.get('/api/medicines', async (req, res) => {
    try {
        const rows = await db.all(`SELECT m.*, COALESCE(c.name, 'General') as category_name FROM medicines m LEFT JOIN categories c ON m.category_id = c.id ORDER BY m.name ASC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/upload', async (req, res) => {
    const { rows, mode } = req.body;
    const dupMode = mode || 'upsert';
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows provided' });

    try {
        await db.run('BEGIN TRANSACTION');
        if (dupMode === 'replace') await db.run('DELETE FROM medicines');
        for (const row of rows) {
            const existing = row.product_id ? await db.get('SELECT id FROM medicines WHERE product_id = ?', [String(row.product_id).trim()]) : null;
            if (existing && dupMode !== 'replace') {
                if (dupMode === 'skip') continue;
                await db.run('UPDATE medicines SET name=?, manufacturer=?, price=?, generic_name=?, package_size=?, stock_status=? WHERE id=?', [row.medicine_name, row.company, parseFloat(row.price)||0, row.category, row.pack_size, row.stock_status, existing.id]);
            } else {
                let catId = null;
                if (row.category) {
                    const cat = await db.get('SELECT id FROM categories WHERE name = ?', [row.category]);
                    if (cat) catId = cat.id;
                    else { const r = await db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [row.category]); catId = r.lastID; }
                }
                await db.run('INSERT INTO medicines (product_id, name, manufacturer, price, stock_status, generic_name, package_size, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [String(row.product_id||''), row.medicine_name, row.company, parseFloat(row.price)||0, row.stock_status, row.category, row.pack_size, catId]);
            }
        }
        await db.run('COMMIT');
        res.json({ success: true, count: rows.length });
    } catch (err) { await db.run('ROLLBACK'); res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/download', async (req, res) => {
    try {
        const medicines = await db.all(`SELECT product_id, name, package_size, generic_name as category, manufacturer as company, price, stock_status FROM medicines ORDER BY name ASC`);
        let csv = 'Product ID,Medicine Name,Pack Size,Category,Company,Price (Rs.),Stock Status\n';
        medicines.forEach(m => {
            csv += `"${String(m.product_id||'').replace(/"/g,'""')}","${String(m.name||'').replace(/"/g,'""')}","${String(m.package_size||'').replace(/"/g,'""')}","${String(m.category||'').replace(/"/g,'""')}","${String(m.company||'').replace(/"/g,'""')}",${m.price||0},"${String(m.stock_status||'In Stock').replace(/"/g,'""')}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=Inventory_Master.csv');
        res.status(200).send(csv);
    } catch (err) { res.status(500).send('Internal Server Error'); }
});

app.listen(PORT, '0.0.0.0', (err) => {
    if (err) return console.error('[CRITICAL-FAILURE] Port ' + PORT + ' in-use: ' + err.message);
    console.log('✅ [SERVER-READY] SQLite SwiftBot is LIVE on port ' + PORT);
});

setInterval(() => console.log(`[STATUS] Time: ${new Date().toLocaleTimeString()} | Port: ${PORT}`), 60000);
process.on('uncaughtException', (err) => console.error('[FATAL] Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('[FATAL] Unhandled Rejection:', reason));
