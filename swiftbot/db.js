const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new DatabaseSync(dbPath);

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
