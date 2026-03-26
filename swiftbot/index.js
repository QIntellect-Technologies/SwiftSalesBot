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
    getOrdersByPhone,
    updateOrderStatus,
    listCompanies,
    getSubstitutions,
    getMultiProductContext,
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
                    text = reply.title || reply.id;
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

    // --- PURE AGENT DISCOVERY LOGIC (NO HARDCODING) ---
    const greetingRegex = /^(hi|hello|hey|start|menu|help|hii|helo|hay|hllo)/i;
    
    // 1. Initial Greeting or Main Menu (Fetch Company List for context)
    if (normalizedText.match(greetingRegex) || metadata.button_id === 'btn_main_menu' || metadata.button_id === 'btn_back' || metadata.button_id === 'btn_companies' || metadata.button_id === 'btn_products') {
        const companies = await listCompanies();
        ragData = { query_type: 'discovery', retrieved_data: companies };
    }
    // 2. Medicine List View — ALWAYS deliver CSV link immediately, no AI needed
    else if (metadata.button_id === 'btn_medicine_list' || normalizedText === 'medicine list' || normalizedText === '💊 medicine list') {
        const baseUrl = process.env.RAILWAY_STATIC_URL || 'swiftsalesbot-production.up.railway.app';
        const csvUrl = `https://${baseUrl}/api/inventory/download`;
        const reply = `📄 *Swift Sales — Complete Medicine List*\n\nBrowse our full inventory of medicines, prices, and stock below:\n\n🔗 ${csvUrl}\n\nOnce you've browsed, just type the medicine name and I'll handle the rest!\n\n◌${PROCESS_ID}`;
        const listButtons = [
            { id: 'btn_about', title: 'ℹ️ About Us' },
            { id: 'btn_contact', title: '📞 Contact Agent' }
        ];
        await sendMessage(from, reply, listButtons);
        addToHistory(from, 'user', text);
        addToHistory(from, 'assistant', `📄 Medicine list CSV link sent: ${csvUrl}`);
        return; // Short-circuit, don't go to AI
    }
    // 3. Search (Enhanced for Multi-Product or Single Search) & Order Tracking
    else {
        // --- ULTIMATE AGENT: ORDER STATUS LOOKUP ---
        if (normalizedText.includes('order status') || normalizedText.includes('where is my order') || normalizedText.includes('track')) {
            const orders = await getOrdersByPhone(from);
            ragData = { query_type: 'order_history', retrieved_data: orders };
        } else {
            const separators = /[\,&\+]|\band\b/gi;
            const potentialProducts = text.split(separators).map(p => p.trim()).filter(p => p.length > 2);
            
            let searchResults = [];
            if (potentialProducts.length > 1) {
                searchResults = await getMultiProductContext(potentialProducts);
            } else {
                searchResults = await searchMedicine(text);
                // If out of stock, attach substitutions
                if (searchResults.length === 1 && searchResults[0].stock_qty <= 0) {
                    searchResults[0].substitutions = await getSubstitutions(searchResults[0].generic_name, searchResults[0].product_id);
                }
            }

            if (searchResults.length > 0) {
                ragData = { query_type: 'product_context', retrieved_data: searchResults };
            }
        }
    }

    // --- ULTIMATE AGENT: LONG-TERM MEMORY INJECTION ---
    const pastOrders = await getOrdersByPhone(from);
    if (pastOrders.length > 0) {
        ragData.customer_history = pastOrders.map(o => `Order ${o.order_number}: ${o.status} (${o.created_at})`).join(' | ');
        // Auto-fill session if not set
        if (!session.customer_name) session.customer_name = pastOrders[0].customer_name;
        if (!session.delivery_address) session.delivery_address = pastOrders[0].delivery_address;
    }

    // AI Generation
    let aiPrompt = text;
    if (session.current_step === 'medicine_list_view' && !text.toLowerCase().includes('download')) {
        // If they are in medicine_list_view but ask something else, let the AI handle it
        aiPrompt = text;
    }

    const { content: aiReply, actions } = await generateAIResponse(aiPrompt, ragData, session);

    // AI Actions
    let aiSuggestedButtons = [];
    let orderPlacedResult = null;
    if (actions && actions.length > 0) {
        let cart = [...session.cart];
        for (const a of actions) {
            if (a.type === 'ADD_TO_CART') {
                cart.push({ product_id: a.product_id, product_name: a.product_name, quantity: a.quantity, unit_price: a.price, subtotal: a.quantity * a.price });
            } else if (a.type === 'SET_BUTTONS') {
                aiSuggestedButtons = a.buttons;
            } else if (a.type === 'CLEAR_CART') {
                clearCart(from);
                cart = [];
            } else if (a.type === 'REMOVE_FROM_CART') {
                cart = cart.filter(item => item.product_id != a.product_id);
                updateSession(from, { cart });
            } else if (a.type === 'UPDATE_ORDER_STATUS') {
                await updateOrderStatus(a.order_id || a.order_number, a.status);
            } else if (a.type === 'PLACE_ORDER') {
                const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
                orderPlacedResult = await createOrder({
                    customer_name: a.customer_name || 'Not Provided',
                    customer_phone: a.customer_phone || from,
                    items: cart,
                    total_amount: totalAmount,
                    delivery_address: a.delivery_address || 'Not Provided',
                    pharmacy_id: '048c8e94-10f2-4dff-ae9d-1eca2a746b46'
                });
                clearCart(from);
                cart = [];
                Object.assign(session, updateSession(from, { current_step: 'order_placed' }));
            }
        }
        updateSession(from, { cart });
    }

    addToHistory(from, 'user', text);
    addToHistory(from, 'assistant', aiReply);

    let cleanReply = aiReply.replace(/(🏠|🏭|🛍️|🔍|📦|✅|❌|➕|🔙|ℹ️)\s*.*?(?=($|\n))/g, '').trim();

    let buttons = aiSuggestedButtons.slice(0, 3).map(b => ({
        id: b.id || 'btn_ai',
        title: String(b.title).substring(0, 20)
    }));

    // Smart server-side fallback: if AI forgot buttons, provide smart defaults based on cart state
    if (buttons.length === 0) {
        const currentCart = session.cart || [];
        if (session.current_step === 'order_placed') {
            // Post-order: offer to reorder or track
            buttons = [
                { id: 'btn_medicine_list', title: '💊 Order Again' },
                { id: 'btn_track', title: '📦 Track Order' }
            ];
        } else if (currentCart.length > 0) {
            // Has items: most logical action is checkout or add more
            buttons = [
                { id: 'checkout', title: '✅ Checkout' },
                { id: 'btn_medicine_list', title: '➕ Add More' },
                { id: 'btn_home', title: '🏠 Home' }
            ];
        } else {
            // New / empty cart: show discovery options
            buttons = [
                { id: 'btn_medicine_list', title: '💊 Medicine List' },
                { id: 'btn_about', title: 'ℹ️ About Us' }
            ];
        }
    }


    await sendMessage(from, `${cleanReply}\n\n◌${PROCESS_ID}`, buttons.slice(0, 3));
}

