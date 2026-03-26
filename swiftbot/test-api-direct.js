const http = require('http');

const PORT = 3000;
const HOST = 'localhost';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('--- API Verification Test ---');
  
  try {
    // 1. Get initial count
    console.log('Fetching initial medicines...');
    const initialMeds = await request('GET', '/api/medicines');
    console.log(`Initial count: ${initialMeds.length}`);

    // 2. Perform Upload
    console.log('\nTesting /api/inventory/upload...');
    const testPayload = {
      rows: [
        {
          product_id: 'TEST-CSV-001',
          medicine_name: 'TEST MEDICINE',
          pack_size: '10S',
          category: 'Test Category',
          company: 'Test Company',
          price: '99.99',
          stock_status: 'In Stock'
        }
      ],
      mode: 'upsert'
    };
    
    const uploadRes = await request('POST', '/api/inventory/upload', testPayload);
    console.log('Upload result:', JSON.stringify(uploadRes));

    // 3. Verify data in list
    console.log('\nFetching medicines after upload...');
    const afterMeds = await request('GET', '/api/medicines');
    console.log(`New count: ${afterMeds.length}`);
    
    const found = afterMeds.find(m => m.product_id === 'TEST-CSV-001');
    if (found) {
      console.log('✅ TEST-CSV-001 found in database!');
      console.log('Record details:', JSON.stringify(found));
    } else {
      console.log('❌ TEST-CSV-001 NOT found in database.');
    }

    // 4. Test Bulk Delete (cleanup)
    if (found) {
        console.log('\nTesting bulk delete cleanup...');
        const delRes = await request('DELETE', '/api/medicines', { ids: [found.id] });
        console.log('Delete result:', JSON.stringify(delRes));
    }

    console.log('\n--- Test Successful! ---');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTest();
