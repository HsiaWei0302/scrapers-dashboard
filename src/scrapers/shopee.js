// Shopee item watcher.
//
// Shopee aggressively rate-limits and rotates anti-bot signals, so this
// scraper is intentionally minimal: it queries the public JSON search API
// with a polite User-Agent and a small concurrency. For production use,
// swap this for Playwright + cookie rotation.
const axios = require('axios');

const QUERIES = (process.env.SHOPEE_QUERIES || '機械鍵盤,二手iphone,藍牙耳機').split(',');
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Portfolio-Demo/1.0',
    'Accept': 'application/json',
    'Referer': 'https://shopee.tw/'
};

async function fetchQuery(keyword) {
    const url = `https://shopee.tw/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=10&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000, validateStatus: () => true });
    if (res.status !== 200 || !res.data?.items) {
        throw new Error(`HTTP ${res.status} (Shopee blocks bots aggressively — for production use Playwright)`);
    }
    return res.data.items.map(({ item_basic: it }) => ({
        key: `${keyword}::${it.itemid}`,
        timestamp: Date.now(),
        payload: {
            keyword,
            itemid: it.itemid,
            shopid: it.shopid,
            name: it.name,
            price: it.price / 100000,
            stock: it.stock,
            sold: it.historical_sold,
            rating: it.item_rating?.rating_star,
            link: `https://shopee.tw/product/${it.shopid}/${it.itemid}`
        }
    }));
}

async function fetch() {
    const all = [];
    for (const q of QUERIES) {
        try {
            const items = await fetchQuery(q.trim());
            all.push(...items);
            await new Promise(r => setTimeout(r, 1000)); // be polite
        } catch (e) {
            console.warn(`Shopee "${q}" failed: ${e.message}`);
        }
    }
    return all;
}

module.exports = { fetch };
