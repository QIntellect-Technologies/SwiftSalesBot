
const { searchMedicine, listCategories, getProductsByCategory } = require('./rag');
const { generateAIResponse } = require('./groq');
const { addToHistory, getSession, updateSession } = require('./memory');
require('dotenv').config();

async function testBot(userId, query) {
    console.log(`\n--- [USER: ${userId}] Query: "${query}" ---`);

    const session = getSession(userId);
    let ragData = { query_type: 'none', retrieved_data: [] };

    // Basic logic simulation from index.js
    if (query.toLowerCase().includes('show products')) {
        const categories = await listCategories();
        ragData = { query_type: 'category_list', retrieved_data: categories };
        updateSession(userId, { current_step: 'browsing_categories', last_categories: categories });
    } else if (session.current_step === 'browsing_categories' && /^\d+$/.test(query)) {
        const index = parseInt(query) - 1;
        const categories = session.last_categories || (await listCategories());
        if (categories[index]) {
            const products = await getProductsByCategory(categories[index].name, 1);
            ragData = { query_type: 'product_list', category: categories[index].name, retrieved_data: products };
            updateSession(userId, {
                current_step: 'browsing_products',
                last_category: categories[index].name,
                last_products: products,
                last_page: 1
            });
        }
    } else {
        const searchResults = await searchMedicine(query);
        if (searchResults.length > 0) {
            ragData = { query_type: 'product_search', retrieved_data: searchResults };
        }
    }

    console.log('Generating AI Response...');
    const aiReply = await generateAIResponse(query, ragData, session);

    console.log('\n--- SWIFTBOT RESPONSE ---');
    console.log(aiReply);
    console.log('-------------------------\n');

    addToHistory(userId, 'user', query);
    addToHistory(userId, 'assistant', aiReply);
}

(async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const testUser = '923008607811';

    // Test Flow v3.0
    await testBot(testUser, 'Hi there!');
    await sleep(5000);

    await testBot(testUser, 'Show Products');
    await sleep(5000);

    await testBot(testUser, '1'); // Select first category
    await sleep(5000);

    await testBot(testUser, 'I want to order Amoxil');
    await sleep(5000);
})();
