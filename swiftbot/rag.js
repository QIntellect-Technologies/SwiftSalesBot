const db = require('./db');

async function listCategories() {
    try {
        const rows = await db.all('SELECT id, name FROM categories LIMIT 10');
        return rows.map(cat => ({
            id: cat.id,
            name: cat.name
        }));
    } catch (error) {
        console.error('Error listing categories:', error.message);
        return [];
    }
}

async function listCompanies() {
    try {
        const rows = await db.all('SELECT DISTINCT manufacturer FROM medicines WHERE manufacturer IS NOT NULL');
        return rows.map(row => ({
            id: row.manufacturer,
            name: row.manufacturer
        }));
    } catch (error) {
        console.error('Error listing companies:', error.message);
        return [];
    }
}

async function getCategoriesByCompany(companyName) {
    try {
        const query = `
            SELECT DISTINCT COALESCE(c.name, m.generic_name, 'General') as name 
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.manufacturer = ?
            LIMIT 10
        `;
        const rows = await db.all(query, [companyName]);
        return rows.map((row, idx) => ({ id: idx + 1, name: row.name }));
    } catch (error) {
        console.error('Error fetching categories by company:', error.message);
        return [];
    }
}

async function getProductsByCompanyAndCategory(companyName, categoryOrId, page = 1) {
    try {
        console.log(`[RAG] Fetching products for Company: ${companyName}, Category: ${categoryOrId}`);
        const limit = 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT m.*, COALESCE(c.name, m.generic_name, 'General') as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.manufacturer = ? 
              AND COALESCE(c.name, m.generic_name, 'General') = ?
            LIMIT ${limit} OFFSET ${offset}
        `;
        const rows = await db.all(query, [companyName, categoryOrId]);

        return rows.map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name || '',
            category: med.category_name || 'Medicines',
            manufacturer: med.manufacturer || 'Swift Sales',
            pack_size: med.package_size || 'Unit',
            price_unit: med.price || 0,
            price_box: med.price_box || (med.price ? med.price * 10 : 0),
            stock_qty: med.stock || 0,
            stock_status: med.stock > 0 ? 'Available' : 'Out of Stock',
            min_order: med.min_order_qty || 1
        }));
    } catch (error) {
        console.error('Error fetching products by company and category:', error.message);
        return [];
    }
}

async function searchMedicine(queryText) {
    try {
        const pattern = `%${queryText.trim()}%`;
        const query = `
            SELECT m.*, COALESCE(c.name, m.generic_name, 'General') as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.name LIKE ? OR m.generic_name LIKE ? OR m.manufacturer LIKE ?
            LIMIT 5
        `;
        let rows = await db.all(query, [pattern, pattern, pattern]);

        // Fallback: If no results, try extracting keywords (excluding common words)
        if (rows.length === 0 && queryText.length > 3) {
            const keywords = queryText.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                .split(/\s+/)
                .filter(w => w.length > 2 && !['need', 'want', 'please', 'give', 'have', 'packets', 'units', 'boxes', 'order'].includes(w));
            
            if (keywords.length > 0) {
                const keywordPattern = `%${keywords[0]}%`;
                rows = await db.all(query, [keywordPattern, keywordPattern, keywordPattern]);
            }
        }
        
        return rows.map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name || '',
            category: med.category_name || 'Medicines',
            manufacturer: med.manufacturer || 'Swift Sales',
            pack_size: med.package_size || 'Unit',
            price_unit: med.price || 0,
            price_box: med.price_box || (med.price ? med.price * 10 : 0),
            stock_qty: med.stock || 0,
            stock_status: med.stock > 0 ? 'Available' : 'Out of Stock',
            min_order: med.min_order_qty || 1
        }));
    } catch (error) {
        console.error('Error searching medicine:', error.message);
        return [];
    }
}

async function getMedicineById(productId) {
    try {
        const row = await db.get(`
            SELECT m.*, c.name as category_name 
            FROM medicines m 
            JOIN categories c ON m.category_id = c.id
            WHERE m.id = ?
        `, [productId]);

        if (!row) return null;

        return {
            product_id: row.id,
            name: row.name,
            generic_name: row.generic_name || '',
            category: row.category_name || 'Medicines',
            manufacturer: row.manufacturer || 'Swift Sales',
            pack_size: row.package_size || 'Unit',
            price_unit: row.price || 0,
            price_box: row.price_box || (row.price ? row.price * 10 : 0),
            stock_qty: row.stock || 0,
            stock_status: row.stock > 0 ? 'Available' : 'Out of Stock',
            min_order: row.min_order_qty || 1
        };
    } catch (error) {
        console.error('Error fetching medicine by ID:', error.message);
        return null;
    }
}

async function getSubstitutions(genericName, excludeId) {
    try {
        const query = `
            SELECT m.*, COALESCE(c.name, m.generic_name, 'General') as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.generic_name = ? AND m.id != ? AND m.stock > 0
            LIMIT 3
        `;
        const rows = await db.all(query, [genericName, excludeId]);
        return rows.map(med => ({
            product_id: med.id,
            name: med.name,
            manufacturer: med.manufacturer,
            price: med.price,
            stock_status: 'Available'
        }));
    } catch (error) {
        console.error('Error fetching substitutions:', error.message);
        return [];
    }
}

async function getMultiProductContext(productNames) {
    const results = [];
    for (const name of productNames) {
        const matches = await searchMedicine(name);
        if (matches.length > 0) {
            const bestMatch = matches[0];
            if (bestMatch.stock_qty <= 0) {
                bestMatch.substitutions = await getSubstitutions(bestMatch.generic_name, bestMatch.product_id);
            }
            results.push(bestMatch);
        }
    }
    return results;
}

async function createOrder(orderData) {
    try {
        const orderNumber = `SW-${Date.now().toString().slice(-6)}`;
        const jsonItems = JSON.stringify(orderData.items);
        
        const result = await db.run(`
            INSERT INTO orders 
            (order_number, customer_name, customer_phone, items, total_amount, delivery_address, status, mode, payment_method) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderNumber,
            orderData.customer_name,
            orderData.customer_phone,
            jsonItems,
            orderData.total_amount,
            orderData.delivery_address,
            'pending',
            'WhatsApp',
            'Cash on Delivery'
        ]);

        return { id: result.lastID, order_number: orderNumber, ...orderData };
    } catch (error) {
        console.error('Error creating order:', error.message);
        return null;
    }
}

module.exports = {
    listCategories,
    searchMedicine,
    getMedicineById,
    createOrder,
    listCompanies,
    getSubstitutions,
    getMultiProductContext,
    getCategoriesByCompany,
    getProductsByCompanyAndCategory
};
