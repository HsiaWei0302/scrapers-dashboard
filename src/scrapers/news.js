// Multi-source news aggregator (RSS).
const Parser = require('rss-parser');
const parser = new Parser({ timeout: 10000 });

const FEEDS = (process.env.NEWS_FEEDS || [
    'https://feeds.bbci.co.uk/news/world/rss.xml|BBC',
    'https://www.coindesk.com/arc/outboundfeeds/rss/|CoinDesk',
    'https://hnrss.org/frontpage|HackerNews'
].join(',')).split(',');

function parseFeedConfig(line) {
    const [url, name] = line.split('|');
    return { url: url.trim(), name: (name || url).trim() };
}

async function fetch() {
    const all = [];
    for (const f of FEEDS.map(parseFeedConfig)) {
        try {
            const feed = await parser.parseURL(f.url);
            feed.items.slice(0, 15).forEach(it => {
                const key = (it.guid || it.link || it.title).slice(0, 200);
                all.push({
                    key,
                    timestamp: it.pubDate ? new Date(it.pubDate).getTime() : Date.now(),
                    payload: {
                        source: f.name,
                        title: it.title,
                        link: it.link,
                        pubDate: it.pubDate,
                        summary: (it.contentSnippet || '').slice(0, 280)
                    }
                });
            });
        } catch (e) {
            console.warn(`News feed ${f.name} failed: ${e.message}`);
        }
    }
    return all;
}

module.exports = { fetch };
