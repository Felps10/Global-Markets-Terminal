/**
 * server/lib/providerRouting.js
 *
 * The routing core of the Data Source Engine (see docs/DATA_SOURCE_ENGINE.md).
 * Given an asset, decide which providers can serve it and in what order.
 *
 * Phase A: recommended (hybrid/free) defaults only — no admin config table yet.
 * Phases B/C layer DB overrides on top via the same resolvePrecedence() seam.
 */

// What each provider is CAPABLE of serving. The Settings UI (Phase C) uses this
// to avoid offering impossible choices; the resolver uses it to filter orders.
export const PROVIDER_CAPS = {
  // EODHD "All-World": global equities/ETFs/ADRs (.US), indices (.INDX), FX (.FOREX),
  // and B3 (.SA). NOT commodities — EODHD has no commodities/futures exchange (verified
  // live 2026-07-04: CL/NG/GC/SI `.COMM` 404). Its capability list therefore omits it.
  eodhd:     ['equity', 'index', 'fx', 'etf', 'b3'],
  yahoo:     ['equity', 'index', 'fx', 'commodity', 'etf', 'b3'],
  brapi:     ['b3'],
  coingecko: ['crypto'],
  bcb:       ['br-macro', 'br-fx'],
  // FMP "Premium" (paid, /stable API). PRIMARY for equities/ETFs + FX (real-time + fundamentals,
  // Stage 2) and gap-filler for gold/silver futures + the ^FTSE index (Stage 1). EODHD stays the
  // equity/FX fallback and the primary for the other indices (FMP gates 5/12 EU/Asia indices).
  fmp:       ['equity', 'etf', 'fx', 'commodity', 'index'],
  finnhub:   ['equity'], // wired later (proxy-only today)
};

// finnhub is declared in PROVIDER_CAPS for forward-compat (so the Settings UI can offer it)
// but has NO fetch branch yet in quoteFetchManager.buildQuotesMap. Without this guard, a DB
// override naming it for a class it "can" serve would pass the capability filter and then
// silently blank the asset (nothing actually fetches it). Strip it from resolved precedence
// until it's wired, then delete it from this set. (fmp was wired in Stage 1.)
const UNWIRED_PROVIDERS = new Set(['finnhub']);

// Classify a taxonomy asset into a data class from fields we've validated in prod
// (exchange / meta / symbol format).
export function classify(asset) {
  const meta = parseMeta(asset.meta);
  if (meta.isCrypto || meta.cgId) return 'crypto';
  if (asset.exchange === 'BCB' || meta.bcbSeries) return 'br-macro';
  if (asset.exchange === 'B3' || meta.yahooSymbol) return 'b3';
  const sym = asset.symbol || '';
  if (sym.startsWith('^')) return 'index';
  if (sym.includes('=X')) return 'fx';
  if (sym.includes('=F')) return 'commodity';
  return 'equity'; // equities + ETFs — all Yahoo-served
}

// Recommended precedence per class. Two views:
//   IDEAL   — the "recommended" order shown in Settings (best data source first).
//   EFFECTIVE — what we actually run right now.
// After the EODHD "All-World" + BRAPI Pro subscription (2026-07-04), EODHD is the
// primary for global classes (paid API key → no Yahoo datacenter-IP blocking), Yahoo
// is last-resort fallback. B3's primary stays Yahoo for now — flipping B3 to
// BRAPI-Pro-primary (+ EODHD `.SA` fallback) is the next increment (a config change
// here + adding B3 to the EODHD/BRAPI fetch sets).
export const RECOMMENDED_IDEAL = {
  crypto:     ['coingecko'],
  b3:         ['brapi', 'eodhd', 'yahoo'],  // BRAPI Pro is freshest for B3 (~5min native)
  'br-macro': ['bcb'],
  'br-fx':    ['bcb', 'yahoo'],
  index:      ['eodhd', 'fmp', 'yahoo'],     // EODHD primary; FMP fills ^FTSE (EODHD returns "NA")
  fx:         ['fmp', 'eodhd', 'yahoo'],     // FMP real-time; EODHD (~1min) fallback
  commodity:  ['fmp', 'yahoo'],              // FMP Premium gold/silver; CL/NG gated → USO/UNG ETF proxies
  etf:        ['fmp', 'eodhd', 'yahoo'],     // (etf folds into equity via classify; kept consistent)
  equity:     ['fmp', 'eodhd', 'yahoo'],     // FMP real-time + fundamentals; EODHD (15min) warm fallback
};

// B3 is now BRAPI-Pro-PRIMARY (Stage 3 / P2): the global-B3 fetcher batch-fetches every global
// B3 name with full fields (day high/low, volume, marketCap, 52wk) → EODHD `.SA` warm fallback →
// Yahoo `.SA` last resort. Effective === ideal, so the override is gone.
export const RECOMMENDED_EFFECTIVE = { ...RECOMMENDED_IDEAL };

/**
 * Effective, capability-valid provider order for an asset.
 * @param {object} asset  taxonomy row (symbol, exchange, meta, subgroup_id, group_id)
 * @param {object} [overrides]  { global?, groups?, subgroups? } — Phase B config (optional)
 * @returns {string[]} ordered provider ids
 */
export function resolvePrecedence(asset, overrides = null) {
  const cls = classify(asset);
  let order =
    overrides?.subgroups?.[asset.subgroup_id] ??
    overrides?.groups?.[asset.group_id] ??
    overrides?.global ??
    RECOMMENDED_EFFECTIVE[cls] ??
    ['yahoo'];
  // keep only providers that can actually serve this class AND are wired to a fetcher
  order = order.filter((p) => PROVIDER_CAPS[p]?.includes(cls) && !UNWIRED_PROVIDERS.has(p));
  if (order.length === 0) order = RECOMMENDED_EFFECTIVE[cls] ?? ['yahoo'];
  return order;
}

export function parseMeta(m) {
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
  return m;
}
