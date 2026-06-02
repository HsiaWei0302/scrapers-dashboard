// PTT board scraper. Uses the over-18 cookie to bypass the age gate.
const axios = require('axios');
const cheerio = require('cheerio');

const BOARDS = (process.env.PTT_BOARDS || 'Stock,Tech_Job,HatePolitics').split(',');
const HEADERS = {
    Cookie: 'over18=1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Portfolio-Scraper/1.0 (+contact: HsiaWei0302)'
};

async function fetchBoard(board) {
    const url = `https://www.ptt.cc/bbs/${board}/index.html`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const items = [];

    $('.r-ent').each((_, el) => {
        const $el = $(el);
        const a = $el.find('.title a');
        if (!a.length) return; // deleted post
        const title = a.text().trim();
        const link = `https://www.ptt.cc${a.attr('href')}`;
        const author = $el.find('.author').text().trim();
        const rawPush = $el.find('.nrec').text().trim();
        const pushCount = rawPush === '爆' ? 100 : rawPush === 'XX' ? -100 : parseInt(rawPush) || 0;
        const date = $el.find('.date').text().trim();
        items.push({
            key: link.split('/').pop().replace('.html', ''),
            timestamp: Date.now(),
            payload: { board, title, author, link, pushCount, date }
        });
    });
    return items;
}

async function fetch() {
    const all = [];
    for (const board of BOARDS) {
        try {
            const items = await fetchBoard(board.trim());
            all.push(...items);
            await new Promise(r => setTimeout(r, 500)); // be polite
        } catch (e) {
            console.warn(`PTT board ${board} failed: ${e.message}`);
        }
    }
    return all;
}

module.exports = { fetch };
