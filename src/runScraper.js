// CLI runner. `node runScraper.js <name|all>`
const { init, bulkUpsert, startLog, endLog } = require('./db');

const SCRAPERS = {
    ptt: () => require('./scrapers/ptt'),
    crypto: () => require('./scrapers/crypto'),
    news: () => require('./scrapers/news'),
    shopee: () => require('./scrapers/shopee')
};

async function runOne(name) {
    if (!SCRAPERS[name]) throw new Error(`Unknown scraper: ${name}`);
    const scraper = SCRAPERS[name]();
    const logId = startLog(name);
    console.log(`\n▶ Running scraper: ${name}`);
    try {
        const items = await scraper.fetch();
        const count = items.length ? bulkUpsert(name, items) : 0;
        endLog(logId, count);
        console.log(`✓ ${name}: ${count} record(s) saved.`);
        return count;
    } catch (err) {
        endLog(logId, 0, err.message);
        console.error(`✗ ${name} failed: ${err.message}`);
        return 0;
    }
}

(async () => {
    await init();
    const arg = process.argv[2];
    if (!arg) {
        console.log('Usage: node runScraper.js <ptt|crypto|news|shopee|all>');
        process.exit(1);
    }
    const names = arg === 'all' ? Object.keys(SCRAPERS) : [arg];
    for (const n of names) await runOne(n);
    // Give persist debounce time to flush.
    await new Promise(r => setTimeout(r, 700));
    process.exit(0);
})();
