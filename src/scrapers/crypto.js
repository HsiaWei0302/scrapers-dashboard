// Crypto market scraper via ccxt. Stores 24h ticker snapshot per symbol.
const ccxt = require('ccxt');

const SYMBOLS = (process.env.CRYPTO_SYMBOLS || 'BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,XRP/USDT,DOGE/USDT,ADA/USDT,AVAX/USDT').split(',');

const exchange = new ccxt.binance({ enableRateLimit: true });

async function fetch() {
    const items = [];
    for (const symbol of SYMBOLS) {
        try {
            const t = await exchange.fetchTicker(symbol.trim());
            items.push({
                key: symbol.trim(),
                timestamp: Date.now(),
                payload: {
                    symbol: symbol.trim(),
                    last: t.last,
                    high24h: t.high,
                    low24h: t.low,
                    volume24h: t.baseVolume,
                    changePercent: t.percentage
                }
            });
        } catch (e) {
            console.warn(`Crypto ${symbol} failed: ${e.message}`);
        }
    }
    return items;
}

module.exports = { fetch };
