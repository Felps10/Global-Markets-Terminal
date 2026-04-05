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
import { YAHOO_SYMBOLS, CRYPTO_IDS } from '../lib/terminalSymbols.js';

// ─── Cache state ─────────────────────────────────────────────────────────────

let yahooCache  = { data: null, ts: 0, error: null };
let cryptoCache = { data: null, ts: 0, error: null };

// ─── Intervals & backoff ─────────────────────────────────────────────────────

const YAHOO_BASE_INTERVAL  = 60_000;   // 60s
const CRYPTO_BASE_INTERVAL = 120_000;  // 120s
const MAX_BACKOFF          = 600_000;  // 10 min cap

let yahooFailures  = 0;
let cryptoFailures = 0;
let yahooTimer     = null;
let cryptoTimer    = null;

function getInterval(base, failures) {
  if (failures === 0) return base;
  return Math.min(base * Math.pow(2, failures), MAX_BACKOFF);
}

// ─── Yahoo fetch ─────────────────────────────────────────────────────────────

async function fetchYahoo() {
  const tag = '[quoteFetchManager:yahoo]';
  try {
    await ensureSession();
    const s = getSession();
    const symbols = YAHOO_SYMBOLS.join(',');
    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols)}` +
      `&crumb=${encodeURIComponent(s.crumb)}`;

    let res = await httpsGet(url, {
      Cookie: s.cookie,
      Accept: 'application/json',
    });

    // Crumb expired — refresh once and retry
    if (res.status === 401 || res.status === 403) {
      console.warn(`${tag} Crumb rejected (${res.status}) — refreshing session…`);
      await refreshSession();
      const s2 = getSession();
      const url2 =
        `https://query1.finance.yahoo.com/v7/finance/quote` +
        `?symbols=${encodeURIComponent(symbols)}` +
        `&crumb=${encodeURIComponent(s2.crumb)}`;
      res = await httpsGet(url2, {
        Cookie: s2.cookie,
        Accept: 'application/json',
      });
    }

    if (res.status !== 200) {
      throw new Error(`Yahoo returned HTTP ${res.status}`);
    }

    const json = JSON.parse(res.body);
    const results = json?.quoteResponse?.result;
    if (!results?.length) {
      throw new Error('Empty quoteResponse from Yahoo');
    }

    yahooCache = { data: results, ts: Date.now(), error: null };
    yahooFailures = 0;
    console.log(`${tag} OK — ${results.length} symbols cached`);
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
    const ids = Object.values(CRYPTO_IDS).join(',');
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
