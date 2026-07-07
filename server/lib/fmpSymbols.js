/**
 * server/lib/fmpSymbols.js
 *
 * Pure Yahoo-Finance-symbol → FMP-symbol mapper for the Data Source Engine.
 * No network, fully unit-testable (see __tests__/fmpSymbols.test.js).
 *
 * STAGE 1 scope: FMP fills only the gaps EODHD/Yahoo leave — gold + silver front-month
 * futures, and the FTSE 100 index (EODHD returns "NA" for it). Everything else returns
 * null so FMP does not fetch it. Stage 2 (flip equities/FX to FMP-primary) broadens this.
 *
 * Verified LIVE against the paid FMP "Premium" key (2026-07-07, /stable API):
 *   commodity `GC=F` → `GCUSD` ✅ (Gold Futures)   `SI=F` → `SIUSD` ✅ (Silver Futures)
 *             `CL=F`/`NG=F`    ❌ 402 "not available under your subscription" (gated above
 *                                 Premium) → return null; represented by USO/UNG ETF proxies.
 *   index     `^FTSE` → `^FTSE` ✅ (single /stable/quote; batch-quote 402s indices)
 *   NOTE: FMP's legacy /api/v3 API is dead (403 for subs after 2025-08-31) — callers must
 *         use the /stable API. batch-quote handles commodities; indices need single /quote.
 */

// FMP Premium commodity futures we serve (front-month, XXUSD convention). Metals only —
// WTI (CL=F) and natural gas (NG=F) are gated above Premium.
const FMP_COMMODITY = {
  'GC=F': 'GCUSD',
  'SI=F': 'SIUSD',
};

// Indices routed to FMP. Only ^FTSE: EODHD returns "NA" for it and FMP quotes it as ^FTSE.
// All other indices are served by EODHD (primary), so FMP must NOT fetch them.
const FMP_INDEX = {
  '^FTSE': '^FTSE',
};

/**
 * Map a Yahoo-formatted symbol to its FMP /stable quote symbol.
 * Pure; no network. Returns null when FMP (Premium) has no symbol we route to it.
 *
 * @param {string} symbol  Yahoo form: 'GC=F' | 'SI=F' | '^FTSE' | ...
 * @param {object} [meta]  parsed asset.meta (may carry meta.fmpSymbol as a hard override)
 * @returns {string|null}
 */
export function yahooToFmp(symbol, meta = {}) {
  if (!symbol || typeof symbol !== 'string') return null;
  if (meta && meta.fmpSymbol) return meta.fmpSymbol; // explicit per-asset override wins

  if (symbol in FMP_COMMODITY) return FMP_COMMODITY[symbol];
  if (symbol in FMP_INDEX) return FMP_INDEX[symbol];

  return null; // Stage 1: FMP serves only gold/silver + ^FTSE. Stage 2 broadens this.
}

/** True when the FMP code must be fetched via the single /stable/quote endpoint
 *  (indices) rather than /stable/batch-quote (which 402s index symbols). */
export function isFmpSingleQuote(fmpCode) {
  return typeof fmpCode === 'string' && fmpCode.startsWith('^');
}
