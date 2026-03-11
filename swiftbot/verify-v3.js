const { searchMedicine, listCategories, getProductsByCategory } = require('./rag');
const { generateAIResponse } = require('./groq');
const { addToHistory, getSession, updateSession, clearCart } = require('./memory');
require('dotenv').config();

async function testQuery(userId, query, metadata = {}) {
    console.log(`\n>>> USER: "${query}"`);

    const session = getSession(userId);
    let ragData = { query_type: 'none', retrieved_data: [] };
    const normalizedText = query.toLowerCase().trim();

    // SIMPLE SIMULATION OF index.js LOGIC
    if (normalizedText.match(/^(hi|hello|hey|salam|aoa)/i)) {
        updateSession(userId, { current_step: 'greeting' });
    } else if (normalizedText.includes('browse products') || metadata.button_id === 'btn_products') {
        const categories = await listCategories();
        ragData = { query_type: 'category_list', retrieved_data: categories };
        updateSession(userId, { current_step: 'browsing_categories', last_categories: categories });
    } else if (session.current_step === 'browsing_categories' && /^[1-9]$/.test(normalizedText)) {
        const index = parseInt(normalizedText) - 1;
        const categories = session.last_categories || (await listCategories());
        const selectedCat = categories[index];
        if (selectedCat) {
            const products = await getProductsByCategory(selectedCat.name, 1);
            ragData = { query_type: 'product_list', category: selectedCat.name, retrieved_data: products };
            updateSession(userId, { current_step: 'browsing_products', last_products: products });
        }
    } else if (session.current_step === 'browsing_products' && /^[1-9]$/.test(normalizedText)) {
        const index = parseInt(normalizedText) - 1;
        const product = session.last_products[index];
        if (product) {
            ragData = { query_type: 'product_details', retrieved_data: [product] };
            updateSession(userId, { current_step: 'awaiting_quantity', selected_product: product });
        }
    } else if (session.current_step === 'awaiting_quantity' && /^\d+$/.test(normalizedText)) {
        const qty = parseInt(normalizedText);
        const product = session.selected_product;
        const updatedCart = [...session.cart, { product_name: product.name, quantity: qty, unit_price: product.price_unit, subtotal: qty * product.price_unit }];
        updateSession(userId, { cart: updatedCart, current_step: 'cart_updated' });
        ragData = { query_type: 'cart_update', retrieved_data: updatedCart };
    } else if (normalizedText.includes('place order')) {
        updateSession(userId, { current_step: 'awaiting_address' });
    } else if (session.current_step === 'awaiting_address') {
        updateSession(userId, { current_step: 'confirming_order', delivery_address: query });
    } else {
        const results = await searchMedicine(query);
        if (results.length > 0) {
            ragData = { query_type: 'product_search', retrieved_data: results };
            updateSession(userId, { last_products: results });
        }
    }

    const { content, actions } = await generateAIResponse(query, ragData, session);
    console.log(`<<< BOT: ${content.substring(0, 200)}...`);

    addToHistory(userId, 'user', query);
    addToHistory(userId, 'assistant', content);
    return { content, actions };
}

async function runV3Verification() {
    const testUser = 'v3_verify_' + Date.now();
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const delay = 10000;

    console.log('\n--- STARTING V3.0 FLOW VERIFICATION ---');

    console.log('\nSTEP 1: GREETING');
    await testQuery(testUser, 'AOA');
    await sleep(delay);

    console.log('\nSTEP 2: BROWSE PRODUCTS');
    await testQuery(testUser, 'Browse Products');
    await sleep(delay);

    console.log('\nSTEP 3: SELECT CATEGORY (1)');
    await testQuery(testUser, '1');
    await sleep(delay);

    console.log('\nSTEP 4: SELECT PRODUCT (1)');
    await testQuery(testUser, '1');
    await sleep(delay);

    console.log('\nSTEP 5: PROVIDE QUANTITY (5)');
    await testQuery(testUser, '5');
    await sleep(delay);

    console.log('\nSTEP 6: PLACE ORDER');
    await testQuery(testUser, 'Place Order');
    await sleep(delay);

    console.log('\nSTEP 7: PROVIDE ADDRESS');
    await testQuery(testUser, 'Main Street, Block 5, RYK');
    await sleep(delay);

    console.log('\nSTEP 8: FINAL CHECK (Greeting shouldn\'t repeat)');
    await testQuery(testUser, 'Is it confirmed?');
    await sleep(delay);

    console.log('\n--- VERIFICATION COMPLETE ---');
}

runV3Verification().catch(console.error);
