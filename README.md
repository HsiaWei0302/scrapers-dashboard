# 📊 Scrapers Dashboard

> One pluggable framework, four real-world data sources, one live dashboard. A practical demo of how to build a scraping + visualization service that doesn't fall over.

[繁體中文 README](./README.zh-TW.md) · MIT License · Node.js 18+ · Zero native deps

---

## 🎯 What this is

A single Node.js app that:

1. **Scrapes 4 different data sources** on a schedule (PTT forums, crypto markets, multi-source news feeds, Shopee products)
2. **Stores everything** in a single SQLite file via `sql.js` (pure JS, **no native compile** — works on any machine)
3. **Serves a dark-themed dashboard** with live tabs per source + one-click re-scrape

Each scraper is ~50 lines. Adding a 5th source is one file plus one line in `runScraper.js`.

---

## 🧩 Data sources

| Source | What it scrapes | Method |
|---|---|---|
| 💬 **PTT** | Latest posts from Stock / Tech_Job / HatePolitics (configurable). Title, author, push count, link. | HTML via axios + cheerio |
| 🪙 **Crypto** | 24h tickers for BTC/ETH/SOL/etc. on Binance (configurable). Price, high/low, volume, % change. | ccxt |
| 📰 **News** | Multi-source RSS aggregator (BBC, CoinDesk, HackerNews by default). | rss-parser |
| 🛒 **Shopee** | Product search results — price, sold count, rating. **Note**: Shopee aggressively blocks bots; for production switch to Playwright + cookie rotation. | axios + JSON API |

---

## 🚀 Quick start

```bash
git clone https://github.com/HsiaWei0302/scrapers-dashboard.git
cd scrapers-dashboard
npm install                 # ~5 seconds, zero native compilation
npm run scrape:all          # populate the DB once
npm start                   # dashboard live on http://localhost:3000
```

The server also runs a **background scheduler** every 15 minutes — leave it running and the dashboard stays fresh.

### Just want to test one scraper?

```bash
npm run scrape:ptt
npm run scrape:crypto
npm run scrape:news
npm run scrape:shopee     # may fail — Shopee blocks bots
```

---

## 📡 What the dashboard shows

**Overview tab**
- Per-source record count + last update time
- One-click "Refresh now" button per source
- Last 10 scrape attempts with status + duration + error messages

**Per-source tabs**
- 💬 PTT → grouped by board, push count colored (爆 in green, XX in red)
- 🪙 Crypto → big price cards with 24h % change
- 📰 News → grouped by source
- 🛒 Shopee → grouped by search keyword

---

## ⚙️ Configuration (env vars)

```bash
PORT=3000
SCHEDULE_MS=900000        # background refresh interval (default 15min)
PTT_BOARDS=Stock,Tech_Job,HatePolitics
CRYPTO_SYMBOLS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT
NEWS_FEEDS=https://feeds.bbci.co.uk/news/world/rss.xml|BBC,https://www.coindesk.com/arc/outboundfeeds/rss/|CoinDesk
SHOPEE_QUERIES=機械鍵盤,二手iphone,藍牙耳機
```

---

## 🏗️ Architecture

```
src/
├── server.js         # Express + dashboard + background scheduler
├── runScraper.js     # CLI: node runScraper.js <name|all>
├── db.js             # sql.js (WASM SQLite, pure JS)
├── scrapers/
│   ├── ptt.js        # PTT BBS HTML
│   ├── crypto.js     # ccxt → Binance ticker
│   ├── news.js       # RSS multi-feed
│   └── shopee.js     # Shopee JSON API
└── public/
    └── index.html    # Vanilla JS dashboard + Chart.js
data/
└── app.db            # SQLite (auto-created, .gitignored)
```

### Why sql.js instead of better-sqlite3?

`better-sqlite3` requires `node-gyp` + Python + a C++ toolchain on Windows. **`sql.js` is pure WebAssembly JS** — `npm install` works in 5 seconds on any machine. Trade-off: ~30% slower writes, irrelevant at this scale.

### Adding a 5th data source

1. Create `src/scrapers/myNewSource.js` exporting `async function fetch()` returning `[{ key, timestamp, payload }, ...]`
2. Register it in `src/runScraper.js`'s `SCRAPERS` map and in `src/server.js`
3. (Optional) add a tab in `public/index.html`

That's it. The shared DB, scheduler, and API endpoints just work.

---

## 📈 Tested results

Run on 2026-06-01 (local machine, first run):

| Source | Items scraped | Notes |
|---|---|---|
| PTT (3 boards) | 57 posts | Stock occasionally times out → graceful skip |
| Crypto | 8 tickers | All successful |
| News (3 feeds) | 45 articles | BBC + CoinDesk + HackerNews |
| Shopee | 0 | Blocked (expected — needs Playwright) |
| **Total** | **110+ records** | Stored in 1 file (`data/app.db`) |

---

## 🎓 Engineering choices worth calling out

- **Single `records` table with JSON payload** — every scraper writes the same schema, lets the DB stay schemaless. Trade-off: no per-field indexing, fine at this scale.
- **Debounced disk persist** — sql.js is in-memory; we flush to disk 500ms after the last write. Survives `kill -9` losing ~1s of data, which is acceptable for scraped public data.
- **Each scraper isolated** — one failing source never breaks the others. The `runScraper` catches & logs per scraper.
- **Polite scraping** — User-Agent identifies the project, 500ms-1s delays between requests, configurable boards/symbols so the user controls scope.

---

## 🚧 Limitations / Roadmap

- [ ] Shopee scraper needs Playwright for production reliability
- [ ] Add per-source historical charts (Chart.js is loaded, just needs wiring)
- [ ] Add WebSocket push so the dashboard updates without polling
- [ ] Migrate to better-sqlite3 if scale ever requires it (single SCHEMA, easy swap)
- [ ] Optional Telegram/Discord webhook for keyword matches

---

## 📝 Disclaimer

This project scrapes **public** data only. Respect each site's terms of service, robots.txt, and rate limits. Don't be the reason an API gets locked down.

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

Built by **Wei** · Available for freelance work in scraping, dashboards, data pipelines, and automation.

If you need:
- A scraper for a specific site
- A dashboard wrapping an existing data source
- A scheduled ETL job
- Help unblocking a stuck scraper (anti-bot, captcha, JS-heavy pages)

→ Reach me on Tasker (@HsiaWei0302) or open an issue here.
