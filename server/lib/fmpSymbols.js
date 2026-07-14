/**
 * server/lib/fmpSymbols.js
 *
 * Pure Yahoo-Finance-symbol → FMP-symbol mapper for the Data Source Engine.
 * No network, fully unit-testable (see __tests__/fmpSymbols.test.js).
 *
 * STAGE 2: FMP "Premium" is now the PRIMARY source for equities/ETFs + FX (real-time, with
 * marketCap + 52-wk in the same batch call) and still fills the gaps EODHD can't — gold +
 * silver front-month futures and the FTSE 100 index. EODHD stays the fallback for equities/FX
 * and the primary for the other indices. This maps each Yahoo-form symbol to its FMP /stable
 * quote symbol, or null when FMP shouldn't serve it.
 *
 * Verified LIVE against the paid FMP "Premium" key (2026-07-07, /stable API):
 *   equity  `AAPL` → `AAPL`  ✅ (137/137 of the live book incl. ADRs TSM/ASML + ETFs EWZ/EWY)
 *   fx      `EURUSD=X` → `EURUSD` ✅ (13/13, real-time)
 *   commodity `GC=F` → `GCUSD` ✅  `SI=F` → `SIUSD` ✅ ; `CL=F`/`NG=F` ❌ 402 (gated above
 *             Premium → USO/UNG ETF proxies)
 *   index   `^GSPC/^DJI/^IXIC/^VIX/^FTSE/^N225/^HSI/^STOXX50E` → identity ✅ (single /stable/quote;
 *             batch-quote 402s indices). Other indices → null (EODHD primary; FMP returns empty
 *             for ^GDAXI/^FCHI/^BVSP/^AXJO/^KS11/^GSPTSE/^BSESN — re-verified live 2026-07-13).
 *   b3      `PETR4.SA` → null (BRAPI Pro stays primary; FMP is weak on B3).
 *   NOTE: FMP's legacy /api/v3 API is dead (403 for subs after 2025-08-31) — use /stable.
 *         batch-quote handles equities/FX/commodities; indices need single /quote.
 */

// FMP Premium commodity futures we serve (front-month, XXUSD). Metals only — WTI (CL=F) and
// natural gas (NG=F) are gated above Premium.
const FMP_COMMODITY = {
  'GC=F': 'GCUSD',
  'SI=F': 'SIUSD',
};

// Indices routed to FMP. Re-verified LIVE via the /stable/quote SINGLE endpoint (2026-07-13,
// Premium key): FMP quotes these 8 indices (US majors + FTSE/Nikkei/Hang Seng/Euro STOXX 50)
// by their caret symbol. The earlier "only ^FTSE" restriction came from testing /batch-quote,
// which 402s on every index — the single endpoint (isFmpSingleQuote → /quote) does not.
// The remaining indices (^GDAXI ^FCHI ^BVSP ^AXJO ^KS11 ^GSPTSE ^BSESN) return EMPTY from FMP
// on this plan → still null here → EODHD stays their primary.
const FMP_INDEX = {
  '^GSPC': '^GSPC',   // S&P 500
  '^DJI': '^DJI',     // Dow Jones
  '^IXIC': '^IXIC',   // Nasdaq Composite
  '^VIX': '^VIX',     // CBOE Volatility
  '^FTSE': '^FTSE',   // FTSE 100 (also the EODHD "NA" hole)
  '^N225': '^N225',   // Nikkei 225
  '^HSI': '^HSI',     // Hang Seng
  '^STOXX50E': '^STOXX50E', // Euro STOXX 50
};

/**
 * Map a Yahoo-formatted symbol to its FMP /stable quote symbol.
 * Pure; no network. Returns null when FMP should not serve it.
 *
 * @param {string} symbol  Yahoo form: 'AAPL' | 'EURUSD=X' | 'GC=F' | '^FTSE' | 'PETR4.SA'
 * @param {object} [meta]  parsed asset.meta (may carry meta.fmpSymbol as a hard override)
 * @returns {string|null}
 */
export function yahooToFmp(symbol, meta = {}) {
  if (!symbol || typeof symbol !== 'string') return null;
  if (meta && meta.fmpSymbol) return meta.fmpSymbol; // explicit per-asset override wins

  if (symbol in FMP_COMMODITY) return FMP_COMMODITY[symbol]; // GC=F/SI=F
  if (symbol in FMP_INDEX) return FMP_INDEX[symbol];         // ^FTSE

  if (symbol.endsWith('=F')) return null;                    // other commodity futures — gated
  if (symbol.startsWith('^')) return null;                   // other indices — EODHD primary
  if (symbol.endsWith('.SA')) return null;                   // B3 — BRAPI Pro primary
  if (symbol.endsWith('=X')) return symbol.slice(0, -2);     // FX PAIR=X → PAIR (real-time)

  return symbol; // US equity / ETF / ADR — bare ticker (covers the whole book)
}

/** True when the FMP code must be fetched via the single /stable/quote endpoint
 *  (indices) rather than /stable/batch-quote (which 402s index symbols). */
export function isFmpSingleQuote(fmpCode) {
  return typeof fmpCode === 'string' && fmpCode.startsWith('^');
}
