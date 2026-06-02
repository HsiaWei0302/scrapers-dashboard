// Express server: serves the dashboard + JSON APIs + on-demand scrape triggers.
const path = require('path');
const express = require('express');
const { init, getRecords, getRecentBySource, recentLogs, bulkUpsert, startLog, endLog } = require('./db');

const SCRAPERS = {
    ptt: require('./scrapers/ptt'),
    crypto: require('./scrapers/crypto'),
    news: require('./scrapers/news'),
    shopee: require('./scrapers/shopee')
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sources', (_req, res) => res.json(getRecentBySource()));

app.get('/api/records/:source', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    res.json(getRecords(req.params.source, limit));
});

app.get('/api/logs', (_req, res) => res.json(recentLogs(30)));

app.post('/api/scrape/:source', async (req, res) => {
    const name = req.params.source;
    if (!SCRAPERS[name]) return res.status(404).json({ error: 'Unknown source' });
    const logId = startLog(name);
    try {
        const items = await SCRAPERS[name].fetch();
        const n = items.length ? bulkUpsert(name, items) : 0;
        endLog(logId, n);
        res.json({ source: name, count: n });
    } catch (err) {
        endLog(logId, 0, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Background scheduler — refresh every 15 min by default.
const SCHEDULE_MS = +(process.env.SCHEDULE_MS || 15 * 60 * 1000);
async function backgroundLoop() {
    for (const name of Object.keys(SCRAPERS)) {
        const logId = startLog(name);
        try {
            const items = await SCRAPERS[name].fetch();
            const n = items.length ? bulkUpsert(name, items) : 0;
            endLog(logId, n);
            console.log(`[scheduler] ${name}: ${n} items`);
        } catch (err) {
            endLog(logId, 0, err.message);
            console.warn(`[scheduler] ${name} failed: ${err.message}`);
        }
    }
}
setTimeout(backgroundLoop, 5000); // kick off shortly after start
setInterval(backgroundLoop, SCHEDULE_MS);

const PORT = process.env.PORT || 3000;
(async () => {
    await init();
    app.listen(PORT, () => {
        console.log(`☕ Dashboard live on http://localhost:${PORT}`);
    });
})();