// --- ADMIN API ROUTES ---
const db = require('./db');
try { db.db.exec('ALTER TABLE medicines ADD COLUMN product_id TEXT'); } catch (_) { }
try { db.db.exec("ALTER TABLE medicines ADD COLUMN stock_status TEXT DEFAULT 'In Stock'"); } catch (_) { }

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
                await db.run('UPDATE medicines SET name=?, manufacturer=?, price=?, generic_name=?, package_size=?, stock_status=? WHERE id=?', [row.medicine_name, row.company, parseFloat(row.price) || 0, row.category, row.pack_size, row.stock_status, existing.id]);
            } else {
                let catId = null;
                if (row.category) {
                    const cat = await db.get('SELECT id FROM categories WHERE name = ?', [row.category]);
                    if (cat) catId = cat.id;
                    else { const r = await db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [row.category]); catId = r.lastID; }
                }
                await db.run('INSERT INTO medicines (product_id, name, manufacturer, price, stock_status, generic_name, package_size, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [String(row.product_id || ''), row.medicine_name, row.company, parseFloat(row.price) || 0, row.stock_status, row.category, row.pack_size, catId]);
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
            csv += `"${String(m.product_id || '').replace(/"/g, '""')}","${String(m.name || '').replace(/"/g, '""')}","${String(m.package_size || '').replace(/"/g, '""')}","${String(m.category || '').replace(/"/g, '""')}","${String(m.company || '').replace(/"/g, '""')}",${m.price || 0},"${String(m.stock_status || 'In Stock').replace(/"/g, '""')}"\n`;
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
