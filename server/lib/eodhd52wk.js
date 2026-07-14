/**
 * server/lib/eodhd52wk.js
 *
 * 52-week high/low from EODHD's 1-year daily EOD history, cached in-memory (~12h).
 *
 * EODHD's real-time quote endpoint (used by the live feed + /api/v1/quote) does NOT carry the
 * 52-week range, so EODHD-sourced symbols — chiefly the FMP-gated indices (^GDAXI, ^FCHI, ^BVSP,
 * ^AXJO, ^KS11, ^GSPTSE, ^BSESN) — rendered a blank 52-week range in the Asset Detail Drawer and
 * Watchlist. This computes it from the /eod daily history (max high / min low over ~1y). FMP-served
 * symbols already carry yearHigh/yearLow, so they never hit this path.
 *
 * `getEodhd52wk(code)` fetches + caches (async, on demand). `getCached52wk(code)` is a sync read
 * for the periodic quote engine (buildQuotesMap is synchronous). Both return { high, low } or null.
 */

const TTL_MS = 12 * 60 * 60 * 1000; // 12h — 52-week extremes barely move intraday
const cache = new Map(); // EODHD code → { ts, high, low }

/** Sync read of the cached 52-week range (null until warmed by getEodhd52wk). */
export function getCached52wk(code) {
  const hit = cache.get(code);
  return hit ? { high: hit.high, low: hit.low } : null;
}

/** Fetch (or serve cached) the 52-week high/low for an EODHD code. Returns null on any miss. */
export async function getEodhd52wk(code) {
  if (!code || !process.env.EODHD_API_KEY) return null;
  const hit = cache.get(code);
  if (hit && Date.now() - hit.ts < TTL_MS) return { high: hit.high, low: hit.low };

  try {
    const from = new Date(Date.now() - 370 * 86_400_000).toISOString().slice(0, 10);
    const params = new URLSearchParams({ api_token: process.env.EODHD_API_KEY, fmt: 'json', period: 'd', from });
    const url = `https://eodhd.com/api/eod/${encodeURIComponent(code)}?${params.toString()}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return hit ? { high: hit.high, low: hit.low } : null; // keep last-known-good
    const rows = await r.json();
    let high = -Infinity, low = Infinity;
    for (const x of Array.isArray(rows) ? rows : []) {
      const h = Number(x.high), l = Number(x.low);
      if (Number.isFinite(h)) high = Math.max(high, h);
      if (Number.isFinite(l)) low = Math.min(low, l);
    }
    if (!Number.isFinite(high) || !Number.isFinite(low)) return hit ? { high: hit.high, low: hit.low } : null;
    cache.set(code, { ts: Date.now(), high, low });
    return { high, low };
  } catch {
    return hit ? { high: hit.high, low: hit.low } : null;
  }
}
