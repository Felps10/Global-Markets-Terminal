/**
 * quote.js
 * Public endpoint — no authentication required (a single delayed market quote is not sensitive;
 * equivalent to the public /snapshot, /quotes/live and /ohlcv feeds).
 *
 * GET /api/v1/quote?symbol=<yahoo-form>
 *
 * Returns ONE normalized live quote for an arbitrary symbol, resolved server-side against the
 * PAID providers (FMP Premium / EODHD / BRAPI Pro) — never Yahoo. This replaces the three
 * client-side `/proxy/yahoo/v7/finance/quote` header-quote calls (ChartResearchPage,
 * FundamentalLabPage, AssetDetailDrawer). Keys stay server-only.
 * (Historical note: the original BBDC4 failure this replaced was NOT Yahoo IP-blocking —
 * it was the client sending bare B3 symbols after losing meta.isB3 to a duplicate-row
 * collision; see PR #59/#60. The suffix contract below is why that mattered.)
 *
 * Class is inferred from the symbol suffix (the three callers already append `.SA` for B3):
 *   `.SA`  → B3        → BRAPI Pro (full fields incl. 52wk/EPS/PE) → EODHD `.SA` fallback
 *   `^…`   → index     → FMP (8 covered indices) → EODHD `.INDX`
 *   `…=X`  → FX        → FMP real-time → EODHD `.FOREX`
 *   `…=F`  → commodity → FMP (GC=F/SI=F only; CL=F/NG=F have no live single-quote — chart uses ETF proxy)
 *   else   → equity    → FMP `/stable/quote` → EODHD `.US`
 *
 * Response shape matches what the three callers consumed from Yahoo v7 (drop-in):
 *   { symbol, class, source, price, change, changePct, open, prevClose, dayHigh, dayLow,
 *     volume, avgVolume, marketCap, w52High, w52Low, beta, eps, pe, timestamp }
 * Cached in-memory ~30s (near-real-time header quote; shields provider quota under load).
 */

import { Router } from 'express';
import { yahooToFmp } from '../lib/fmpSymbols.js';
import { yahooToEodhd } from '../lib/eodhdSymbols.js';
import { getEodhd52wk } from '../lib/eodhd52wk.js';

const router = Router();

const TTL_MS = 30_000; // 30s
const cache = new Map(); // symbol → { ts, data }

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
// EODHD returns 0 for open/high/low/volume outside trading hours — treat non-positive as absent
// so the UI shows "—" rather than a fake 0.
const pos = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

function classify(symbol) {
  if (symbol.endsWith('.SA')) return 'b3';
  if (symbol.startsWith('^')) return 'index';
  if (symbol.endsWith('=X')) return 'fx';
  if (symbol.endsWith('=F')) return 'commodity';
  return 'equity';
}

// ── Provider fetchers — each returns the normalized shape or null on any miss ─────────────────

async function fmpQuote(symbol) {
  if (!process.env.FMP_KEY) return null;
  const code = yahooToFmp(symbol);
  if (!code) return null;
  const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(code)}&apikey=${process.env.FMP_KEY}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) return null;
  const arr = await r.json();
  const q = Array.isArray(arr) ? arr[0] : arr;
  if (!q || !Number.isFinite(Number(q.price))) return null;
  return {
    source: 'fmp',
    price: num(q.price), change: num(q.change), changePct: num(q.changePercentage),
    open: num(q.open), prevClose: num(q.previousClose),
    dayHigh: num(q.dayHigh), dayLow: num(q.dayLow),
    volume: num(q.volume), avgVolume: null,
    marketCap: pos(q.marketCap), // 0 for indices
    w52High: num(q.yearHigh), w52Low: num(q.yearLow),
    beta: null, eps: null, pe: null,
    timestamp: num(q.timestamp),
  };
}

async function eodhdQuote(symbol) {
  if (!process.env.EODHD_API_KEY) return null;
  const code = yahooToEodhd(symbol);
  if (!code) return null;
  const url = `https://eodhd.com/api/real-time/${encodeURIComponent(code)}?api_token=${process.env.EODHD_API_KEY}&fmt=json`;
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) return null;
  const q = await r.json();
  const price = num(q.close);
  if (price == null || q.close === 'NA') return null; // EODHD returns "NA" for unsupported codes
  // EODHD real-time lacks the 52-week range → backfill it from 1y of daily EOD (cached ~12h).
  const w52 = await getEodhd52wk(code);
  return {
    source: 'eodhd',
    price, change: num(q.change), changePct: num(q.change_p),
    open: pos(q.open), prevClose: num(q.previousClose),
    dayHigh: pos(q.high), dayLow: pos(q.low),
    volume: pos(q.volume), avgVolume: null,
    marketCap: null,             // EODHD real-time carries no market cap
    w52High: w52 ? w52.high : null, w52Low: w52 ? w52.low : null,
    beta: null, eps: null, pe: null,
    timestamp: num(q.timestamp),
  };
}

async function brapiQuote(symbol) {
  const token = process.env.VITE_BRAPI_TOKEN; // runtime var on Railway (same one quoteFetchManager uses)
  if (!token) return null;
  const ticker = symbol.replace(/\.SA$/, ''); // BRAPI takes the bare B3 ticker
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${encodeURIComponent(token)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) return null;
  const data = await r.json();
  const q = data?.results?.[0];
  if (!q || !Number.isFinite(Number(q.regularMarketPrice))) return null;
  return {
    source: 'brapi',
    price: num(q.regularMarketPrice), change: num(q.regularMarketChange), changePct: num(q.regularMarketChangePercent),
    open: num(q.regularMarketOpen), prevClose: num(q.regularMarketPreviousClose),
    dayHigh: num(q.regularMarketDayHigh), dayLow: num(q.regularMarketDayLow),
    volume: num(q.regularMarketVolume), avgVolume: null,
    marketCap: pos(q.marketCap),
    w52High: num(q.fiftyTwoWeekHigh), w52Low: num(q.fiftyTwoWeekLow),
    beta: null, eps: num(q.earningsPerShare), pe: num(q.priceEarnings),
    timestamp: q.regularMarketTime ? Math.floor(Date.parse(q.regularMarketTime) / 1000) : null,
  };
}

// Provider precedence per class (paid-first, Yahoo-free). FMP is preferred over EODHD wherever
// it has coverage; EODHD backfills; BRAPI Pro owns Brazil.
const PRECEDENCE = {
  b3:        [brapiQuote, eodhdQuote],
  index:     [fmpQuote, eodhdQuote],
  fx:        [fmpQuote, eodhdQuote],
  commodity: [fmpQuote], // GC=F/SI=F only; CL=F/NG=F have no paid single-quote (charts use USO/UNG proxy)
  equity:    [fmpQuote, eodhdQuote],
};

router.get('/', async (req, res) => {
  const symbol = String(req.query.symbol || '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.ts < TTL_MS) return res.json({ ...hit.data, cached: true });

  const cls = classify(symbol);
  const chain = PRECEDENCE[cls] || [fmpQuote, eodhdQuote];
  for (const fetcher of chain) {
    try {
      const q = await fetcher(symbol);
      if (q && q.price != null) {
        const data = { symbol, class: cls, ...q };
        cache.set(symbol, { ts: Date.now(), data });
        return res.json(data);
      }
    } catch { /* try next provider */ }
  }
  // 404, not 502: "no provider has this symbol" is a data condition, not a
  // gateway failure — 5xx here made retry-capable clients hammer a miss.
  return res.status(404).json({ error: 'no quote from any provider', symbol, class: cls });
});

export default router;
