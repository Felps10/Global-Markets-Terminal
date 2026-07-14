/**
 * server/services/quoteFetchManager.js
 *
 * Server-side periodic fetcher for Yahoo Finance + CoinGecko.
 *
 * Consolidates all market data fetching into one server-side process.
 * N authenticated users read from this cache — only 1 Yahoo request
 * is made per interval regardless of how many browsers are connected.
 *
 * Cache strategy:
 *   - Yahoo: refreshed every 60s during market hours, backs off on failure
 *   - CoinGecko: refreshed every 120s, same backoff pattern
 *   - Last-known-good data persists in memory until replaced by a newer success
 *   - On failure: interval doubles (capped at 10 min), data stays stale but usable
 */

import https from 'https';
import { ensureSession, getSession, refreshSession, httpsGet } from './yahooSession.js';
import { resolveLiveSymbols, resolveBrazilB3, getCachedPlan } from '../lib/symbolResolver.js';
import { isFmpSingleQuote } from '../lib/fmpSymbols.js';
import { getEodhd52wk, getCached52wk } from '../lib/eodhd52wk.js';

// ─── Cache state ─────────────────────────────────────────────────────────────

let yahooCache  = { data: null, ts: 0, error: null };
let cryptoCache = { data: null, ts: 0, error: null };
// BRAPI fallback: B3 tickers Yahoo didn't return, shaped as Yahoo-like entries and
// folded into the yahoo feed. Slow cadence + hard cap to respect the free 15k/mo budget.
let brapiCache  = { data: [], ts: 0 };
// EODHD "All-World" (paid): the PRIMARY feed for global classes (equity/index/fx). Entries
// are Yahoo-shaped and keyed by the display symbol, folded into the yahoo feed AFTER Yahoo
// so EODHD wins precedence (parseYahooResults is last-write-wins). Empty when the key is
// unset or EODHD is unreachable → the feed transparently falls back to Yahoo.
let eodhdCache  = { data: [], ts: 0, error: null };
// FMP "Premium" (paid, /stable API): Stage-1 gap-filler. Yahoo-shaped entries keyed by the
// display symbol for the classes EODHD can't serve — gold/silver futures (GCUSD/SIUSD) and
// the FTSE 100 index (^FTSE). Empty when FMP_KEY is unset → those symbols stay dark/on Yahoo.
let fmpCache    = { data: [], ts: 0, error: null };
// Brazil-terminal B3 feed (paid BRAPI Pro primary + Yahoo `.SA` fallback). Keyed map
// { [bareSymbol]: {price, change, changePct, prevClose, high, low, volume, ...} } served by
// GET /api/v1/quotes/brazil. Replaces the old per-browser, per-ticker client-side BRAPI path.
let brazilB3Cache = { data: {}, ts: 0, error: null };
// Sparkline series keyed by DISPLAY symbol → number[] of ~30 ascending daily closes.
let sparklineCache = { data: {}, ts: 0, error: null };

// ─── Per-provider fetch health ───────────────────────────────────────────────
// Records the outcome of each fetch cycle so the client Data Catalog can show REAL
// server-measured health for the server-side providers (EODHD, BRAPI Pro) that the
// browser cannot probe directly. Exposed read-only via getFetchStats() → /quotes/status.
const STAT_HISTORY_MAX = 10;
const fetchStats = {
  eodhd:     { ok: null, ms: null, ts: 0, count: 0, expected: 0, error: null, history: [] },
  fmp:       { ok: null, ms: null, ts: 0, count: 0, expected: 0, error: null, history: [] },
  yahoo:     { ok: null, ms: null, ts: 0, count: 0, expected: 0, error: null, history: [] },
  brapi:     { ok: null, ms: null, ts: 0, count: 0, expected: 0, error: null, history: [] },
  coingecko: { ok: null, ms: null, ts: 0, count: 0, expected: 0, error: null, history: [] },
};

function recordStat(provider, { ok, ms = null, count = 0, expected = 0, error = null }) {
  const s = fetchStats[provider];
  if (!s) return;
  s.ok = ok; s.ms = ms; s.ts = Date.now(); s.count = count; s.expected = expected; s.error = error;
  s.history.push(!!ok);
  if (s.history.length > STAT_HISTORY_MAX) s.history.shift();
}

// ─── Intervals & backoff ─────────────────────────────────────────────────────

const YAHOO_BASE_INTERVAL  = 120_000;  // 120s — reduced load; Yahoo rate-limits datacenter IPs
const CRYPTO_BASE_INTERVAL = 120_000;  // 120s
const GLOBAL_B3_INTERVAL   = 300_000;  // 5 min — global B3 (BRAPI Pro primary, full fields)
const MAX_BACKOFF          = 600_000;  // 10 min cap

// EODHD (paid, 100k calls/day; bills 1 call/symbol). Since Stage 2, FMP is PRIMARY for
// equities/FX (real-time) and EODHD is their WARM FALLBACK + primary for indices, so EODHD
// runs slower: ~161 symbols at 300s, 24/7 = ~46k calls/day (was ~77k at 180s) — frees budget
// and stops redundant per-symbol billing for data FMP already serves fresh (5-min index
// cadence is well within the 15-min tolerance).
const EODHD_BASE_INTERVAL  = 300_000;  // 5 min (fallback + index cadence)
const EODHD_BATCH          = 20;       // symbols/request (path symbol + 19 in s=); doc max ~15-20
const EODHD_CHUNK_GAP      = 150;      // ms between batches
const EODHD_TIMEOUT_MS     = 12_000;

// FMP "Premium" (paid, /stable API; 1 call/request, 750/min, no daily cap, 50GB/30d). Since
// Stage 2, FMP is PRIMARY for equities/FX + gold/silver (batch-quote) + ^FTSE (single quote):
// ~153 symbols in ~2 batches + 1 single ≈ 3 calls/60s ≈ 4.3k calls/day, ~2GB/30d — trivial vs
// the limits. Drives the real-time equity/FX feed, so it polls faster than EODHD.
const FMP_BASE_INTERVAL    = 60_000;   // 1 min
const FMP_BATCH            = 100;      // symbols per /stable/batch-quote (verified ~120 in 1 call)
const FMP_CHUNK_GAP        = 150;      // ms between batches
const FMP_TIMEOUT_MS       = 12_000;

