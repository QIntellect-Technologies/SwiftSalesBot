
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

async function getProductsByCategory(categoryName, page = 1) {
    try {
        const limit = 5;
        const offset = (page - 1) * limit;

        // First find the category ID if categoryName is provided as a string
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
        return data.map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name,
            category: med.categories ? med.categories.name : 'Uncategorized',
            manufacturer: med.manufacturer,
            pack_size: med.package_size,
            price_unit: med.price,
            price_box: med.price_box || (med.price * 10),
            stock_qty: med.stock,
            stock_status: med.status, // Using raw status from DB
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
        return data.map(med => ({
            product_id: med.id,
            name: med.name,
            generic_name: med.generic_name,
            category: med.categories ? med.categories.name : 'Uncategorized',
            manufacturer: med.manufacturer,
            pack_size: med.package_size,
            price_unit: med.price,
            price_box: med.price_box || (med.price * 10),
            stock_qty: med.stock,
            stock_status: med.status,
            min_order: med.min_order_qty || 1
        }));
    } catch (error) {
        console.error('Error searching medicine:', error.message);
        return [];
    }
}

module.exports = { listCategories, getProductsByCategory, searchMedicine };
