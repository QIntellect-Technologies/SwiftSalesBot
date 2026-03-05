
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://utbbhoieopiugfzqighk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Try to find the categories table
    const { data: catData, error: catError } = await supabase.from('categories').select('*').limit(1);
    if (catError) {
        console.error('Categories Error:', catError.message);
    } else {
        console.log('CATEGORIES COLUMNS:', Object.keys(catData[0] || {}));
        console.log('CATEGORIES SAMPLE:', catData[0]);
    }

    // Try a join query to see if it works
    const { data: joinData, error: joinError } = await supabase
        .from('medicines')
        .select(`
            *,
            categories (
                name
            )
        `)
        .limit(1);

    if (joinError) {
        console.error('Join Error:', joinError.message);
    } else {
        console.log('JOIN SAMPLE:', JSON.stringify(joinData[0], null, 2));
    }
}

check();
