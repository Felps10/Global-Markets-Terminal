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
import { resolveLiveSymbols } from '../lib/symbolResolver.js';

// ─── Cache state ─────────────────────────────────────────────────────────────

let yahooCache  = { data: null, ts: 0, error: null };
let cryptoCache = { data: null, ts: 0, error: null };

// ─── Intervals & backoff ─────────────────────────────────────────────────────

const YAHOO_BASE_INTERVAL  = 60_000;   // 60s
const CRYPTO_BASE_INTERVAL = 120_000;  // 120s
const MAX_BACKOFF          = 600_000;  // 10 min cap

// Yahoo v7 tolerates ~50 symbols per request comfortably; the full taxonomy is
// ~185 symbols, so we chunk and merge, with a small gap between batches.
const YAHOO_CHUNK      = 50;
const YAHOO_CHUNK_GAP  = 300;  // ms between batches

let yahooFailures  = 0;
let cryptoFailures = 0;
let yahooTimer     = null;
let cryptoTimer    = null;

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
  try {
    await ensureSession();
    const { yahoo } = await resolveLiveSymbols();
    const batches = chunk(yahoo, YAHOO_CHUNK);

    const merged = [];
    let okBatches = 0;
    for (const batch of batches) {
      try {
        const results = await fetchYahooBatch(batch);
        if (results.length) { merged.push(...results); okBatches++; }
      } catch (err) {
        // One bad batch (rate limit, oversized, poisoned symbol) must not sink the rest.
        console.error(`${tag} batch of ${batch.length} failed: ${err.message}`);
      }
      if (batches.length > 1) await new Promise((r) => setTimeout(r, YAHOO_CHUNK_GAP));
    }

    if (okBatches === 0) throw new Error('all Yahoo batches failed');

    yahooCache = { data: merged, ts: Date.now(), error: null };
    yahooFailures = 0;
    console.log(`${tag} OK — ${merged.length} symbols cached (${okBatches}/${batches.length} batches)`);
  } catch (err) {
    yahooFailures++;
    yahooCache.error = err.message;
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
  try {
    const { crypto } = await resolveLiveSymbols();
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
    console.log(`${tag} OK — ${Object.keys(json).length} coins cached`);
  } catch (err) {
    cryptoFailures++;
    cryptoCache.error = err.message;
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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the current cache state for both Yahoo and CoinGecko.
 * Data may be stale (check .ts) but is the last-known-good value.
 */
export function getCache() {
  return {
    yahoo: { ...yahooCache },
    crypto: { ...cryptoCache },
  };
}

/**
 * Start periodic fetching. Call once at server boot.
 */
export function start() {
  console.log('[quoteFetchManager] Starting periodic fetchers');
  // Fire both immediately, then they self-schedule
  fetchYahoo();
  fetchCoinGecko();
}

/**
 * Stop periodic fetching. Call on SIGTERM.
 */
export function stop() {
  console.log('[quoteFetchManager] Stopping periodic fetchers');
  if (yahooTimer) { clearTimeout(yahooTimer); yahooTimer = null; }
  if (cryptoTimer) { clearTimeout(cryptoTimer); cryptoTimer = null; }
}
