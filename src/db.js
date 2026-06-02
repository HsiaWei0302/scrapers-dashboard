// SQLite store via sql.js (pure WASM JS — no native compile).
// We persist by re-dumping the DB to disk after writes, debounced.
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db = null;
let saveTimer = null;

async function init() {
    if (db) return db;
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
        db = new SQL.Database();
    }
    db.exec(`
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            key TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            payload TEXT NOT NULL,
            UNIQUE(source, key)
        );
        CREATE INDEX IF NOT EXISTS idx_source_ts ON records(source, timestamp DESC);
        CREATE TABLE IF NOT EXISTS scrape_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            finished_at INTEGER,
            items_added INTEGER DEFAULT 0,
            error TEXT
        );
    `);
    return db;
}

function persist() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
        saveTimer = null;
    }, 500);
}

function rowsFromResult(res) {
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
}

function bulkUpsert(source, items) {
    db.run('BEGIN');
    const stmt = db.prepare(`INSERT OR REPLACE INTO records (source, key, timestamp, payload) VALUES (?, ?, ?, ?)`);
    for (const r of items) {
        stmt.run([source, r.key, r.timestamp ?? Date.now(), JSON.stringify(r.payload)]);
    }
    stmt.free();
    db.run('COMMIT');
    persist();
    return items.length;
}

function getRecords(source, limit = 100) {
    const res = db.exec(`SELECT key, timestamp, payload FROM records WHERE source = ? ORDER BY timestamp DESC LIMIT ?`, [source, limit]);
    return rowsFromResult(res).map(r => ({ key: r.key, timestamp: r.timestamp, ...JSON.parse(r.payload) }));
}

function getRecentBySource() {
    const res = db.exec(`SELECT source, COUNT(*) AS count, MAX(timestamp) AS latest FROM records GROUP BY source`);
    return rowsFromResult(res);
}

function startLog(source) {
    db.run(`INSERT INTO scrape_log (source, started_at) VALUES (?, ?)`, [source, Date.now()]);
    const res = db.exec(`SELECT last_insert_rowid() AS id`);
    persist();
    return rowsFromResult(res)[0].id;
}
function endLog(id, itemsAdded, error = null) {
    db.run(`UPDATE scrape_log SET finished_at = ?, items_added = ?, error = ? WHERE id = ?`,
        [Date.now(), itemsAdded, error, id]);
    persist();
}
function recentLogs(limit = 20) {
    const res = db.exec(`SELECT * FROM scrape_log ORDER BY started_at DESC LIMIT ?`, [limit]);
    return rowsFromResult(res);
}

module.exports = { init, bulkUpsert, getRecords, getRecentBySource, startLog, endLog, recentLogs };
