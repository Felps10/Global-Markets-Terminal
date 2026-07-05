/**
 * server/lib/eodhdSymbols.js
 *
 * Pure Yahoo-Finance-symbol → EODHD-symbol mapper for the Data Source Engine.
 * No network, fully unit-testable (see __tests__/eodhdSymbols.test.js).
 *
 * The engine carries Yahoo-formatted symbols everywhere (that is what symbolResolver
 * emits): plain ticker `AAPL`, index `^GSPC`, FX pair `EURUSD=X`, future `CL=F`, or
 * B3 `.SA`. This maps each to its EODHD live-quote code, or returns `null` when EODHD
 * has no live symbol for it (the caller must then NOT route it to EODHD).
 *
 * Verified LIVE against the paid "All-World" key (2026-07-04):
 *   equity  `AAPL`     → `AAPL.US`      ✅ (incl. ADRs TSM/ASML/ARM/LVMUY.US)
 *   index   `^GSPC`    → `GSPC.INDX`    ✅ 10/11 returned real prices
 *                                          (^FTSE returns "NA" → row dropped → Yahoo fills)
 *   fx      `EURUSD=X` → `EURUSD.FOREX` ✅
 *   b3      `PETR4.SA` → `PETR4.SA`     ✅ (identity — EODHD exchange code is SA/BVMF)
 *   commodity `CL=F` etc.              ❌ EODHD has NO commodities/futures exchange
 *                                          (`.COMM` 404s; no continuous-contract codes).
 *                                          → returns null; commodity stays Yahoo-primary.
 */

/**
 * Map a Yahoo-formatted symbol to its EODHD live-quote code.
 * Pure; no network. Returns null when EODHD has no live symbol for it.
 *
 * @param {string} symbol  Yahoo form: 'AAPL' | 'BRK-B' | '^GSPC' | 'EURUSD=X' | 'CL=F' | 'PETR4.SA'
 * @param {object} [meta]  parsed asset.meta (may carry meta.eodhdSymbol as a hard override)
 * @returns {string|null}
 */
export function yahooToEodhd(symbol, meta = {}) {
  if (!symbol || typeof symbol !== 'string') return null;
  if (meta && meta.eodhdSymbol) return meta.eodhdSymbol; // explicit per-asset override wins

  if (symbol.endsWith('.SA')) return symbol;                 // B3 — identity (.SA == SA/BVMF)
  if (symbol.startsWith('^')) return `${symbol.slice(1)}.INDX`;   // index — drop caret, add .INDX
  if (symbol.endsWith('=X')) return `${symbol.slice(0, -2)}.FOREX`; // FX — strip =X, add .FOREX
  if (symbol.endsWith('=F')) return null;                    // commodity — no EODHD live symbol exists

  return `${symbol}.US`; // US equity / ETF / ADR (dashes & dots preserved, e.g. BRK-B → BRK-B.US)
}
