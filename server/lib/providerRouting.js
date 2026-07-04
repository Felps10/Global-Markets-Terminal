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
  yahoo:     ['equity', 'index', 'fx', 'commodity', 'etf', 'b3'],
  brapi:     ['b3'],
  coingecko: ['crypto'],
  bcb:       ['br-macro', 'br-fx'],
  // wired later (proxy-only today):
  fmp:       ['equity'],
  finnhub:   ['equity'],
};

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
//   EFFECTIVE — what we actually run for free today (hybrid): Yahoo-first for B3,
//               BRAPI only as a fallback, because BRAPI free = 1 ticker/request.
// Flipping B3 to BRAPI-first later is a config change once a paid plan is added.
export const RECOMMENDED_IDEAL = {
  crypto:     ['coingecko'],
  b3:         ['brapi', 'yahoo'],
  'br-macro': ['bcb'],
  'br-fx':    ['bcb', 'yahoo'],
  index:      ['yahoo'],
  fx:         ['yahoo'],
  commodity:  ['yahoo'],
  etf:        ['yahoo'],
  equity:     ['yahoo'],
};

export const RECOMMENDED_EFFECTIVE = {
  ...RECOMMENDED_IDEAL,
  b3: ['yahoo', 'brapi'], // hybrid/free default
};

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
  // keep only providers that can actually serve this class
  order = order.filter((p) => PROVIDER_CAPS[p]?.includes(cls));
  if (order.length === 0) order = RECOMMENDED_EFFECTIVE[cls] ?? ['yahoo'];
  return order;
}

export function parseMeta(m) {
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
  return m;
}