// Sparkline series — real ~30-day daily closes from FMP historical-price-eod/light, attached
// to the quotes map so the client stops synthesizing sparklines with Math.random. It's a
// single-symbol endpoint (no batch), so we fetch per FMP-resolvable symbol (~153: equities/FX/
// indices/gold/silver) with bounded concurrency, once every SPARKLINE_INTERVAL — daily EOD only
// moves after the close, so 6h is ample and costs ~153 calls × 4/day ≈ 600/day (trivial vs
// FMP's 750/min). Gap classes FMP light-EOD can't serve (EU/Asia indices, B3, WTI/natgas futures,
// crypto) are then filled from their class-appropriate source (EODHD /eod, BRAPI history,
// CoinGecko market_chart, ETF-proxy) so NOTHING falls back to the client's Math.random synthetic.
const SPARKLINE_INTERVAL     = 6 * 60 * 60 * 1000; // 6h
const SPARKLINE_WINDOW_DAYS  = 45;                 // calendar window → ~30 trading days
const SPARKLINE_POINTS       = 30;                 // most-recent closes kept per symbol
const SPARKLINE_CONCURRENCY  = 8;                  // in-flight light-EOD requests
const SPARKLINE_CHUNK_GAP    = 150;                // ms between concurrency chunks
// WTI/natgas have no FMP/EODHD daily history → their sparkline tracks the liquid ETF proxy
// (shape only; the chart legend already flags proxied levels). Mirrors the client CHART_PROXY.
const SPARKLINE_PROXY = { 'CL=F': 'USO', 'NG=F': 'UNG' };

// Brazil B3 feed (BRAPI Pro: 20 tickers/req, 500k/mo). ~191 names ÷ 20 = 10 req/cycle;
// at 300s, 24/7 = ~86k req/mo — well under 500k. BRAPI Pro is ~5-min fresh, so ≤5-min cadence
// gains nothing. Yahoo `.SA` covers the few tickers BRAPI drops.
const BRAZIL_B3_INTERVAL   = 300_000;  // 5 min
const BRAPI_BATCH          = 20;       // tickers per BRAPI Pro request
const BRAZIL_B3_GAP        = 200;      // ms between batches
const BRAPI_TIMEOUT_MS     = 12_000;

// Yahoo v7 tolerates ~50 symbols per request comfortably; the full taxonomy is
// ~185 symbols, so we chunk and merge, with a small gap between batches.
const YAHOO_CHUNK      = 50;
const YAHOO_CHUNK_GAP  = 300;  // ms between batches

let yahooFailures  = 0;
let cryptoFailures = 0;
let eodhdFailures  = 0;
let fmpFailures    = 0;
let brazilFailures = 0;
let sparklineFailures = 0;
let yahooTimer     = null;
let cryptoTimer    = null;
let brapiTimer     = null;
let eodhdTimer     = null;
let fmpTimer       = null;
let brazilTimer    = null;
let sparklineTimer = null;
let eodhdKeyWarned = false;
let fmpKeyWarned   = false;
let brazilTokenWarned = false;
// EODHD codes that returned a hard 404 (unknown ticker). EODHD fails the WHOLE batch on
// one bad symbol, so we quarantine confirmed-unknowns to stop them poisoning future batches.
const eodhdQuarantine = new Set();
// FMP codes that returned a hard error (e.g. a symbol gated above Premium → 402). FMP's
// batch endpoint also fails the whole batch on one bad symbol, so quarantine confirmed-bad.
const fmpQuarantine = new Set();
// FMP codes whose light-EOD history is gated/empty (EU/Asia indices, B3, dead futures) —
// skip on future sparkline cycles so we don't re-hit a known 402 every 6h.
const sparklineQuarantine = new Set();

function getInterval(base, failures) {
  if (failures === 0) return base;
  return Math.min(base * Math.pow(2, failures), MAX_BACKOFF);
}

// ─── Yahoo fetch ─────────────────────────────────────────────────────────────

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Fetch one batch of symbols. Refreshes the crumb/session once on 401/403.
// Throws on non-200 so the caller can skip just this batch.
async function fetchYahooBatch(symbolList) {
  const mkUrl = (crumb) =>
    `https://query1.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolList.join(','))}` +
    `&crumb=${encodeURIComponent(crumb)}`;

  const s = getSession();
  let res = await httpsGet(mkUrl(s.crumb), { Cookie: s.cookie, Accept: 'application/json' });

  if (res.status === 401 || res.status === 403) {
    console.warn(`[quoteFetchManager:yahoo] Crumb rejected (${res.status}) — refreshing session…`);
    await refreshSession();
    const s2 = getSession();
    res = await httpsGet(mkUrl(s2.crumb), { Cookie: s2.cookie, Accept: 'application/json' });
  }

  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const json = JSON.parse(res.body);
  return json?.quoteResponse?.result || [];
}

async function fetchYahoo() {
  const tag = '[quoteFetchManager:yahoo]';
  const t0 = Date.now();
  let expected = 0;
  try {
    await ensureSession();
    const { yahoo } = await resolveLiveSymbols();
    expected = yahoo.length;
    const batches = chunk(yahoo, YAHOO_CHUNK);

    const merged = [];
    let okBatches = 0;
    let reqMs = 0, reqN = 0;   // sum/count of actual request round-trips (excludes rate-limit sleeps)
    for (const batch of batches) {
      const bt = Date.now();
      try {
        const results = await fetchYahooBatch(batch);
        if (results.length) { merged.push(...results); okBatches++; }
      } catch (err) {
        // One bad batch (rate limit, oversized, poisoned symbol) must not sink the rest.
        console.error(`${tag} batch of ${batch.length} failed: ${err.message}`);
      }
      reqMs += Date.now() - bt; reqN++;
      if (batches.length > 1) await new Promise((r) => setTimeout(r, YAHOO_CHUNK_GAP));
    }

    if (okBatches === 0) throw new Error('all Yahoo batches failed');

    yahooCache = { data: merged, ts: Date.now(), error: null };
    yahooFailures = 0;
    recordStat('yahoo', { ok: true, ms: reqN ? Math.round(reqMs / reqN) : null, count: merged.length, expected });
    console.log(`${tag} OK — ${merged.length} symbols cached (${okBatches}/${batches.length} batches)`);
  } catch (err) {
    yahooFailures++;
    yahooCache.error = err.message;
    recordStat('yahoo', { ok: false, ms: Date.now() - t0, expected, error: err.message });
    // Keep existing data (last-known-good) — only update error + don't clear data
    console.error(`${tag} FAIL #${yahooFailures}: ${err.message}`);
  }

  // Schedule next fetch with backoff
  scheduleYahoo();
}

function scheduleYahoo() {
  if (yahooTimer) clearTimeout(yahooTimer);
  const interval = getInterval(YAHOO_BASE_INTERVAL, yahooFailures);
  yahooTimer = setTimeout(fetchYahoo, interval);
  if (yahooFailures > 0) {
    console.log(`[quoteFetchManager:yahoo] Next fetch in ${Math.round(interval / 1000)}s (backoff #${yahooFailures})`);
  }
}

// ─── CoinGecko fetch ─────────────────────────────────────────────────────────

