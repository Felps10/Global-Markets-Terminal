/**
 * captureSnapshot.js
 *
 * Fetches current market prices for the GMT landing page ticker
 * and writes them to src/data/marketSnapshot.json.
 *
 * Run manually:   node scripts/captureSnapshot.js
 * Run via npm:    npm run snapshot
 *
 * Designed to run after US market close (~18:30 ET / 23:30 UTC).
 * Does not require any environment variables.
 * Failed symbols preserve their previous value from the existing file.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if it exists (local dev only)
// In Railway cron, env vars are injected automatically
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
  console.log('[captureSnapshot] Loaded .env file');
}

const SNAPSHOT_PATH = join(__dirname, '../src/data/marketSnapshot.json');

// Production Railway backend URL
// Locally: uses VITE_API_URL from .env
// In Railway cron: uses RAILWAY_BACKEND_URL env var
const API_BASE = process.env.RAILWAY_BACKEND_URL
  || process.env.VITE_API_URL
  || 'http://localhost:4000';

console.log(`[captureSnapshot] API_BASE: ${API_BASE}`);

// Supabase client for writing snapshot to DB
const supabaseUrl = process.env.SUPABASE_URL
  || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
  console.log('[captureSnapshot] Supabase client initialized');
} else {
  console.warn(
    '[captureSnapshot] ⚠ Supabase credentials missing — ' +
    'will write to file only'
  );
}

// ── Symbol lists — LandingPage + Terminal Mini ──────────────────────────────
const YAHOO_SYMBOLS = [
  // LandingPage ticker
  '^GSPC', '^DJI', '^IXIC',
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X',
  'JPM', 'GS', 'XOM', 'CVX', 'LLY', 'UNH', 'TSM', 'AVGO',
  '^FTSE', '^N225',
  'USDCAD=X', 'AUDUSD=X',
  // Terminal Mini additions
  'AMD', 'AXP', 'ABBV', 'COST', 'AMT', 'BA', 'BE', 'BP',
  'BYDDY', 'BIIB', 'CAT', 'EWY',
  'GC=F', 'BNO', 'CANE',
  'DVY', 'HYG', 'BIL', 'AGG',
];

const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

const BRAPI_SYMBOLS = ['PETR4', 'ACWI11', 'ALZR11'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadExisting() {
  try {
    const raw = readFileSync(SNAPSHOT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { assets: {} };
  }
}

function formatLabel(date) {
  return `as of ${date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'America/New_York'
  })} close`;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// ── Fetch Yahoo Finance via local Express proxy ───────────────────────────
async function fetchYahoo(symbols) {
  const results = {};

  const YAHOO_URL = `${API_BASE}/api/yahoo/v7/finance/quote`;
  const qs = symbols.map(encodeURIComponent).join('%2C');

  try {
    const res = await fetch(
      `${YAHOO_URL}?symbols=${qs}&fields=regularMarketPrice,regularMarketChangePercent`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      console.error(`[Yahoo] Backend returned HTTP ${res.status}`);
      console.error('[Yahoo] Check RAILWAY_BACKEND_URL or start local server');
      return results;
    }

    const json = await res.json();
    const quotes = json?.quoteResponse?.result || [];

    for (const q of quotes) {
      results[q.symbol] = {
        price:     Math.round(q.regularMarketPrice * 10000) / 10000,
        changePct: Math.round(q.regularMarketChangePercent * 100) / 100,
      };
      console.log(
        `  ✓ ${q.symbol.padEnd(12)} ` +
        `$${q.regularMarketPrice.toFixed(2).padStart(10)}  ` +
        `${q.regularMarketChangePercent >= 0 ? '+' : ''}${q.regularMarketChangePercent.toFixed(2)}%`
      );
    }

    if (quotes.length < symbols.length) {
      const returned = new Set(quotes.map(q => q.symbol));
      const missing = symbols.filter(s => !returned.has(s));
      if (missing.length > 0) {
        console.warn(`[Yahoo] Missing from response: ${missing.join(', ')}`);
      }
    }

  } catch (err) {
    if (err.name === 'TimeoutError' || err.cause?.code === 'ECONNREFUSED') {
      console.error('[Yahoo] Could not reach backend — check RAILWAY_BACKEND_URL or start local server');
    } else {
      console.error(`[Yahoo] Fetch error: ${err.message}`);
    }
  }

  return results;
}

// ── Fetch CoinGecko ───────────────────────────────────────────────────────────
async function fetchCrypto(cryptoIds) {
  const results = {};
  const ids = Object.values(cryptoIds).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[CoinGecko] HTTP ${res.status}`);
      return results;
    }

    const json = await res.json();

    for (const [sym, cgId] of Object.entries(cryptoIds)) {
      const d = json[cgId];
      if (d) {
        results[sym] = {
          price:     Math.round(d.usd * 100) / 100,
          changePct: Math.round(d.usd_24h_change * 100) / 100,
        };
        console.log(`  ✓ ${sym.padEnd(12)} $${d.usd.toFixed(2)}  ${d.usd_24h_change >= 0 ? '+' : ''}${d.usd_24h_change.toFixed(2)}%`);
      }
    }
  } catch (err) {
    console.error(`[CoinGecko] Fetch error: ${err.message}`);
  }

  return results;
}

// ── Fetch BRAPI (B3 equities) ─────────────────────────────────────────────────
async function fetchBrapi(symbols) {
  const results = {};
  const brapiToken = process.env.VITE_BRAPI_TOKEN || '';
  const url = `https://brapi.dev/api/quote/${symbols.join(',')}?token=${brapiToken}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[BRAPI] HTTP ${res.status}`);
      return results;
    }

    const json = await res.json();
    const quotes = json?.results || [];

    for (const q of quotes) {
      results[q.symbol] = {
        price:     Math.round((q.regularMarketPrice ?? 0) * 100) / 100,
        changePct: Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
      };
      console.log(
        `  ✓ ${q.symbol.padEnd(12)} ` +
        `R$${(q.regularMarketPrice ?? 0).toFixed(2).padStart(10)}  ` +
        `${(q.regularMarketChangePercent ?? 0) >= 0 ? '+' : ''}` +
        `${(q.regularMarketChangePercent ?? 0).toFixed(2)}%`
      );
    }
  } catch (err) {
    console.error(`[BRAPI] Fetch error: ${err.message}`);
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date();
  console.log(`\n[captureSnapshot] Starting — ${now.toISOString()}`);

  // Load existing snapshot to use as fallback for failed symbols
  const existing = loadExisting();
  const previous = existing.assets || {};

  console.log('[1/3] Fetching Yahoo Finance...');
  const yahooResults = await fetchYahoo(YAHOO_SYMBOLS);

  console.log('\n[2/3] Fetching CoinGecko...');
  const cryptoResults = await fetchCrypto(CRYPTO_IDS);

  console.log('\n[3/3] Fetching BRAPI (B3 equities)...');
  const brapiResults = await fetchBrapi(BRAPI_SYMBOLS);

  // Merge: new results override previous; failed symbols keep previous value
  const assets = { ...previous, ...yahooResults, ...cryptoResults, ...brapiResults };

  // Count successes and failures
  const allSymbols = [...YAHOO_SYMBOLS, ...Object.keys(CRYPTO_IDS), ...BRAPI_SYMBOLS];
  const succeeded = allSymbols.filter(s => yahooResults[s] || cryptoResults[s] || brapiResults[s]);
  const failed = allSymbols.filter(s => !yahooResults[s] && !cryptoResults[s] && !brapiResults[s]);

  if (failed.length > 0) {
    console.log(`\n[captureSnapshot] ⚠ Failed symbols (keeping previous values): ${failed.join(', ')}`);
  }

  const snapshot = {
    snapshot_date:  formatDate(now),
    snapshot_time:  now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }),
    snapshot_label: formatLabel(now),
    assets,
  };

  // Write to Supabase market_snapshot table
  if (supabase) {
    try {
      const { error: insertError } = await supabase
        .from('market_snapshot')
        .insert({
          snapshot_date:  snapshot.snapshot_date,
          snapshot_label: snapshot.snapshot_label,
          assets:         snapshot.assets,
        });

      if (insertError) {
        console.error(
          '[captureSnapshot] Supabase insert error:',
          insertError.message
        );
      } else {
        console.log(
          '[captureSnapshot] ✓ Written to Supabase market_snapshot table'
        );
      }
    } catch (err) {
      console.error(
        '[captureSnapshot] Supabase write failed:',
        err.message
      );
    }
  }

  // Always write static fallback file
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`[captureSnapshot] ✓ Written to static fallback file`);

  console.log(`\n[captureSnapshot] ✓ Done — ${succeeded.length}/${allSymbols.length} symbols updated`);
}

main().catch(err => {
  console.error('[captureSnapshot] Fatal error:', err);
  process.exit(1);
});
