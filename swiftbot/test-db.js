
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (!error) {
        console.log('ORDERS COLUMNS:', Object.keys(data[0] || {}));
        console.log('ORDERS SAMPLE:', data[0]);
    } else {
        console.log('ERROR:', error.message);
    }
}

checkOrders();
