const SUPABASE_URL = 'https://utbbhoieopiugfzqighk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bVJN1lJ6HHQb8uuVuC2Bhg_zftlkhv5';

fetch(SUPABASE_URL + '/rest/v1/medicines', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=representation'
    },
    body: JSON.stringify({
        name: 'Test Med',
        manufacturer: 'Test Manufacturer',
        price: 15.00,
        cost_price: 10.00,
        stock: 50,
        reorder_level: 10,
        package_size: '10s',
        batch_number: 'BATCH-1234',
        expiry_date: '2026-12-31',
        status: 'In Stock'
    })
}).then(res => res.json()).then(data => {
    console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
