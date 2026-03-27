const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT UNIQUE,
        name TEXT,
        manufacturer TEXT,
        price REAL,
        stock_status TEXT,
        generic_name TEXT,
        package_size TEXT,
        category_id INTEGER,
        FOREIGN KEY(category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_phone TEXT,
        delivery_address TEXT,
        items TEXT,
        total_amount REAL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Provide an async-like wrapper so existing code doesn't break
module.exports = {
    get: async (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.get(...params);
    },
    all: async (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
    },
    run: async (sql, params = []) => {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        return { lastID: info.lastInsertRowid, changes: info.changes };
    },
    exec: async (sql) => {
        db.exec(sql);
    },
    db // raw instance
};
