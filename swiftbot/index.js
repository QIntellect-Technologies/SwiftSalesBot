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

// Global logger
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[CRITICAL-TRACE] ${timestamp} - ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swift_sales_token';

app.get('/', (req, res) => res.send('SwiftBot v3.1 Server is running!'));

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
    const body = req.body;
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

                if (!text) return;

                console.log(`[PROCESS] User Input: "${text}" from ${from}`);

                const session = getSession(from);
                let ragData = { query_type: 'none', retrieved_data: [] };
                let responseList = null;
                const normalizedText = text.toLowerCase().trim();

                // --- STATE MACHINE & RAG LOGIC ---

                // 1. Check for Greeting
                const greetingRegex = /^(hi|hello|hey|start|menu|help|hii|helo|hay|hllo)/i;
                if (normalizedText.match(greetingRegex)) {
                    updateSession(from, { current_step: 'greeting' });
                }
                // 2. Company List Request (Step 2)
                else if (normalizedText.includes('browse products') || normalizedText.includes('list companies') || metadata.button_id === 'btn_products' || metadata.button_id === 'btn_companies') {
                    const companies = await listCompanies();
                    ragData = { query_type: 'company_list', retrieved_data: companies };
                    updateSession(from, { current_step: 'browsing_companies', last_companies: companies });

                    responseList = {
                        header: 'Swift Sales Companies',
                        buttonText: 'Companies',
                        title: 'Select Company',
                        rows: companies.map(comp => ({
                            id: `comp_${comp.name}`,
                            title: comp.name.substring(0, 24),
                            description: `Products by ${comp.name}`.substring(0, 72)
                        }))
                    };
                }
                // 3. Company Selected (Step 3)
                else if (session.current_step === 'browsing_companies' && metadata.list_item_id && metadata.list_item_id.startsWith('comp_')) {
                    const companyName = metadata.list_item_id.replace('comp_', '');
                    const categories = await getCategoriesByCompany(companyName);
                    ragData = { query_type: 'category_list_filtered', company: companyName, retrieved_data: categories };
                    updateSession(from, {
                        current_step: 'browsing_categories_filtered',
                        selected_company: companyName,
                        last_categories: categories
                    });

                    responseList = {
                        header: `${companyName} Categories`,
                        buttonText: 'Categories',
                        title: 'Select Category',
                        rows: categories.map(cat => ({
                            id: `cat_${cat.id}`,
                            title: cat.name.substring(0, 24),
                            description: `Browse ${cat.name}`.substring(0, 72)
                        }))
                    };
                }
                // 4. Category Selected (Step 3/4)
                else if (session.current_step === 'browsing_categories_filtered' && metadata.list_item_id && metadata.list_item_id.startsWith('cat_')) {
                    const catId = metadata.list_item_id.replace('cat_', '');
                    const categories = session.last_categories || (await getCategoriesByCompany(session.selected_company));
                    const selectedCat = categories.find(c => c.id == catId);
                    if (selectedCat) {
                        const products = await getProductsByCompanyAndCategory(session.selected_company, selectedCat.name, 1);
                        ragData = { query_type: 'product_list', category: selectedCat.name, company: session.selected_company, retrieved_data: products };
                        updateSession(from, {
                            current_step: 'browsing_products',
                            last_category: selectedCat.name,
                            last_products: products,
                            last_page: 1
                        });
                    }
                }
                // 5. Product Selected (Wait for quantity)
                else if (session.current_step === 'browsing_products' && /^\d+$/.test(normalizedText)) {
                    const index = parseInt(normalizedText) - 1;
                    const product = session.last_products[index];
                    if (product) {
                        ragData = { query_type: 'product_details', retrieved_data: [product] };
                        updateSession(from, { current_step: 'awaiting_quantity', selected_product: product });
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
                // 7. Address Collection
                else if (normalizedText.match(/place order|confirm order|checkout/) || metadata.button_id === 'btn_confirm_order') {
                    if (session.cart.length > 0) {
                        updateSession(from, { current_step: 'awaiting_address' });
                    }
                }
                // 8. Final Confirmation
                else if (session.current_step === 'awaiting_address' && normalizedText.length > 5) {
                    updateSession(from, { current_step: 'confirming_order', delivery_address: text });
                }
                else if (metadata.button_id === 'btn_place_order_now') {
                    const orderResult = await createOrder({
                        customer_name: from,
                        items: session.cart,
                        total_amount: session.cart_total,
                        delivery_address: session.delivery_address,
                        pharmacy_id: '048c8e94-10f2-4dff-ae9d-1eca2a746b46'
                    });
                    if (orderResult) {
                        ragData = { query_type: 'order_success', order_number: orderResult.order_number };
                        clearCart(from);
                        updateSession(from, { current_step: 'order_placed' });
                    }
                }
                // 9. General Search / Intent Detection
                else {
                    const searchResults = await searchMedicine(text);
                    if (searchResults.length > 0) {
                        ragData = { query_type: 'product_search', retrieved_data: searchResults };
                        updateSession(from, { last_products: searchResults });
                    }
                }

                // AI Response Generation
                const { content: aiReply, actions } = await generateAIResponse(text, ragData, session);

                // --- PROCESS AI ACTIONS ---
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

                // Final Reply Cleanup (Remove robot-like lists and button-like emojis from text)
                // Removes lines like "1. Item", "AstraZeneca - ... - ...", and button titles like "🏭 List Companies"
                let cleanReply = aiReply
                    .replace(/^\d+\.\s+.*$/gm, '') // Remove "1. Item"
                    .replace(/^.* - .* - .*$/gm, '') // Remove "A - B - C" patterns
                    .replace(/(🏭|🛍️|🔍|📦|✅|❌|➕|🔙)\s*.*?(?=($|\n))/g, '') // Remove button titles in text
                    .replace(/:\s*([^.!?\n]{2,},\s*){2,}[^.!?\n]{2,}(.|$)/g, ':') // Remove comma-separated lists after a colon
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();

                if (cleanReply.length < 10) cleanReply = aiReply;

                // Two-Sentence Rule: If a list/interactive element is present, truncate AI verbosity
                if (aiSuggestedButtons.length > 0) {
                    const sentences = cleanReply.match(/[^.!?]+[.!?]+/g) || [cleanReply];
                    if (sentences.length > 2) {
                        cleanReply = sentences.slice(0, 2).join(' ').trim();
                    }
                }

                // UI Button Logic
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

                if (buttons.length === 0 && !responseList) {
                    buttons.push({ id: 'btn_main_menu', title: '🏠 Main Menu' });
                }

                await sendMessage(from, cleanReply, buttons.slice(0, 3), responseList);
            }
        } catch (error) {
            console.error('[CRITICAL ERROR]:', error);
        }
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`[SERVER] SwiftBot v3.1 running on port ${PORT}`));