async function fetchCoinGecko() {
  const tag = '[quoteFetchManager:coingecko]';
  const t0 = Date.now();
  let expected = 0;
  try {
    const { crypto } = await resolveLiveSymbols();
    expected = Object.keys(crypto).length;
    const ids = Object.values(crypto).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    const res = await new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GMT-Server/1.0',
        },
      }, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve({ status: response.statusCode, body }));
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });

    if (res.status === 429) {
      throw new Error('CoinGecko rate limited (429)');
    }
    if (res.status !== 200) {
      throw new Error(`CoinGecko returned HTTP ${res.status}`);
    }

    const json = JSON.parse(res.body);
    cryptoCache = { data: json, ts: Date.now(), error: null };
    cryptoFailures = 0;
    recordStat('coingecko', { ok: true, ms: Date.now() - t0, count: Object.keys(json).length, expected });
    console.log(`${tag} OK — ${Object.keys(json).length} coins cached`);
  } catch (err) {
    cryptoFailures++;
    cryptoCache.error = err.message;
    recordStat('coingecko', { ok: false, ms: Date.now() - t0, expected, error: err.message });
    console.error(`${tag} FAIL #${cryptoFailures}: ${err.message}`);
  }

  scheduleCoinGecko();
}

function scheduleCoinGecko() {
  if (cryptoTimer) clearTimeout(cryptoTimer);
  const interval = getInterval(CRYPTO_BASE_INTERVAL, cryptoFailures);
  cryptoTimer = setTimeout(fetchCoinGecko, interval);
  if (cryptoFailures > 0) {
    console.log(`[quoteFetchManager:coingecko] Next fetch in ${Math.round(interval / 1000)}s (backoff #${cryptoFailures})`);
  }
}

