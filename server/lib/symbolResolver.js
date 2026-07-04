/**
 * server/lib/symbolResolver.js
 *
 * Resolves the live-quote symbol set from the taxonomy (Supabase `assets`)
 * instead of a hardcoded list, so every active Global asset gets a quote.
 * Mirrors the DB-driven pattern already used by bcbService.
 *
 * Routing (by asset.meta):
 *   - meta.isCrypto / meta.cgId  → CoinGecko  (keyed by display symbol → cgId)
 *   - meta.yahooSymbol           → Yahoo      (B3 `.SA` override, e.g. brazil-highlights)
 *   - otherwise asset.symbol     → Yahoo      (already provider-formatted: ^, =X, =F, plain)
 *
 * The static terminalSymbols list is kept as a FLOOR + FALLBACK: the known-good
 * ~43 Yahoo / 3 crypto symbols are always included, and if the DB is unreachable
 * we return the static set so the live feed never regresses below today's coverage.
 */

import { supabase } from '../db.js';
import { YAHOO_SYMBOLS, CRYPTO_IDS } from './terminalSymbols.js';

// Taxonomy changes rarely; re-resolve at most every 5 minutes.
const TTL = 5 * 60_000;

let _cache = { ts: 0, yahoo: null, crypto: null };

function parseMeta(m) {
  if (!m) return {};
  if (typeof m === 'string') {
    try { return JSON.parse(m); } catch { return {}; }
  }
  return m;
}

/**
 * @returns {Promise<{ yahoo: string[], crypto: Record<string,string> }>}
 */
export async function resolveLiveSymbols() {
  if (_cache.ts && Date.now() - _cache.ts < TTL && _cache.yahoo) return _cache;

  try {
    const { data, error } = await supabase
      .from('assets')
      .select('symbol, meta')
      .eq('active', true)
      .eq('terminal_view', 'global');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('no active global assets returned');

    const yahoo = new Set();
    const crypto = {};

    for (const a of data) {
      const meta = parseMeta(a.meta);
      if (meta.isCrypto || meta.cgId) {
        if (meta.cgId) crypto[a.symbol] = meta.cgId;
      } else if (meta.yahooSymbol) {
        yahoo.add(meta.yahooSymbol);
      } else if (a.symbol) {
        yahoo.add(a.symbol);
      }
    }

    // Floor: the known-good static set is always covered.
    for (const s of YAHOO_SYMBOLS) yahoo.add(s);
    for (const [sym, id] of Object.entries(CRYPTO_IDS)) if (!crypto[sym]) crypto[sym] = id;

    _cache = { ts: Date.now(), yahoo: [...yahoo], crypto };
    return _cache;
  } catch (err) {
    console.error('[symbolResolver] DB resolve failed — using static fallback:', err.message);
    // Cache the fallback briefly so a persistent DB outage doesn't hammer Supabase.
    _cache = { ts: Date.now(), yahoo: [...YAHOO_SYMBOLS], crypto: { ...CRYPTO_IDS } };
    return _cache;
  }
}
