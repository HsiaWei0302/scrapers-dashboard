# 📊 Scrapers Dashboard

> 一個可插拔的框架、四個真實資料源、一個即時 Dashboard。實戰示範怎麼把爬蟲 + 視覺化做得「不會自爆」。

[English README](./README.md) · MIT License · Node.js 18+ · 零 native 依賴

---

## 🎯 這是什麼

一個 Node.js 應用程式，做這四件事：

1. **定時爬 4 個不同資料源**（PTT 看板、加密貨幣行情、多來源新聞、蝦皮商品）
2. **全部存進同一個 SQLite 檔**（用 `sql.js` 純 JS，**不用編譯 native 模組**，任何電腦都裝得起來）
3. **提供深色 Dashboard**，每個資料源一個分頁、可以一鍵重新爬
4. **背景排程**每 15 分鐘自動跑一輪

每個爬蟲約 50 行。要加第 5 個資料源 = 一個檔案 + 一行註冊。

---

## 🧩 資料來源

| 來源 | 抓什麼 | 方法 |
|---|---|---|
| 💬 **PTT** | Stock / Tech_Job / HatePolitics 等看板最新文章。標題、作者、推文數、連結。 | axios + cheerio |
| 🪙 **加密貨幣** | 幣安 BTC/ETH/SOL 等 24h 行情。價格、高低點、量、漲跌幅。 | ccxt |
| 📰 **新聞** | 多來源 RSS 聚合（預設 BBC、CoinDesk、HackerNews） | rss-parser |
| 🛒 **蝦皮** | 商品搜尋結果 — 價格、銷量、評分。**注意**：蝦皮反爬很兇，正式要上線得換 Playwright + Cookie 輪替。 | axios + JSON API |

---

## 🚀 快速開始

```bash
git clone https://github.com/HsiaWei0302/scrapers-dashboard.git
cd scrapers-dashboard
npm install                 # 約 5 秒，零 native 編譯
npm run scrape:all          # 先抓一輪填資料
npm start                   # http://localhost:3000
```

Server 啟動後會自己每 15 分鐘背景跑一次，Dashboard 永遠有最新資料。

### 想單獨測一個爬蟲

```bash
npm run scrape:ptt
npm run scrape:crypto
npm run scrape:news
npm run scrape:shopee     # 預期會被蝦皮擋
```

---

## 📡 Dashboard 顯示什麼

**Overview 分頁**
- 每個來源的資料筆數 + 最後更新時間
- 每個來源都有「↻ Refresh now」按鈕，按了立刻重爬
- 最近 10 次爬取紀錄、狀態、耗時、錯誤訊息

**各來源分頁**
- 💬 PTT → 依看板分組，推文數有顏色（爆=綠、XX=紅）
- 🪙 Crypto → 大字價格卡 + 24h 漲跌幅
- 📰 News → 依新聞源分組
- 🛒 Shopee → 依關鍵字分組

---

## ⚙️ 設定（環境變數）

```bash
PORT=3000
SCHEDULE_MS=900000        # 背景排程間隔（預設 15 分鐘）
PTT_BOARDS=Stock,Tech_Job,HatePolitics
CRYPTO_SYMBOLS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT
NEWS_FEEDS=https://feeds.bbci.co.uk/news/world/rss.xml|BBC,https://www.coindesk.com/arc/outboundfeeds/rss/|CoinDesk
SHOPEE_QUERIES=機械鍵盤,二手iphone,藍牙耳機
```

---

## 🏗️ 架構

```
src/
├── server.js         # Express + Dashboard + 背景排程
├── runScraper.js     # CLI: node runScraper.js <name|all>
├── db.js             # sql.js（WASM 版 SQLite，純 JS）
├── scrapers/
│   ├── ptt.js        # PTT BBS HTML
│   ├── crypto.js     # ccxt → Binance ticker
│   ├── news.js       # RSS 多來源
│   └── shopee.js     # 蝦皮 JSON API
└── public/
    └── index.html    # 原生 JS Dashboard + Chart.js
data/
└── app.db            # SQLite（自動建立，已 .gitignore）
```

### 為什麼用 sql.js 不用 better-sqlite3?

`better-sqlite3` 在 Windows 上需要 `node-gyp` + Python + C++ 編譯工具，很多人裝不起來。**`sql.js` 是純 WASM 的 JS**，`npm install` 任何電腦 5 秒搞定。代價：寫入速度約慢 30%，這個規模感覺不到。

### 要加第 5 個資料源？

1. 在 `src/scrapers/myNewSource.js` export `async function fetch()`，回傳 `[{ key, timestamp, payload }, ...]`
2. 在 `src/runScraper.js` 的 `SCRAPERS` map 和 `src/server.js` 註冊一行
3. （選用）`public/index.html` 加個分頁

完成。DB、排程、API 都自動接好。

---

## 📈 實際測試結果

2026-06-01 在本機首跑：

| 來源 | 抓到筆數 | 備註 |
|---|---|---|
| PTT（3 個看板） | 57 篇 | Stock 偶爾連線重置 → 自動跳過 |
| 加密貨幣 | 8 個 ticker | 全成功 |
| 新聞（3 個 RSS） | 45 篇 | BBC + CoinDesk + HackerNews |
| 蝦皮 | 0 | 被擋（預期 — 需要 Playwright） |
| **合計** | **110+ 筆** | 全部存在 1 個檔案（`data/app.db`） |

---

## 🎓 工程取捨

- **單一 `records` 表 + JSON payload** — 每個爬蟲寫同一個 schema，DB 保持 schemaless。代價：無法用單一欄位索引，這個規模沒差。
- **去抖動寫檔** — sql.js 在記憶體中，最後一次寫入後 500ms 才 flush 到磁碟。`kill -9` 會掉約 1 秒資料，對公開爬蟲資料可接受。
- **爬蟲彼此隔離** — 一個爬蟲掛掉不會弄壞其他三個。`runScraper` 每個爬蟲各自 try/catch + log。
- **有禮貌的爬蟲** — User-Agent 標明來源、請求間隔 500ms-1s、看板/幣種可設定讓使用者控制範圍。

---

## 🚧 已知限制 / Roadmap

- [ ] Shopee 爬蟲需要 Playwright 才能穩定上 production
- [ ] 加每個來源的歷史走勢圖（Chart.js 已載入，只差接線）
- [ ] 加 WebSocket 推送，Dashboard 就不用輪詢
- [ ] 規模真的長大就換 better-sqlite3（schema 一致、無痛換）
- [ ] 加 Telegram/Discord webhook 推關鍵字命中通知

---

## 📝 免責聲明

這個專案只爬**公開**資料。請尊重每個網站的服務條款、robots.txt、速率限制。不要當害人家 API 被關起來的那個人。

## 📄 授權

MIT — 詳見 [LICENSE](./LICENSE)。

---

由 **Wei** 製作 · 接案：爬蟲、Dashboard、資料管線、自動化。

如果你需要：
- 特定網站的爬蟲
- 既有資料源的 Dashboard
- 排程 ETL 作業
- 解決卡住的爬蟲（反爬、Captcha、JS-heavy 頁面）

→ Tasker 找我（@HsiaWei0302），或在這個 repo 開 issue。
