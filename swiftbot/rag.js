const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://utbbhoieopiugfzqighk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .limit(10);

        if (error) throw error;

        return data.map(cat => ({
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
        const { data, error } = await supabase
            .from('medicines')
            .select('manufacturer')
            .not('manufacturer', 'is', null);

        if (error) throw error;

        // Get unique manufacturers
        const uniqueCompanies = [...new Set(data.map(m => m.manufacturer))].slice(0, 10);
        return uniqueCompanies.map((name, index) => ({
            id: `comp_${index}`,
            name: name
        }));
    } catch (error) {
        console.error('Error listing companies:', error.message);
        return [];
    }
}

async function getCategoriesByCompany(companyName) {
    try {
        const { data, error } = await supabase
            .from('medicines')
            .select(`
                category_id,
                categories (
                    id,
                    name
                )
            `)
            .eq('manufacturer', companyName);

        if (error) throw error;

        // Filter and get unique categories
        const categories = data
            .filter(med => med.categories)
            .map(med => med.categories);

        const uniqueCategories = [];
        const seenIds = new Set();

        categories.forEach(cat => {
            if (!seenIds.has(cat.id)) {
                seenIds.add(cat.id);
                uniqueCategories.push(cat);
            }
        });

        return uniqueCategories.slice(0, 10);
    } catch (error) {
        console.error('Error fetching categories by company:', error.message);
        return [];
    }
}

async function getProductsByCompanyAndCategory(companyName, categoryOrId, page = 1) {
    try {
        console.log(`[RAG] Fetching products for Company: ${companyName}, Category/ID: ${categoryOrId}`);
        const limit = 10; // Increased limit for medicine popup
        const offset = (page - 1) * limit;

        let categoryId = null;
        if (typeof categoryOrId === 'string' && categoryOrId.length > 20) {
            // Likely a UUID
            categoryId = categoryOrId;
        } else {
            const { data: catData } = await supabase.from('categories').select('id').eq('name', categoryOrId).single();
            categoryId = catData ? catData.id : null;
        }

        let query = supabase
            .from('medicines')
            .select(`
                *,
                categories (
                    name
                )
            `)
            .eq('manufacturer', companyName)
            .range(offset, offset + limit - 1);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        console.log(`[RAG] Found ${data.length} products.`);

        return data.filter(med => med.name).map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name || '',
            category: med.categories ? med.categories.name : 'Medicines',
            manufacturer: med.manufacturer || 'Swift Sales',
            pack_size: med.package_size || 'Unit',
            price_unit: med.price || 0,
            price_box: med.price_box || (med.price ? med.price * 10 : 0),
            stock_qty: med.stock || 0,
            stock_status: med.status || 'Available',
            min_order: med.min_order_qty || 1
        }));
    } catch (error) {
        console.error('Error fetching products by company and category:', error.message);
        return [];
    }
}

async function getProductsByCategory(categoryName, page = 1) {
    try {
        const limit = 5;
        const offset = (page - 1) * limit;

        const { data: catData } = await supabase.from('categories').select('id').eq('name', categoryName).single();
        const categoryId = catData ? catData.id : null;

        let query = supabase
            .from('medicines')
            .select(`
                *,
                categories (
                    name
                )
            `)
            .range(offset, offset + limit - 1);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.filter(med => med.name).map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name || '',
            category: med.categories ? med.categories.name : 'Medicines',
            manufacturer: med.manufacturer || 'Swift Sales',
            pack_size: med.package_size || 'Unit',
            price_unit: med.price || 0,
            price_box: med.price_box || (med.price ? med.price * 10 : 0),
            stock_qty: med.stock || 0,
            stock_status: med.status || 'Available',
            min_order: med.min_order_qty || 1
        }));
    } catch (error) {
        console.error('Error fetching products by category:', error.message);
        return [];
    }
}

async function searchMedicine(queryText) {
    try {
        const { data, error } = await supabase
            .from('medicines')
            .select(`
                *,
                categories (
                    name
                )
            `)
            .or(`name.ilike.%${queryText}%,generic_name.ilike.%${queryText}%`)
            .limit(5);

        if (error) throw error;
        return data.filter(med => med.name).map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name || '',
            category: med.categories ? med.categories.name : 'Medicines',
            manufacturer: med.manufacturer || 'Swift Sales',
            pack_size: med.package_size || 'Unit',
            price_unit: med.price || 0,
            price_box: med.price_box || (med.price ? med.price * 10 : 0),
            stock_qty: med.stock || 0,
            stock_status: med.status || 'Available',
            min_order: med.min_order_qty || 1
        }));
    } catch (error) {
        console.error('Error searching medicine:', error.message);
        return [];
    }
}

async function getMedicineById(productId) {
    try {
        const { data, error } = await supabase
            .from('medicines')
            .select(`
                *,
                categories (
                    name
                )
            `)
            .eq('id', productId)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            product_id: data.id,
            name: data.name,
            generic_name: data.generic_name || '',
            category: data.categories ? data.categories.name : 'Medicines',
            manufacturer: data.manufacturer || 'Swift Sales',
            pack_size: data.package_size || 'Unit',
            price_unit: data.price || 0,
            price_box: data.price_box || (data.price ? data.price * 10 : 0),
            stock_qty: data.stock || 0,
            stock_status: data.status || 'Available',
            min_order: data.min_order_qty || 1
        };
    } catch (error) {
        console.error('Error fetching medicine by ID:', error.message);
        return null;
    }
}

async function createOrder(orderData) {
    try {
        const orderNumber = `SW-${Date.now().toString().slice(-6)}`;
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                ...orderData,
                order_number: orderNumber,
                status: 'pending',
                mode: 'WhatsApp',
                payment_method: 'Cash on Delivery',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error creating order:', error.message);
        return null;
    }
}

module.exports = {
    listCategories,
    getProductsByCategory,
    searchMedicine,
    getMedicineById,
    createOrder,
    listCompanies,
    getCategoriesByCompany,
    getProductsByCompanyAndCategory
};
