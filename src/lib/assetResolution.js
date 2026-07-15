// Duplicate-tolerant symbol resolution over the flat taxonomy asset list.
//
// A symbol can legitimately appear in more than one taxonomy row — the 20
// brazil-highlights rows mirror br-acoes symbols (see src/data/assets.js).
// Consumers must never depend on row order to pick a winner: the 2026-07-14
// incident was exactly that, with first-match (Array.find) and last-write-wins
// (Object.fromEntries) consumers disagreeing about the same symbol's isB3.
// Rule: prefer the row that carries meta.isB3 (the B3-identity row), fall back
// to the first occurrence. All symbol lookups over useTaxonomy().assets go
// through these helpers.

/** meta as an object — Supabase jsonb arrives parsed, but tolerate strings. */
export function metaOf(row) {
  const m = row?.meta;
  if (!m) return {};
  if (typeof m === 'string') {
    try { return JSON.parse(m); } catch { return {}; }
  }
  return m;
}

/** The preferred taxonomy row for a symbol, or null. */
export function resolveAsset(assets, symbol) {
  if (!symbol || !Array.isArray(assets)) return null;
  let first = null;
  for (const a of assets) {
    if (a.symbol !== symbol) continue;
    if (metaOf(a).isB3) return a;
    if (!first) first = a;
  }
  return first;
}

/** Symbol-keyed map of preferred rows (same preference as resolveAsset). */
export function buildAssetMap(assets) {
  const map = {};
  if (!Array.isArray(assets)) return map;
  for (const a of assets) {
    const prev = map[a.symbol];
    if (!prev || (!metaOf(prev).isB3 && metaOf(a).isB3)) map[a.symbol] = a;
  }
  return map;
}

/** Symbol-keyed `{ isB3 }` map — the shape fmpOHLCV/fetchYahooOHLCV expect. */
export function buildIsB3Map(assets) {
  const map = {};
  if (!Array.isArray(assets)) return map;
  for (const a of assets) {
    map[a.symbol] = { isB3: !!(map[a.symbol]?.isB3 || metaOf(a).isB3) };
  }
  return map;
}
