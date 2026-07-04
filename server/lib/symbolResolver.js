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
import { classify, parseMeta } from './providerRouting.js';

// Taxonomy changes rarely; re-resolve at most every 5 minutes.
const TTL = 5 * 60_000;

let _cache = { ts: 0, yahoo: null, crypto: null };

/**
 * @returns {Promise<{ yahoo: string[], crypto: Record<string,string> }>}
 */
export async function resolveLiveSymbols() {
  if (_cache.ts && Date.now() - _cache.ts < TTL && _cache.yahoo) return _cache;

  try {
    const { data, error } = await supabase
      .from('assets')
      .select('symbol, meta, exchange')
      .eq('active', true)
      .eq('terminal_view', 'global');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('no active global assets returned');

    const yahoo = new Set();
    const crypto = {};
    const b3 = []; // B3 assets: {display, yahoo, brapi} — enables the BRAPI fallback

    for (const a of data) {
      const meta = parseMeta(a.meta);
      const cls = classify(a); // routing authority (server/lib/providerRouting.js)
      if (cls === 'crypto') {
        if (meta.cgId) crypto[a.symbol] = meta.cgId;
      } else if (cls === 'b3') {
        const ySym = meta.yahooSymbol || `${a.symbol}.SA`;
        yahoo.add(ySym); // Yahoo is primary in the effective/free precedence
        b3.push({ display: a.symbol, yahoo: ySym, brapi: ySym.replace(/\.SA$/, '') });
      } else if (a.symbol) {
        yahoo.add(a.symbol);
      }
    }

    // Floor: the known-good static set is always covered.
    for (const s of YAHOO_SYMBOLS) yahoo.add(s);
    for (const [sym, id] of Object.entries(CRYPTO_IDS)) if (!crypto[sym]) crypto[sym] = id;

    _cache = { ts: Date.now(), yahoo: [...yahoo], crypto, b3 };
    return _cache;
  } catch (err) {
    console.error('[symbolResolver] DB resolve failed — using static fallback:', err.message);
    // Cache the fallback briefly so a persistent DB outage doesn't hammer Supabase.
    _cache = { ts: Date.now(), yahoo: [...YAHOO_SYMBOLS], crypto: { ...CRYPTO_IDS }, b3: [] };
    return _cache;
  }
}
