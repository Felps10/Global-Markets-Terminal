/**
 * server/routes/quotes.js
 *
 * GET /api/v1/quotes/live — public, no auth required.
 *
 * Returns the server-side cached Yahoo + CoinGecko data.
 * All clients read from this single cache instead of each hitting
 * Yahoo/CoinGecko independently through the proxy.
 *
 * Fallback chain:
 *   1. Live in-memory cache (age < 300s)
 *   2. Stale in-memory cache (age >= 300s, still has data)
 *   3. Latest market_snapshot from Supabase (last resort)
 */

import { Router } from 'express';
import { getCache, getBrazilB3Cache, getFetchStats } from '../services/quoteFetchManager.js';
import { supabase } from '../db.js';

const router = Router();

// Maximum age (ms) before data is considered "stale" in the response meta
const STALE_THRESHOLD = 120_000; // 2 min

router.get('/live', async (req, res) => {
  const cache = getCache();
  const now = Date.now();

  const yahooAge  = cache.yahoo.ts  ? now - cache.yahoo.ts  : null;
  const cryptoAge = cache.crypto.ts ? now - cache.crypto.ts : null;

  // Determine data source label
  let source = 'live';
  let yahoo  = cache.yahoo.data;
  let crypto = cache.crypto.data;

  if (yahoo && yahooAge > STALE_THRESHOLD) {
    source = 'stale';
  }

  // If no Yahoo cache at all, fall back to snapshot
  if (!yahoo) {
    try {
      const { data: snap, error } = await supabase
        .from('market_snapshot')
        .select('snapshot_date, snapshot_label, captured_at, assets')
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && snap?.assets) {
        // Transform flat snapshot { symbol: { price, changePct } }
        // into Yahoo-like array for client compatibility
        yahoo = Object.entries(snap.assets).map(([symbol, d]) => ({
          symbol,
          regularMarketPrice: d.price,
          regularMarketChangePercent: d.changePct,
          _fromSnapshot: true,
        }));

        // Also pull crypto from snapshot if CoinGecko cache is empty
        if (!crypto) {
          const cryptoSymbols = ['BTC', 'ETH', 'SOL'];
          const cryptoFromSnap = {};
          for (const sym of cryptoSymbols) {
            if (snap.assets[sym]) {
              // Map to CoinGecko response shape
              const cgId = sym === 'BTC' ? 'bitcoin' : sym === 'ETH' ? 'ethereum' : 'solana';
              cryptoFromSnap[cgId] = {
                usd: snap.assets[sym].price,
                usd_24h_change: snap.assets[sym].changePct,
              };
            }
          }
          if (Object.keys(cryptoFromSnap).length > 0) {
            crypto = cryptoFromSnap;
          }
        }

        source = 'snapshot';
        console.log(`[quotes/live] Serving snapshot fallback (${snap.snapshot_label})`);
      }
    } catch (err) {
      console.error('[quotes/live] Snapshot fallback failed:', err.message);
    }
  }

  return res.json({
    // Normalized per-symbol map (Phase C): { [display]: {price, changePct, source, ...} }.
    // Source of truth going forward; the yahoo/crypto arrays below stay for backward compat.
    // Empty on the snapshot fallback path (built from the live caches) — clients then read
    // the yahoo array as before.
    quotes: cache.quotes || {},
    yahoo:  yahoo  || [],
    crypto: crypto || {},
    meta: {
      source,
      yahooAge:  yahooAge  !== null ? Math.round(yahooAge)  : null,
      cryptoAge: cryptoAge !== null ? Math.round(cryptoAge) : null,
      yahooError:  cache.yahoo.error  || null,
      cryptoError: cache.crypto.error || null,
      ts: now,
    },
  });
});

// GET /api/v1/quotes/brazil — public, no auth.
// Server-side Brazil-terminal B3 feed (BRAPI Pro primary + Yahoo `.SA` fallback), fetched
// once per cycle instead of per-browser per-ticker. Returns a keyed map { [sym]: {...} }.
router.get('/brazil', (_req, res) => {
  const cache = getBrazilB3Cache();
  const now = Date.now();
  const b3 = cache.data || {};
  const count = Object.keys(b3).length;
  const age = cache.ts ? now - cache.ts : null;

  let source = 'live';
  if (count === 0) source = 'empty';            // nothing cached yet → client falls back
  else if (age !== null && age > STALE_THRESHOLD) source = 'stale';

  return res.json({
    b3,
    meta: {
      source,
      count,
      age: age !== null ? Math.round(age) : null,
      error: cache.error || null,
      ts: now,
    },
  });
});

// GET /api/v1/quotes/status — public, no auth.
// Per-provider health of the server-side quote engine (EODHD, Yahoo, BRAPI Pro, CoinGecko):
// last-fetch latency, ok/fail, symbol count, timestamp and a rolling success history. Powers
// the Data Catalog's server-side source cards (which the browser cannot probe directly).
router.get('/status', (_req, res) => {
  return res.json({ providers: getFetchStats(), ts: Date.now() });
});

export default router;
