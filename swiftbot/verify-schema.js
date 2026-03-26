const db = require('./db');

// Test schema migration
try { db.db.exec('ALTER TABLE medicines ADD COLUMN product_id TEXT'); console.log('Added product_id'); } catch(_) { console.log('product_id already exists'); }
try { db.db.exec("ALTER TABLE medicines ADD COLUMN stock_status TEXT DEFAULT 'In Stock'"); console.log('Added stock_status'); } catch(_) { console.log('stock_status already exists'); }

// Check columns
const row = db.db.prepare('PRAGMA table_info(medicines)').all();
console.log('\nMedicines table columns:');
row.forEach(c => console.log(' -', c.name, ':', c.type));

// Check row count
const count = db.db.prepare('SELECT COUNT(*) as cnt FROM medicines').get();
console.log('\nTotal medicines in DB:', count.cnt);

if (count.cnt > 0) {
    const sample = db.db.prepare('SELECT id, product_id, name, stock_status FROM medicines LIMIT 3').all();
    console.log('\nSample records:');
    sample.forEach(r => console.log(' ', JSON.stringify(r)));
}

console.log('\n✅ Verification complete!');
process.exit(0);
