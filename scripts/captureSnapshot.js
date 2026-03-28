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

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, '../src/data/marketSnapshot.json');

// ── Symbol lists — must match LandingPage.jsx exactly ───────────────────────
const YAHOO_SYMBOLS = [
  '^GSPC', '^DJI', '^IXIC',
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X',
  'JPM', 'GS', 'XOM', 'CVX', 'LLY', 'UNH', 'TSM', 'AVGO',
  '^FTSE', '^N225',
  'USDCAD=X', 'AUDUSD=X',
];

const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

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

  // Try local Express server first (has crumb/cookie session)
  // Falls back silently if server is not running
  const LOCAL_YAHOO = 'http://localhost:4000/api/yahoo/v7/finance/quote';
  const qs = symbols.map(encodeURIComponent).join('%2C');

  try {
    const res = await fetch(
      `${LOCAL_YAHOO}?symbols=${qs}&fields=regularMarketPrice,regularMarketChangePercent`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      console.error(`[Yahoo] Local proxy returned HTTP ${res.status}`);
      console.error('[Yahoo] Is the Express server running? (npm run start:server)');
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
      console.error('[Yahoo] Could not reach local server — is it running?');
      console.error('[Yahoo] Run: npm run start:server, then retry npm run snapshot');
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date();
  console.log(`\n[captureSnapshot] Starting — ${now.toISOString()}`);
  console.log('[captureSnapshot] Note: Express server must be running for Yahoo data.');
  console.log('[captureSnapshot]       Start it with: npm run start:server\n');

  // Load existing snapshot to use as fallback for failed symbols
  const existing = loadExisting();
  const previous = existing.assets || {};

  console.log('[1/2] Fetching Yahoo Finance...');
  const yahooResults = await fetchYahoo(YAHOO_SYMBOLS);

  console.log('\n[2/2] Fetching CoinGecko...');
  const cryptoResults = await fetchCrypto(CRYPTO_IDS);

  // Merge: new results override previous; failed symbols keep previous value
  const assets = { ...previous, ...yahooResults, ...cryptoResults };

  // Count successes and failures
  const allSymbols = [...YAHOO_SYMBOLS, ...Object.keys(CRYPTO_IDS)];
  const succeeded = allSymbols.filter(s => yahooResults[s] || cryptoResults[s]);
  const failed = allSymbols.filter(s => !yahooResults[s] && !cryptoResults[s]);

  if (failed.length > 0) {
    console.log(`\n[captureSnapshot] ⚠ Failed symbols (keeping previous values): ${failed.join(', ')}`);
  }

  const snapshot = {
    snapshot_date:  formatDate(now),
    snapshot_time:  now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }),
    snapshot_label: formatLabel(now),
    assets,
  };

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  console.log(`\n[captureSnapshot] ✓ Done — ${succeeded.length}/${allSymbols.length} symbols updated`);
  console.log(`[captureSnapshot] Written to ${SNAPSHOT_PATH}\n`);
}

main().catch(err => {
  console.error('[captureSnapshot] Fatal error:', err);
  process.exit(1);
});
