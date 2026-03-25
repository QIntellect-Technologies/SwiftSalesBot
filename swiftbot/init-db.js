const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    // 2. Medicines Table
    db.run(`CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        manufacturer TEXT,
        price REAL DEFAULT 0,
        cost_price REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        category_id INTEGER,
        generic_name TEXT,
        package_size TEXT,
        batch_number TEXT,
        expiry_date TEXT,
        image_url TEXT,
        min_order_qty INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);

    // 3. Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL UNIQUE,
        customer_name TEXT,
        customer_phone TEXT,
        items TEXT, -- JSON string
        total_amount REAL,
        delivery_address TEXT,
        status TEXT DEFAULT 'pending',
        mode TEXT DEFAULT 'WhatsApp',
        payment_method TEXT DEFAULT 'Cash on Delivery',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert Initial Categories
    const categories = ['Antibiotics', 'Syrups', 'Capsules', 'Tablets', 'Injections'];
    const stmt = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
    categories.forEach(cat => stmt.run(cat));
    stmt.finalize();

    // Insert Sample Medicines
    const medicines = [
        ['Panadol 500mg', 'GSK', 15.0, 10.0, 100, 4, 'Paracetamol', '20s', 'B-123', '2026-12'],
        ['Amoxil 250mg', 'GSK', 120.0, 90.0, 50, 1, 'Amoxicillin', '10s', 'B-456', '2026-06'],
        ['Brufen Syrup', 'Abbott', 85.0, 60.0, 30, 2, 'Ibuprofen', '120ml', 'B-789', '2025-12'],
        ['Flagyl 400mg', 'Sanofi', 45.0, 35.0, 80, 4, 'Metronidazole', '20s', 'B-321', '2026-03'],
        ['Risek 20mg', 'Getz', 350.0, 280.0, 20, 3, 'Omeprazole', '14s', 'B-654', '2027-01']
    ];

    const medStmt = db.prepare(`
        INSERT OR IGNORE INTO medicines 
        (name, manufacturer, price, cost_price, stock, category_id, generic_name, package_size, batch_number, expiry_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    medicines.forEach(med => medStmt.run(med));
    medStmt.finalize();

    console.log('✅ SQLite Database Initialized with Mock Data!');
});

db.close();
