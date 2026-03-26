/**
 * One-time patch script: rewrites the ADMIN API ROUTES section in index.js
 * to add product_id/stock_status columns + new endpoints.
 * Run once: node patch-api.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.js');
let src = fs.readFileSync(file, 'utf8');

const MARKER = '// --- ADMIN API ROUTES (SQLite Integration) ---';
const idx = src.indexOf(MARKER);
if (idx === -1) { console.error('Marker not found!'); process.exit(1); }

const preserved = src.substring(0, idx);

const newSection = `// --- ADMIN API ROUTES (SQLite Integration) ---
const db = require('./db');

// Schema migration: add new columns if they don't exist yet
try { db.db.exec('ALTER TABLE medicines ADD COLUMN product_id TEXT'); } catch(_) {}
try { db.db.exec("ALTER TABLE medicines ADD COLUMN stock_status TEXT DEFAULT 'In Stock'"); } catch(_) {}
try { db.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_prod_id ON medicines(product_id) WHERE product_id IS NOT NULL'); } catch(_) {}
console.log('[MIGRATION] Schema migration complete.');

// Logging middleware for API
app.use('/api', (req, res, next) => {
    console.log('\\n[API] ' + req.method + ' ' + req.originalUrl);
    next();
});

// GET all medicines
app.get('/api/medicines', async (req, res) => {
    try {
        const rows = await db.all(
            \`SELECT m.id, m.product_id, m.name, m.manufacturer, m.price, m.cost_price,
                    m.stock, m.stock_status, m.generic_name, m.package_size,
                    m.batch_number, m.expiry_date, m.image_url, m.min_order_qty,
                    COALESCE(c.name, m.generic_name, 'General') as category_name
             FROM medicines m
             LEFT JOIN categories c ON m.category_id = c.id
             ORDER BY m.name ASC\`
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST single/bulk medicines
app.post('/api/medicines', async (req, res) => {
    try {
        const data = Array.isArray(req.body) ? req.body : [req.body];
        await db.run('BEGIN TRANSACTION');
        for (const med of data) {
            await db.run(
                'INSERT INTO medicines (name, manufacturer, price, cost_price, stock, stock_status, generic_name, package_size, batch_number, expiry_date, image_url, min_order_qty, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [med.name, med.manufacturer, med.price||0, med.cost_price||0, med.stock||0, med.stock_status||'In Stock', med.generic_name||null, med.package_size||null, med.batch_number||null, med.expiry_date||null, med.image_url||null, med.min_order_qty||1, med.product_id||null]
            );
        }
        await db.run('COMMIT');
        res.json({ success: true, count: data.length });
    } catch (err) { await db.run('ROLLBACK'); res.status(500).json({ error: err.message }); }
});

// PUT update medicine
app.put('/api/medicines/:id', async (req, res) => {
    try {
        const { name, manufacturer, price, cost_price, stock, stock_status, generic_name, package_size, product_id } = req.body;
        await db.run(
            'UPDATE medicines SET name=?, manufacturer=?, price=?, cost_price=?, stock=?, stock_status=?, generic_name=?, package_size=?, product_id=? WHERE id=?',
            [name, manufacturer, price, cost_price, stock, stock_status||'In Stock', generic_name, package_size, product_id||null, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE single medicine
app.delete('/api/medicines/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM medicines WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE bulk medicines { ids: [] }
app.delete('/api/medicines', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
        const ph = ids.map(() => '?').join(',');
        await db.run('DELETE FROM medicines WHERE id IN (' + ph + ')', ids);
        res.json({ success: true, deleted: ids.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/inventory/upload — CSV upload endpoint
// Body: { rows: [{product_id, medicine_name, pack_size, category, company, price, stock_status}], mode: 'upsert'|'skip' }
app.post('/api/inventory/upload', async (req, res) => {
    const { rows, mode } = req.body;
    const dupMode = mode || 'upsert';
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows provided' });

    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];

    try {
        await db.run('BEGIN TRANSACTION');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const existing = row.product_id ? await db.get('SELECT id FROM medicines WHERE product_id = ?', [String(row.product_id).trim()]) : null;
                if (existing) {
                    if (dupMode === 'skip') { skipped++; continue; }
                    await db.run(
                        'UPDATE medicines SET name=?, manufacturer=?, price=?, generic_name=?, package_size=?, stock_status=? WHERE id=?',
                        [row.medicine_name, row.company, parseFloat(row.price)||0, row.category, row.pack_size, row.stock_status, existing.id]
                    );
                    updated++;
                } else {
                    let catId = null;
                    if (row.category) {
                        const cat = await db.get('SELECT id FROM categories WHERE name = ?', [row.category]);
                        if (cat) { catId = cat.id; }
                        else { const r = await db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [row.category]); catId = r.lastID; }
                    }
                    await db.run(
                        'INSERT INTO medicines (product_id, name, manufacturer, price, cost_price, stock, stock_status, generic_name, package_size, category_id, min_order_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [String(row.product_id||''), row.medicine_name, row.company, parseFloat(row.price)||0, parseFloat(row.price)*0.8||0, row.stock_status==='In Stock'?100:0, row.stock_status, row.category, row.pack_size, catId, 1]
                    );
                    inserted++;
                }
            } catch (rowErr) {
                errors.push({ row: i+1, product_id: row.product_id, reason: rowErr.message });
            }
        }
        await db.run('COMMIT');
        console.log('[UPLOAD] inserted=' + inserted + ' updated=' + updated + ' skipped=' + skipped + ' errors=' + errors.length);
        res.json({ success: true, inserted, updated, skipped, errors, total: rows.length });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// GET categories
app.get('/api/categories', async (req, res) => {
    try { res.json(await db.all('SELECT * FROM categories')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// GET orders
app.get('/api/orders', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const BOT_PORT = process.env.PORT || process.env.BOT_PORT || 3001;
app.listen(BOT_PORT, '0.0.0.0', () => console.log('[SERVER] SQLite SwiftBot v4.0 running on port ' + BOT_PORT));
`;

const finalContent = preserved + newSection;
fs.writeFileSync(file, finalContent, 'utf8');
console.log('✅ index.js patched successfully!');
console.log('   Preserved', preserved.split('\n').length, 'lines of original code.');
console.log('   New API section length:', newSection.length, 'chars');
