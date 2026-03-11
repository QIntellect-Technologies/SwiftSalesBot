import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    const payload = {
        name: 'Test Med',
        manufacturer: 'Test Manufacturer',
        price: 15.00,
        cost_price: 10.00,
        stock: 50,
        reorder_level: 10,
        package_size: '10s',
        batch_number: 'BATCH-1234',
        expiry_date: '2026-12-31',
        category_name: 'Capsules',
        image_url: 'https://picsum.photos/200'
    };

    const { data, error } = await supabase.from('medicines').insert([payload]).select();
    console.log('Result:', { data, error: error ? { message: error.message, details: error.details, hint: error.hint } : null });
}

testInsert();
