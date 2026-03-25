const { 
    listCategories, 
    listCompanies, 
    getProductsByCompanyAndCategory 
} = require('./rag');

async function runTest() {
    console.log('--- Testing SQLite RAG ---');
    
    console.log('1. Testing listCategories...');
    const categories = await listCategories();
    console.log('Categories:', categories);

    console.log('\n2. Testing listCompanies...');
    const companies = await listCompanies();
    console.log('Companies:', companies);

    if (companies.length > 0 && categories.length > 0) {
        console.log(`\n3. Testing getProductsByCompanyAndCategory for ${companies[0].name}...`);
        const products = await getProductsByCompanyAndCategory(companies[0].name, categories[0].name);
        console.log('Products:', products);
    }

    console.log('\n--- Test Complete ---');
}

runTest();
