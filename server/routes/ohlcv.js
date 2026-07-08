/**
 * ohlcv.js
 * Public endpoint — no authentication required (market OHLCV is not sensitive; equivalent to
 * the public /snapshot and /quotes/live feeds).
 *
 * GET /api/v1/ohlcv?symbol=<yahoo-form>&tf=<timeframe>
 *
 * Serves daily OHLCV for chart classes the browser can't fetch directly — chiefly EU/Asia
 * indices via EODHD, whose API key is server-only (no client key, no /proxy/eodhd). The client
 * chart adapter (fmpOHLCV) calls this as the fallback after FMP, ahead of the unreliable Yahoo
 * path. Responses are cached in-memory (~6h) since EOD data only moves after the close.
 */

import { Router } from 'express';
import { yahooToEodhd } from '../lib/eodhdSymbols.js';

const router = Router();

// App timeframe → calendar days of history to request (EODHD EOD is daily-only).
const TF_DAYS = { '1D': 6, '5D': 12, '1W': 16, '1M': 45, '3M': 100, '1Y': 400, '5Y': 1900 };

const TTL_MS = 6 * 60 * 60 * 1000; // 6h — EOD only changes after the close
const cache = new Map();           // `${code}|${tf}` → { ts, candles }

function fromDate(tf) {
  if (tf === 'MAX') return null;                                   // no lower bound
  if (tf === 'YTD') return `${new Date().getFullYear()}-01-01`;
  const days = TF_DAYS[tf] || 45;
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  const symbol = String(req.query.symbol || '');
  const tf = String(req.query.tf || '1M');
  if (!symbol) return res.status(400).json({ error: 'symbol required', candles: [] });
  if (!process.env.EODHD_API_KEY) return res.status(503).json({ error: 'EODHD not configured', candles: [] });

  const code = yahooToEodhd(symbol);
  if (!code) return res.status(404).json({ error: 'no EODHD symbol for ' + symbol, candles: [] });

  const key = `${code}|${tf}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return res.json({ source: 'eodhd', code, candles: hit.candles, cached: true });
  }

  try {
    const from = fromDate(tf);
    const params = new URLSearchParams({ api_token: process.env.EODHD_API_KEY, fmt: 'json', period: 'd' });
    if (from) params.set('from', from);
    const url = `https://eodhd.com/api/eod/${encodeURIComponent(code)}?${params.toString()}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return res.status(502).json({ error: `EODHD HTTP ${r.status}`, candles: [] });

    const rows = await r.json();
    // EODHD EOD → ascending [{date:'YYYY-MM-DD', open, high, low, close, adjusted_close, volume}].
    const candles = [];
    for (const x of Array.isArray(rows) ? rows : []) {
      if (!x || !x.date || !Number.isFinite(Number(x.close))) continue;
      candles.push({ time: x.date, open: +x.open, high: +x.high, low: +x.low, close: +x.close, volume: +x.volume || 0 });
    }

    cache.set(key, { ts: Date.now(), candles });
    return res.json({ source: 'eodhd', code, candles });
  } catch (err) {
    return res.status(502).json({ error: err.message, candles: [] });
  }
});

export default router;
