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
import { classify, parseMeta, resolvePrecedence } from './providerRouting.js';
import { yahooToEodhd } from './eodhdSymbols.js';
import { yahooToFmp } from './fmpSymbols.js';
import { loadConfig } from './dataSourceConfig.js';

// Taxonomy changes rarely; re-resolve at most every 5 minutes.
const TTL = 5 * 60_000;

let _cache = { ts: 0, yahoo: null, crypto: null };
let _brazilCache = { ts: 0, brazilB3: null };

/** Force the next resolveLiveSymbols() to re-resolve (e.g. after a config change). */
export function invalidate() {
  _cache = { ts: 0, yahoo: null, crypto: null };
}

/**
 * The last-resolved routing plan (sync; no re-resolve). Used by buildQuotesMap to build
 * the normalized quotes[symbol] map inside the synchronous getCache(). Empty until the
 * first resolveLiveSymbols() completes (the fetchers call it within seconds of boot).
 */
export function getCachedPlan() {
  return _cache.plan || [];
}

/**
 * @returns {Promise<{ yahoo: string[], crypto: Record<string,string> }>}
 */
export async function resolveLiveSymbols() {
  if (_cache.ts && Date.now() - _cache.ts < TTL && _cache.yahoo) return _cache;

  try {
    // Admin overrides (Phase B) layered onto the recommended defaults per asset.
    // Empty/missing config → recommended defaults (loadConfig is safe-by-default).
    const overrides = await loadConfig();

    const { data, error } = await supabase
      .from('assets')
      .select('symbol, meta, exchange, subgroup_id, group_id')
      .eq('active', true)
      .eq('terminal_view', 'global');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('no active global assets returned');

    const yahoo = new Set();
    const crypto = {};
    const b3 = [];    // B3 assets: {display, yahoo, brapi} — enables the BRAPI fallback
    const eodhd = []; // EODHD-primary assets: {display, eodhd} — the paid global feed
    const fmp = [];   // FMP assets: {display, fmp} — gap-filler (gold/silver + ^FTSE) in Stage 1
    const plan = [];  // per-display-symbol routing for the normalized quotes map (Phase C):
                      // { display, precedence, yahooKey?, cgId? } — buildQuotesMap walks it.

    for (const a of data) {
      const meta = parseMeta(a.meta);
      const cls = classify(a); // routing authority (server/lib/providerRouting.js)
      // Config-honored, capability-filtered order (subgroup → group → global → recommended).
      const precedence = resolvePrecedence(a, overrides);

      if (cls === 'crypto') {
        if (meta.cgId) {
          crypto[a.symbol] = meta.cgId;
          plan.push({ display: a.symbol, precedence, cgId: meta.cgId });
        }
        continue;
      }

      // Yahoo-formatted symbol — the display/fallback key the frontend matches on.
      let yform;
      if (cls === 'b3') {
        yform = meta.yahooSymbol || `${a.symbol}.SA`;
        b3.push({ display: a.symbol, yahoo: yform, brapi: yform.replace(/\.SA$/, '') });
      } else {
        yform = a.symbol;
      }
      if (yform) yahoo.add(yform); // Yahoo stays the universal fallback fetch set

      // EODHD fetch set: any asset whose precedence INCLUDES eodhd (primary OR fallback).
      // Since Stage 2, equities/FX have FMP first and EODHD second — keeping them in this set
      // (via includes, not [0]) gives a WARM fallback cache so FMP is never a hard dependency.
      // EODHD stays primary for indices. (It runs at a slower cadence now — see EODHD_BASE_INTERVAL.)
      if (precedence.includes('eodhd')) {
        const ecode = yahooToEodhd(yform, meta);
        if (ecode) eodhd.push({ display: a.symbol, eodhd: ecode });
      }

      // FMP set: any asset whose precedence INCLUDES fmp (primary OR fallback) — so a
      // fallback like ^FTSE (index eodhd→fmp→yahoo) is still fetched. Mapper-gated: only
      // symbols FMP actually serves on Premium (gold/silver, ^FTSE) return a code.
      if (precedence.includes('fmp')) {
        const fcode = yahooToFmp(yform, meta);
        if (fcode) fmp.push({ display: a.symbol, fmp: fcode });
      }

      plan.push({ display: a.symbol, precedence, yahooKey: yform });
    }

    // Floor: the known-good static set is always covered.
    for (const s of YAHOO_SYMBOLS) yahoo.add(s);
    for (const [sym, id] of Object.entries(CRYPTO_IDS)) if (!crypto[sym]) crypto[sym] = id;

    _cache = { ts: Date.now(), yahoo: [...yahoo], crypto, b3, eodhd, fmp, plan };
    return _cache;
  } catch (err) {
    console.error('[symbolResolver] DB resolve failed — using static fallback:', err.message);
    // Cache the fallback briefly so a persistent DB outage doesn't hammer Supabase.
    _cache = { ts: Date.now(), yahoo: [...YAHOO_SYMBOLS], crypto: { ...CRYPTO_IDS }, b3: [], eodhd: [], fmp: [], plan: [] };
    return _cache;
  }
}

/**
 * Resolve the Brazil-terminal B3 universe (terminal_view='brazil') from the taxonomy.
 * Powers the server-side Brazil B3 feed (BRAPI Pro primary + Yahoo `.SA` fallback) that
 * replaces the old per-browser, per-ticker client-side BRAPI path.
 *
 * @returns {Promise<{ ts: number, brazilB3: Array<{display,yahoo,brapi}> }>}
 *   display = bare ticker the frontend keys on (e.g. 'PETR4');
 *   yahoo   = `.SA` form for the Yahoo fallback; brapi = bare form for BRAPI.
 */
export async function resolveBrazilB3() {
  if (_brazilCache.ts && Date.now() - _brazilCache.ts < TTL && _brazilCache.brazilB3) return _brazilCache;

  try {
    const { data, error } = await supabase
      .from('assets')
      .select('symbol, meta, exchange, terminal_view')
      .eq('active', true)
      .eq('terminal_view', 'brazil');

    if (error) throw new Error(error.message);

    const brazilB3 = [];
    for (const a of data || []) {
      if (classify(a) !== 'b3') continue; // brazil view also holds macro/fx — B3 only here
      const meta = parseMeta(a.meta);
      const ySym = meta.yahooSymbol || `${a.symbol}.SA`;
      brazilB3.push({ display: a.symbol, yahoo: ySym, brapi: ySym.replace(/\.SA$/, '') });
    }

    _brazilCache = { ts: Date.now(), brazilB3 };
    return _brazilCache;
  } catch (err) {
    console.error('[symbolResolver] brazil B3 resolve failed:', err.message);
    // Keep the last-known-good set (or empty) and don't hammer Supabase on a persistent outage.
    _brazilCache = { ts: Date.now(), brazilB3: _brazilCache.brazilB3 || [] };
    return _brazilCache;
  }
}