// ─── Global B3 feed (BRAPI Pro PRIMARY, full fields) ─────────────────────────
// Stage 3 / P2: the global terminal's Brazilian highlights (terminal_view='global',
// brazil-highlights — PETR4/VALE3/ITUB4/BBDC4…) are BRAPI-Pro-primary. One server process
// batch-fetches every global B3 name (20/req) with FULL fields — BRAPI's field names mirror
// Yahoo v7 (`regularMarket*` + marketCap + 52wk), so the raw rows fold straight into
// buildQuotesMap keyed by display. Precedence ['brapi','eodhd','yahoo'] gives an EODHD `.SA`
// warm cache then Yahoo `.SA` as fallbacks. Replaces the old misses-only, sparse (price+%
// only), 1-req/ticker free-tier fallback that left global B3 on Yahoo with zeroed OHLC.
async function fetchGlobalB3() {
  const tag = '[quoteFetchManager:global-b3]';
  const token = process.env.VITE_BRAPI_TOKEN;
  if (!token) { brapiCache = { data: [], ts: Date.now() }; scheduleGlobalB3(); return; }
  try {
    const { b3 } = await resolveLiveSymbols();
    if (!b3 || b3.length === 0) { brapiCache = { data: [], ts: Date.now() }; scheduleGlobalB3(); return; }

    // BRAPI rewrites `symbol` after ticker renames → key by the requested (bare) ticker.
    const displayByBrapi = new Map(b3.map((x) => [x.brapi, x.display]));
    const out = [];
    for (const batch of chunk(b3.map((x) => x.brapi), BRAPI_BATCH)) {
      try {
        for (const q of await fetchBrapiBatch(batch, token)) {
          if (!isFiniteNum(q.regularMarketPrice)) continue;
          const reqSym = q.requestedSymbol || q.symbol;
          const display = displayByBrapi.get(reqSym) || reqSym;
          out.push({
            symbol: display, // key by display so buildQuotesMap matches p.display
            regularMarketPrice:          q.regularMarketPrice,
            regularMarketChangePercent:  q.regularMarketChangePercent,
            regularMarketPreviousClose:  q.regularMarketPreviousClose,
            regularMarketOpen:           q.regularMarketOpen,
            regularMarketDayHigh:        q.regularMarketDayHigh,
            regularMarketDayLow:         q.regularMarketDayLow,
            regularMarketVolume:         q.regularMarketVolume,
            marketCap:                   q.marketCap,
            fiftyTwoWeekHigh:            q.fiftyTwoWeekHigh,
            fiftyTwoWeekLow:             q.fiftyTwoWeekLow,
            _source: 'brapi',
          });
        }
      } catch (err) {
        console.error(`${tag} BRAPI batch of ${batch.length} failed: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, BRAZIL_B3_GAP));
    }

    brapiCache = { data: out, ts: Date.now() };
    console.log(`${tag} OK — ${out.length}/${b3.length} global B3 names cached (BRAPI Pro, full fields)`);
  } catch (err) {
    console.error(`${tag} FAIL: ${err.message}`);
  }
  scheduleGlobalB3();
}

function scheduleGlobalB3() {
  if (brapiTimer) clearTimeout(brapiTimer);
  brapiTimer = setTimeout(fetchGlobalB3, GLOBAL_B3_INTERVAL);
}

// ─── EODHD fetch (primary for global classes) ────────────────────────────────
// EODHD "All-World" REST live/delayed quotes via API key (no IP blocking, unlike Yahoo).
// Response row: { code, close, change_p, previousClose, high, low, volume, timestamp }.
// A single-symbol request returns an object; a batch (`s=`) returns an array.

const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Normalize one EODHD row into a Yahoo-shaped entry keyed by the display symbol, so it
// folds into the existing feed with no frontend change. Drops "NA"/non-numeric rows
// (EODHD returns close:"NA" for a known-but-no-data symbol → must fall through to Yahoo).
function pushEodhdRow(out, row, reverse) {
  if (!row || !isFiniteNum(row.close)) return;
  const symbol = reverse.get(row.code);
  if (!symbol) return; // unknown code — shouldn't happen (we built the request)
  // EODHD real-time carries no 52-week range → backfill from the cached 1y-EOD extremes
  // (warmed by fetchEodhd). Null until the first warm completes.
  const w52 = getCached52wk(row.code);
  out.push({
    symbol,
    regularMarketPrice: row.close,
    regularMarketChangePercent: isFiniteNum(row.change_p) ? row.change_p : undefined,
    regularMarketChange: isFiniteNum(row.change) ? row.change : undefined,
    regularMarketPreviousClose: isFiniteNum(row.previousClose) ? row.previousClose : undefined,
    regularMarketDayHigh: isFiniteNum(row.high) ? row.high : undefined,
    regularMarketDayLow: isFiniteNum(row.low) ? row.low : undefined,
    regularMarketVolume: isFiniteNum(row.volume) ? row.volume : undefined,
    fiftyTwoWeekHigh: w52 ? w52.high : undefined,
    fiftyTwoWeekLow: w52 ? w52.low : undefined,
    _source: 'eodhd',
  });
}

// Fetch one batch. First code in the path, the rest in `s=` (additive). Returns an array
// of rows. Throws on non-200 so the caller can isolate/quarantine a poison ticker.
async function fetchEodhdBatch(codes) {
  const [first, ...rest] = codes;
  const params = new URLSearchParams({ api_token: process.env.EODHD_API_KEY, fmt: 'json' });
  if (rest.length) params.set('s', rest.join(','));
  const url = `https://eodhd.com/api/real-time/${encodeURIComponent(first)}?${params.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(EODHD_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  return Array.isArray(json) ? json : [json];
}

async function fetchEodhd() {
  const tag = '[quoteFetchManager:eodhd]';
  const t0 = Date.now();
  if (!process.env.EODHD_API_KEY) {
    if (!eodhdKeyWarned) {
      console.warn(`${tag} EODHD_API_KEY not set — EODHD disabled; Yahoo remains primary`);
      eodhdKeyWarned = true;
    }
    recordStat('eodhd', { ok: false, ms: null, error: 'EODHD_API_KEY not set' });
    scheduleEodhd();
    return;
  }

  try {
    const { eodhd } = await resolveLiveSymbols();
    if (!eodhd || eodhd.length === 0) {
      eodhdCache = { data: [], ts: Date.now(), error: null };
      eodhdFailures = 0;
      recordStat('eodhd', { ok: true, ms: Date.now() - t0, count: 0, expected: 0 });
      scheduleEodhd();
      return;
    }

    // Reverse index (EODHD code → display symbol) + the active, non-quarantined code list.
    const reverse = new Map();
    const codes = [];
    for (const e of eodhd) {
      reverse.set(e.eodhd, e.display);
      if (!eodhdQuarantine.has(e.eodhd)) codes.push(e.eodhd);
    }

    // Warm the 52-week cache for these codes (fire-and-forget; TTL-guarded so it truly fetches
    // only ~once/12h per code). pushEodhdRow reads getCached52wk() to attach the range.
    void Promise.allSettled(codes.map((c) => getEodhd52wk(c)));

    const out = [];
    let okBatches = 0;
    let reqMs = 0, reqN = 0;   // sum/count of actual request round-trips (excludes rate-limit sleeps)
    const batches = chunk(codes, EODHD_BATCH);
    for (const batch of batches) {
      const bt = Date.now();
      try {
        for (const row of await fetchEodhdBatch(batch)) pushEodhdRow(out, row, reverse);
        okBatches++;
      } catch (err) {
        // EODHD 404s the WHOLE batch on one unknown ticker. Retry per-symbol to salvage the
        // good ones and quarantine the culprit(s) so they can't poison the next cycle.
        console.warn(`${tag} batch of ${batch.length} failed (${err.message}) — isolating`);
        for (const code of batch) {
          try {
            for (const row of await fetchEodhdBatch([code])) pushEodhdRow(out, row, reverse);
          } catch {
            eodhdQuarantine.add(code); // confirmed unknown/unreachable → stop requesting it
          }
        }
      }
      reqMs += Date.now() - bt; reqN++;
      if (batches.length > 1) await new Promise((r) => setTimeout(r, EODHD_CHUNK_GAP));
    }

    if (okBatches === 0 && out.length === 0 && codes.length > 0) {
      throw new Error('all EODHD batches failed');
    }

    eodhdCache = { data: out, ts: Date.now(), error: null };
    eodhdFailures = 0;
    recordStat('eodhd', { ok: true, ms: reqN ? Math.round(reqMs / reqN) : null, count: out.length, expected: codes.length });
    console.log(`${tag} OK — ${out.length}/${codes.length} symbols${eodhdQuarantine.size ? ` (${eodhdQuarantine.size} quarantined)` : ''}`);
  } catch (err) {
    eodhdFailures++;
    eodhdCache.error = err.message;
    recordStat('eodhd', { ok: false, ms: Date.now() - t0, error: err.message });
    console.error(`${tag} FAIL #${eodhdFailures}: ${err.message}`);
  }

  scheduleEodhd();
}

function scheduleEodhd() {
  if (eodhdTimer) clearTimeout(eodhdTimer);
  const interval = getInterval(EODHD_BASE_INTERVAL, eodhdFailures);
  eodhdTimer = setTimeout(fetchEodhd, interval);
  if (eodhdFailures > 0) {
    console.log(`[quoteFetchManager:eodhd] Next fetch in ${Math.round(interval / 1000)}s (backoff #${eodhdFailures})`);
  }
}

// ─── FMP fetch (Stage-1 gap-filler: gold/silver futures + ^FTSE) ──────────────
// FMP "Premium" via the /stable API (legacy /api/v3 is dead → 403). Commodities go through
// /stable/batch-quote (1 call, many symbols); indices (^…) go through /stable/quote, since
// batch-quote 402s index symbols. Rows are normalized to the Yahoo shape keyed by the
// display symbol, so they fold into the quotes map with no frontend change.

// FMP /stable quote + batch-quote share field names: { symbol, price, changePercentage,
// change, previousClose, dayHigh, dayLow, volume, marketCap, yearHigh, yearLow, ... }.
function pushFmpRow(out, row, reverse) {
  if (!row || !isFiniteNum(row.price)) return;
  const symbol = reverse.get(row.symbol);
  if (!symbol) return; // unknown code — shouldn't happen (we built the request)
  out.push({
    symbol,
    regularMarketPrice: row.price,
    regularMarketChangePercent: isFiniteNum(row.changePercentage) ? row.changePercentage : undefined,
    regularMarketChange: isFiniteNum(row.change) ? row.change : undefined,
    regularMarketPreviousClose: isFiniteNum(row.previousClose) ? row.previousClose : undefined,
    regularMarketDayHigh: isFiniteNum(row.dayHigh) ? row.dayHigh : undefined,
    regularMarketDayLow: isFiniteNum(row.dayLow) ? row.dayLow : undefined,
    regularMarketVolume: isFiniteNum(row.volume) ? row.volume : undefined,
    marketCap: isFiniteNum(row.marketCap) && row.marketCap > 0 ? row.marketCap : undefined, // 0 for indices
    fiftyTwoWeekHigh: isFiniteNum(row.yearHigh) ? row.yearHigh : undefined,
    fiftyTwoWeekLow: isFiniteNum(row.yearLow) ? row.yearLow : undefined,
    // Already in the FMP payload, previously discarded — Yahoo-shaped names so they
    // fold into the quotes map uniformly with the Yahoo/EODHD rows (zero extra calls).
    regularMarketOpen: isFiniteNum(row.open) ? row.open : undefined,
    fiftyDayAverage: isFiniteNum(row.priceAvg50) ? row.priceAvg50 : undefined,
    twoHundredDayAverage: isFiniteNum(row.priceAvg200) ? row.priceAvg200 : undefined,
    _source: 'fmp',
  });
}

async function fetchFmpBatch(codes) {
  const params = new URLSearchParams({ symbols: codes.join(','), apikey: process.env.FMP_KEY });
  const url = `https://financialmodelingprep.com/stable/batch-quote?${params.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(FMP_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  return Array.isArray(json) ? json : [json];
}

async function fetchFmpSingle(code) {
  const params = new URLSearchParams({ symbol: code, apikey: process.env.FMP_KEY });
  const url = `https://financialmodelingprep.com/stable/quote?${params.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(FMP_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  return Array.isArray(json) ? json : [json];
}

async function fetchFmp() {
  const tag = '[quoteFetchManager:fmp]';
  const t0 = Date.now();
  if (!process.env.FMP_KEY) {
    if (!fmpKeyWarned) {
      console.warn(`${tag} FMP_KEY not set — FMP disabled; gold/silver + ^FTSE stay on Yahoo/dark`);
      fmpKeyWarned = true;
    }
    recordStat('fmp', { ok: false, ms: null, error: 'FMP_KEY not set' });
    scheduleFmp();
    return;
  }

  try {
    const { fmp } = await resolveLiveSymbols();
    if (!fmp || fmp.length === 0) {
      fmpCache = { data: [], ts: Date.now(), error: null };
      fmpFailures = 0;
      recordStat('fmp', { ok: true, ms: Date.now() - t0, count: 0, expected: 0 });
      scheduleFmp();
      return;
    }

    // Reverse index (FMP code → display) + active, non-quarantined codes split by endpoint:
    // indices (^…) → single /quote, everything else → batch-quote.
    const reverse = new Map();
    const batchCodes = [];
    const singleCodes = [];
    for (const f of fmp) {
      reverse.set(f.fmp, f.display);
      if (fmpQuarantine.has(f.fmp)) continue;
      (isFmpSingleQuote(f.fmp) ? singleCodes : batchCodes).push(f.fmp);
    }

    const out = [];
    let okReqs = 0;
    let reqMs = 0, reqN = 0;

    for (const batch of chunk(batchCodes, FMP_BATCH)) {
      const bt = Date.now();
      try {
        for (const row of await fetchFmpBatch(batch)) pushFmpRow(out, row, reverse);
        okReqs++;
      } catch (err) {
        // FMP fails the whole batch on one bad symbol → isolate per-symbol + quarantine.
        console.warn(`${tag} batch of ${batch.length} failed (${err.message}) — isolating`);
        for (const code of batch) {
          try {
            for (const row of await fetchFmpBatch([code])) pushFmpRow(out, row, reverse);
            okReqs++;
          } catch {
            fmpQuarantine.add(code);
          }
        }
      }
      reqMs += Date.now() - bt; reqN++;
      if (batchCodes.length > FMP_BATCH) await new Promise((r) => setTimeout(r, FMP_CHUNK_GAP));
    }

    for (const code of singleCodes) {
      const bt = Date.now();
      try {
        for (const row of await fetchFmpSingle(code)) pushFmpRow(out, row, reverse);
        okReqs++;
      } catch {
        fmpQuarantine.add(code);
      }
      reqMs += Date.now() - bt; reqN++;
    }

    const attempted = batchCodes.length + singleCodes.length;
    if (okReqs === 0 && out.length === 0 && attempted > 0) {
      throw new Error('all FMP requests failed');
    }

    fmpCache = { data: out, ts: Date.now(), error: null };
    fmpFailures = 0;
    recordStat('fmp', { ok: true, ms: reqN ? Math.round(reqMs / reqN) : null, count: out.length, expected: attempted });
    console.log(`${tag} OK — ${out.length}/${attempted} symbols${fmpQuarantine.size ? ` (${fmpQuarantine.size} quarantined)` : ''}`);
  } catch (err) {
    fmpFailures++;
    fmpCache.error = err.message;
    recordStat('fmp', { ok: false, ms: Date.now() - t0, error: err.message });
    console.error(`${tag} FAIL #${fmpFailures}: ${err.message}`);
  }

  scheduleFmp();
}

function scheduleFmp() {
  if (fmpTimer) clearTimeout(fmpTimer);
  const interval = getInterval(FMP_BASE_INTERVAL, fmpFailures);
  fmpTimer = setTimeout(fetchFmp, interval);
  if (fmpFailures > 0) {
    console.log(`[quoteFetchManager:fmp] Next fetch in ${Math.round(interval / 1000)}s (backoff #${fmpFailures})`);
  }
}

// ─── Sparkline series (FMP daily-EOD closes; ~6h cadence) ─────────────────────
// Real ~30-point close series per FMP-resolvable symbol, folded into the quotes map so the
// client no longer synthesizes sparklines. See the SPARKLINE_* constants for the rationale.

const ymd = (d) => d.toISOString().slice(0, 10);

// One symbol → ascending array of the most-recent ~30 closes (or throws for the caller to skip).
async function fetchSparklineOne(code) {
  const to = new Date();
  const from = new Date(to.getTime() - SPARKLINE_WINDOW_DAYS * 86_400_000);
  const params = new URLSearchParams({ symbol: code, from: ymd(from), to: ymd(to), apikey: process.env.FMP_KEY });
  const url = `https://financialmodelingprep.com/stable/historical-price-eod/light?${params.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(FMP_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`); // 402 = gated class
  const json = await r.json();
  if (!Array.isArray(json) || json.length === 0) throw new Error('empty');
  // Payload is NEWEST-FIRST → reverse to ascending, keep the most-recent SPARKLINE_POINTS.
  const closes = json.map((x) => x.price).filter(isFiniteNum).reverse();
  return closes.length > SPARKLINE_POINTS ? closes.slice(-SPARKLINE_POINTS) : closes;
}

// Gap-fill helpers — one ASCENDING close array (≥2) or null. Used for classes FMP light-EOD
// can't serve, so the client never has to synthesize.
const sparkTrim = (closes) => (closes.length >= 2 ? closes.slice(-SPARKLINE_POINTS) : null);

async function sparklineFromEodhd(code) { // EODHD-only indices/FX (^GDAXI, ^BVSP, …)
  if (!process.env.EODHD_API_KEY || !code) return null;
  const from = ymd(new Date(Date.now() - SPARKLINE_WINDOW_DAYS * 86_400_000));
  const url = `https://eodhd.com/api/eod/${encodeURIComponent(code)}?api_token=${process.env.EODHD_API_KEY}&fmt=json&period=d&from=${from}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(FMP_TIMEOUT_MS) });
  if (!r.ok) return null;
  const rows = await r.json(); // ascending [{date, close, …}]
  return sparkTrim((Array.isArray(rows) ? rows : []).map((x) => x.close).filter(isFiniteNum));
}

async function sparklineFromCoinGecko(cgId) { // crypto
  if (!cgId) return null;
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}/market_chart?vs_currency=usd&days=30&interval=daily`;
  const r = await fetch(url, { signal: AbortSignal.timeout(FMP_TIMEOUT_MS), headers: { Accept: 'application/json', 'User-Agent': 'GMT-Server/1.0' } });
  if (!r.ok) return null;
  const json = await r.json(); // { prices: [[ts, price], …] } ascending
  return sparkTrim((json?.prices || []).map((p) => p[1]).filter(isFiniteNum));
}

async function sparklineFromBrapi(ticker) { // B3
  const token = process.env.VITE_BRAPI_TOKEN;
  if (!token || !ticker) return null;
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?range=1mo&interval=1d&token=${encodeURIComponent(token)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(BRAPI_TIMEOUT_MS) });
  if (!r.ok) return null;
  const json = await r.json();
  const hist = json?.results?.[0]?.historicalDataPrice || []; // ascending
  return sparkTrim(hist.map((x) => x.close).filter(isFiniteNum));
}

async function fetchSparklines() {
  const tag = '[quoteFetchManager:sparkline]';
  if (!process.env.FMP_KEY) {
    // No FMP key → no server sparklines; client falls back to synthetic. Log once via the FMP path.
    scheduleSparklines();
    return;
  }
  try {
    const { fmp, crypto, b3, eodhd } = await resolveLiveSymbols();
    const data = {};
    let ok = 0;

    // Pass 1 — FMP light-EOD for FMP-resolvable symbols (equities/FX/gold-silver/US+FTSE indices).
    const targets = (fmp || []).filter((f) => !sparklineQuarantine.has(f.fmp));
    for (const batch of chunk(targets, SPARKLINE_CONCURRENCY)) {
      await Promise.all(batch.map(async (f) => {
        try {
          const closes = await fetchSparklineOne(f.fmp);
          if (closes.length >= 2) { data[f.display] = closes; ok++; }
          else sparklineQuarantine.add(f.fmp); // too few points to plot
        } catch {
          sparklineQuarantine.add(f.fmp); // gated/empty → stop retrying it
        }
      }));
      await new Promise((r) => setTimeout(r, SPARKLINE_CHUNK_GAP));
    }

    // Pass 2 — gap-fill everything FMP couldn't serve, from its class-appropriate source, so the
    // client never synthesizes. crypto→CoinGecko, B3→BRAPI, EODHD-only indices/FX→EODHD,
    // WTI/natgas→FMP light-EOD on the ETF proxy. Equities in the eodhd warm-fallback set are
    // already filled by pass 1 (skipped here). Failures leave the symbol out (client synthesizes).
    const gap = [];
    for (const [display, cgId] of Object.entries(crypto || {}))
      if (!data[display]) gap.push([display, () => sparklineFromCoinGecko(cgId)]);
    for (const x of (b3 || []))
      if (!data[x.display]) gap.push([x.display, () => sparklineFromBrapi(x.brapi)]);
    for (const x of (eodhd || []))
      if (!data[x.display]) gap.push([x.display, () => sparklineFromEodhd(x.eodhd)]);
    for (const [display, proxy] of Object.entries(SPARKLINE_PROXY))
      if (!data[display]) gap.push([display, () => fetchSparklineOne(proxy)]);

    let gapOk = 0;
    for (const batch of chunk(gap, SPARKLINE_CONCURRENCY)) {
      await Promise.all(batch.map(async ([display, fn]) => {
        try { const closes = await fn(); if (closes && closes.length >= 2) { data[display] = closes; gapOk++; } }
        catch { /* leave it out → client synthesizes */ }
      }));
      await new Promise((r) => setTimeout(r, SPARKLINE_CHUNK_GAP));
    }

    sparklineCache = { data, ts: Date.now(), error: null };
    sparklineFailures = 0;
    console.log(`${tag} OK — ${ok}/${targets.length} FMP + ${gapOk}/${gap.length} gap-fill = ${Object.keys(data).length} series${sparklineQuarantine.size ? ` (${sparklineQuarantine.size} FMP-quarantined)` : ''}`);
  } catch (err) {
    sparklineFailures++;
    sparklineCache.error = err.message;
    console.error(`${tag} FAIL #${sparklineFailures}: ${err.message}`);
  }
  scheduleSparklines();
}

function scheduleSparklines() {
  if (sparklineTimer) clearTimeout(sparklineTimer);
  // Fixed cadence (daily EOD) — a transient failure just waits for the next window; the stale
  // cache keeps serving in the meantime, so no exponential backoff is needed here.
  sparklineTimer = setTimeout(fetchSparklines, SPARKLINE_INTERVAL);
}

// ─── Brazil B3 feed (BRAPI Pro primary + Yahoo .SA fallback) ──────────────────
// Serves the Brazil terminal's ~191 B3 names from ONE server process (BRAPI Pro, 20/req,
// every 5 min) instead of every browser firing one request per ticker with the public
// token. Yahoo `.SA` backfills any ticker BRAPI drops. Exposed via GET /api/v1/quotes/brazil.

// BRAPI mirrors Yahoo v7 field names (regularMarket*), so one normalizer serves both.
function normalizeB3Quote(q, source) {
  const price = q.regularMarketPrice;
  if (!isFiniteNum(price)) return null;
  const prevClose = isFiniteNum(q.regularMarketPreviousClose) ? q.regularMarketPreviousClose : price;
  return {
    price,
    change:           isFiniteNum(q.regularMarketChange) ? q.regularMarketChange : (price - prevClose),
    changePct:        isFiniteNum(q.regularMarketChangePercent)
                        ? q.regularMarketChangePercent
                        : (prevClose ? ((price - prevClose) / prevClose) * 100 : 0),
    prevClose,
    high:             isFiniteNum(q.regularMarketDayHigh) ? q.regularMarketDayHigh : price,
    low:              isFiniteNum(q.regularMarketDayLow) ? q.regularMarketDayLow : price,
    volume:           isFiniteNum(q.regularMarketVolume) ? q.regularMarketVolume : null,
    marketCap:        q.marketCap || null,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || null,
    fiftyTwoWeekLow:  q.fiftyTwoWeekLow || null,
    longName:         q.longName || q.shortName || null,
    currency:         q.currency || 'BRL',
    source,
  };
}

// One BRAPI batch (≤20 tickers). Throws on non-200 so a bad batch doesn't sink the rest.
async function fetchBrapiBatch(tickers, token) {
  const url = `https://brapi.dev/api/quote/${tickers.map(encodeURIComponent).join(',')}` +
    `?token=${encodeURIComponent(token)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(BRAPI_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  return json?.results || [];
}

async function fetchBrazilB3() {
  const tag = '[quoteFetchManager:brazil-b3]';
  const t0 = Date.now();
  const token = process.env.VITE_BRAPI_TOKEN;
  if (!token) {
    if (!brazilTokenWarned) {
      console.warn(`${tag} VITE_BRAPI_TOKEN not set — Brazil B3 feed disabled`);
      brazilTokenWarned = true;
    }
    recordStat('brapi', { ok: false, ms: null, error: 'VITE_BRAPI_TOKEN not set' });
    scheduleBrazilB3();
    return;
  }

  try {
    const { brazilB3 } = await resolveBrazilB3();
    if (!brazilB3 || brazilB3.length === 0) {
      brazilB3Cache = { data: {}, ts: Date.now(), error: null };
      brazilFailures = 0;
      recordStat('brapi', { ok: true, ms: Date.now() - t0, count: 0, expected: 0 });
      scheduleBrazilB3();
      return;
    }

    const map = {};
    const displayByBrapi = new Map(brazilB3.map((x) => [x.brapi, x.display]));
    let okBatches = 0;
    let reqMs = 0, reqN = 0;   // BRAPI Pro request round-trips (primary path; excludes sleeps)

    // Primary: BRAPI Pro batches. Key by `requestedSymbol` (the ticker we asked for) —
    // BRAPI rewrites `symbol` to the CURRENT ticker after renames/reorgs (e.g. JBSS3→JBSS32,
    // EMBR3→EMBJ3), so keying by `symbol` would drop renamed names under garbage keys.
    for (const batch of chunk(brazilB3.map((x) => x.brapi), BRAPI_BATCH)) {
      const bt = Date.now();
      try {
        for (const q of await fetchBrapiBatch(batch, token)) {
          const reqSym = q.requestedSymbol || q.symbol;
          const display = displayByBrapi.get(reqSym) || reqSym;
          const entry = normalizeB3Quote(q, 'brapi');
          if (entry) map[display] = entry;
        }
        okBatches++;
      } catch (err) {
        console.error(`${tag} BRAPI batch of ${batch.length} failed: ${err.message}`);
      }
      reqMs += Date.now() - bt; reqN++;
      await new Promise((r) => setTimeout(r, BRAZIL_B3_GAP));
    }

    // Fallback: Yahoo `.SA` for the tickers BRAPI didn't return.
    const misses = brazilB3.filter((x) => !map[x.display]);
    if (misses.length) {
      const missDisplays = new Set(misses.map((m) => m.display));
      try {
        await ensureSession();
        for (const batch of chunk(misses.map((x) => x.yahoo), YAHOO_CHUNK)) {
          try {
            for (const q of await fetchYahooBatch(batch)) {
              const display = (q.symbol || '').replace(/\.SA$/, '');
              if (!missDisplays.has(display)) continue;
              const entry = normalizeB3Quote(q, 'yahoo-sa');
              if (entry) map[display] = entry;
            }
          } catch (err) {
            console.error(`${tag} Yahoo .SA fallback batch failed: ${err.message}`);
          }
          await new Promise((r) => setTimeout(r, YAHOO_CHUNK_GAP));
        }
      } catch (err) {
        console.error(`${tag} Yahoo .SA fallback session failed: ${err.message}`);
      }
    }

    if (okBatches === 0 && Object.keys(map).length === 0) {
      throw new Error('all BRAPI batches failed and Yahoo fallback empty');
    }

    brazilB3Cache = { data: map, ts: Date.now(), error: null };
    brazilFailures = 0;
    recordStat('brapi', { ok: true, ms: reqN ? Math.round(reqMs / reqN) : null, count: Object.keys(map).length, expected: brazilB3.length });
    console.log(`${tag} OK — ${Object.keys(map).length}/${brazilB3.length} B3 names cached`);
  } catch (err) {
    brazilFailures++;
    brazilB3Cache.error = err.message; // keep last-known-good data
    recordStat('brapi', { ok: false, ms: Date.now() - t0, error: err.message });
    console.error(`${tag} FAIL #${brazilFailures}: ${err.message}`);
  }

  scheduleBrazilB3();
}

function scheduleBrazilB3() {
  if (brazilTimer) clearTimeout(brazilTimer);
  const interval = getInterval(BRAZIL_B3_INTERVAL, brazilFailures);
  brazilTimer = setTimeout(fetchBrazilB3, interval);
  if (brazilFailures > 0) {
    console.log(`[quoteFetchManager:brazil-b3] Next fetch in ${Math.round(interval / 1000)}s (backoff #${brazilFailures})`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the normalized quotes[symbol] map (Phase C): for every planned asset, walk its
 * config-honored precedence and take the first provider that returned a usable price,
 * tagging the winner as `source`. This is what makes the admin precedence config fully
 * effective (beyond the EODHD fetch-set axis) and lets the UI show a per-card source badge.
 *
 * Reads the RAW provider caches (yahoo/eodhd/brapi are separate here; getCache only folds
 * them into the legacy array). BRAPI + Yahoo + EODHD all use Yahoo v7 `regularMarket*`
 * field names; CoinGecko is mapped into the same shape.
 */
function buildQuotesMap(plan) {
  const quotes = {};
  if (!plan || plan.length === 0) return quotes;

  const yahooIdx = new Map();
  for (const q of yahooCache.data || []) if (q && q.symbol != null) yahooIdx.set(q.symbol, q);
  const eodhdIdx = new Map();
  for (const q of eodhdCache.data || []) if (q && q.symbol != null) eodhdIdx.set(q.symbol, q);
  const brapiIdx = new Map();
  for (const q of brapiCache.data || []) if (q && q.symbol != null) brapiIdx.set(q.symbol, q);
  const fmpIdx = new Map();
  for (const q of fmpCache.data || []) if (q && q.symbol != null) fmpIdx.set(q.symbol, q);
  const cryptoData = cryptoCache.data || {};

  for (const p of plan) {
    for (const provider of p.precedence) {
      let raw = null;
      if (provider === 'eodhd') raw = eodhdIdx.get(p.display);
      else if (provider === 'yahoo') raw = yahooIdx.get(p.yahooKey);
      else if (provider === 'brapi') raw = brapiIdx.get(p.display);
      else if (provider === 'fmp') raw = fmpIdx.get(p.display);
      else if (provider === 'coingecko') {
        const c = p.cgId ? cryptoData[p.cgId] : null;
        if (c && isFiniteNum(c.usd)) raw = { regularMarketPrice: c.usd, regularMarketChangePercent: c.usd_24h_change };
      }
      if (raw && isFiniteNum(raw.regularMarketPrice)) {
        quotes[p.display] = {
          price:     raw.regularMarketPrice,
          changePct: isFiniteNum(raw.regularMarketChangePercent) ? raw.regularMarketChangePercent : null,
          prevClose: isFiniteNum(raw.regularMarketPreviousClose) ? raw.regularMarketPreviousClose : null,
          high:      isFiniteNum(raw.regularMarketDayHigh) ? raw.regularMarketDayHigh : null,
          low:       isFiniteNum(raw.regularMarketDayLow) ? raw.regularMarketDayLow : null,
          volume:    isFiniteNum(raw.regularMarketVolume) ? raw.regularMarketVolume : null,
          marketCap: isFiniteNum(raw.marketCap) ? raw.marketCap : null,
          fiftyTwoWeekHigh: isFiniteNum(raw.fiftyTwoWeekHigh) ? raw.fiftyTwoWeekHigh : null,
          fiftyTwoWeekLow:  isFiniteNum(raw.fiftyTwoWeekLow) ? raw.fiftyTwoWeekLow : null,
          open:                isFiniteNum(raw.regularMarketOpen) ? raw.regularMarketOpen : null,
          fiftyDayAverage:     isFiniteNum(raw.fiftyDayAverage) ? raw.fiftyDayAverage : null,
          twoHundredDayAverage: isFiniteNum(raw.twoHundredDayAverage) ? raw.twoHundredDayAverage : null,
          // Real ~30-day daily-close series (FMP light-EOD) for FMP-resolvable symbols; null
          // for gap classes → client synthesizes. Keyed by display, so it folds in uniformly.
          sparkline: sparklineCache.data[p.display] || null,
          source:    provider,
        };
        break;
      }
    }
  }
  return quotes;
}

// Memoized wrapper around buildQuotesMap. buildQuotesMap re-indexes every provider cache
// into Maps and walks the full ~185-asset plan; its inputs only change when a fetcher writes
// a new cache (every 120–300s) or the plan is re-resolved. Without this, every /quotes/live
// request rebuilds the map from scratch. Recompute only when any provider cache timestamp
// moves (crypto + fmp + sparkline INCLUDED — they feed buildQuotesMap but are excluded from
// getCache's mergedTs) or the plan reference changes (getCachedPlan returns a stable ref).
let _quotesMemo = { key: null, plan: null, result: null };

function getQuotesMap() {
  const plan = getCachedPlan();
  const key = `${yahooCache.ts}|${eodhdCache.ts}|${brapiCache.ts}|${cryptoCache.ts}|${fmpCache.ts}|${sparklineCache.ts}`;
  if (_quotesMemo.result && _quotesMemo.key === key && _quotesMemo.plan === plan) {
    return _quotesMemo.result;
  }
  const result = buildQuotesMap(plan);
  _quotesMemo = { key, plan, result };
  return result;
}

/**
 * Returns the current cache state for Yahoo + CoinGecko (legacy arrays, kept for backward
 * compat) plus the normalized `quotes[symbol]` map (Phase C — the source of truth going
 * forward). Data may be stale (check .ts) but is the last-known-good value.
 */
export function getCache() {
  // Merge all provider caches into the single "yahoo" array the client already reads.
  // Order matters: parseYahooResults is last-write-wins, so EODHD is appended LAST to win
  // precedence for the global classes it serves; BRAPI fills B3 tickers Yahoo missed.
  // Non-Yahoo sources are served even when Yahoo itself is down (EODHD removes the hard
  // dependency on Yahoo that used to rot the feed to the snapshot fallback).
  const parts = [];
  if (yahooCache.data) parts.push(...yahooCache.data);
  parts.push(...brapiCache.data);
  parts.push(...eodhdCache.data);
  parts.push(...fmpCache.data);
  const yahooData = parts.length ? parts : yahooCache.data;

  // Report the freshest source's timestamp so the /quotes/live staleness label reflects
  // reality when EODHD/FMP are carrying the feed and Yahoo is stale/absent.
  const mergedTs = Math.max(yahooCache.ts || 0, brapiCache.ts || 0, eodhdCache.ts || 0, fmpCache.ts || 0);

  return {
    yahoo: { data: yahooData, ts: mergedTs, error: yahooCache.error },
    crypto: { ...cryptoCache },
    quotes: getQuotesMap(),
  };
}

/**
 * Returns the Brazil-terminal B3 cache: a keyed map { [bareSymbol]: {price, changePct, ...} }.
 * Consumed by GET /api/v1/quotes/brazil. Data may be stale (check .ts).
 */
export function getBrazilB3Cache() {
  return { ...brazilB3Cache };
}

/**
 * Per-provider fetch health for the server-side quote engine. Read-only snapshot of the
 * last fetch cycle for each provider: { ok, ms, ts, count, expected, error, history[] }.
 * Consumed by GET /api/v1/quotes/status → the Data Catalog's server-side source cards.
 */
export function getFetchStats() {
  const out = {};
  for (const [k, v] of Object.entries(fetchStats)) out[k] = { ...v, history: [...v.history] };
  return out;
}

/**
 * Start periodic fetching. Call once at server boot.
 */
export function start() {
  console.log('[quoteFetchManager] Starting periodic fetchers');
  // Fire Yahoo + CoinGecko + EODHD immediately, then they self-schedule.
  fetchYahoo();
  fetchCoinGecko();
  fetchEodhd(); // primary for global classes; no-ops safely if EODHD_API_KEY is unset
  fetchFmp();   // gap-filler (gold/silver + ^FTSE); no-ops safely if FMP_KEY is unset
  fetchBrazilB3(); // Brazil-terminal B3 feed; no-ops safely if VITE_BRAPI_TOKEN is unset
  fetchGlobalB3(); // global-terminal B3 highlights (BRAPI Pro primary, full fields); safe no-op w/o token
  // Sparklines are not latency-critical (6h cadence) — delay the first run so the quote
  // fetchers populate first and it doesn't compete at boot.
  sparklineTimer = setTimeout(fetchSparklines, 20_000);
}

/**
 * Stop periodic fetching. Call on SIGTERM.
 */
export function stop() {
  console.log('[quoteFetchManager] Stopping periodic fetchers');
  if (yahooTimer) { clearTimeout(yahooTimer); yahooTimer = null; }
  if (cryptoTimer) { clearTimeout(cryptoTimer); cryptoTimer = null; }
  if (brapiTimer) { clearTimeout(brapiTimer); brapiTimer = null; }
  if (eodhdTimer) { clearTimeout(eodhdTimer); eodhdTimer = null; }
  if (fmpTimer) { clearTimeout(fmpTimer); fmpTimer = null; }
  if (brazilTimer) { clearTimeout(brazilTimer); brazilTimer = null; }
  if (sparklineTimer) { clearTimeout(sparklineTimer); sparklineTimer = null; }
}
