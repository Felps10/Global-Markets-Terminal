/**
 * fmp.js — server-side FMP proxy with the key injected server-side (Stage 2 — key de-exposure).
 *
 * GET /api/v1/fmp/<endpoint>?<params>
 *
 * The browser no longer holds VITE_FMP_KEY. These ALLOWLISTED read endpoints inject FMP_KEY
 * server-side and cache responses (shared across all users), so the paid Premium key never ships
 * in the bundle and quota isn't burned per-browser. Public (non-sensitive market data — same
 * posture as /quote, /ohlcv, /quotes/live), but confined to a fixed set of read endpoints (no
 * arbitrary passthrough) and rate-shielded by the cache.
 *
 * Replaces the old open `/proxy/fmp/*` passthrough that forwarded a client-supplied apikey.
 */

import { Router } from 'express';

const router = Router();
const FMP_BASE = 'https://financialmodelingprep.com/stable';

// Allowlisted endpoints → cache TTL (ms). Exact sub-path match.
const TTL = {
  'profile':                6 * 3600e3, // firmographics move slowly, but price/mktCap live inside it
  'ratios-ttm':             6 * 3600e3,
  'key-metrics-ttm':        6 * 3600e3,
  'grades-consensus':       6 * 3600e3,
  'price-target-consensus': 6 * 3600e3,
  'analyst-estimates':      6 * 3600e3,
  'discounted-cash-flow':  24 * 3600e3,
  'batch-quote':               45e3,     // LIVE prices (heatmap) — keep short
  'historical-price-eod/full': 6 * 3600e3,
};
// Endpoints with a dynamic trailing segment → matched by prefix.
const PREFIX_TTL = {
  'technical-indicators/': 60 * 60e3, // .../rsi
  'historical-chart/':      5 * 60e3, // .../1min|5min|15min|30min|1hour
};

function ttlFor(ep) {
  if (ep in TTL) return TTL[ep];
  for (const p of Object.keys(PREFIX_TTL)) if (ep.startsWith(p)) return PREFIX_TTL[p];
  return null; // not allowlisted
}

const cache = new Map(); // req.url (path+query, no key) → { ts, ttl, status, body }
const MAX_CACHE = 3000;

router.get(/.*/, async (req, res) => {
  if (!process.env.FMP_KEY) return res.status(503).json({ error: 'FMP not configured' });

  const ep = (req.url.split('?')[0] || '').replace(/^\/+/, '');
  // Reject anything with traversal / unexpected chars before the allowlist check.
  if (!/^[a-z0-9/_-]+$/i.test(ep)) return res.status(400).json({ error: 'bad endpoint' });
  const ttl = ttlFor(ep);
  if (ttl == null) return res.status(404).json({ error: 'endpoint not allowed: ' + ep });

  const cacheKey = req.url;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < hit.ttl) {
    return res.status(hit.status).json(hit.body);
  }

  // Preserve the client's exact query encoding; append the server key.
  const qIdx = req.url.indexOf('?');
  const qs = qIdx >= 0 ? req.url.slice(qIdx + 1) : '';
  const url = `${FMP_BASE}/${ep}?${qs}${qs ? '&' : ''}apikey=${process.env.FMP_KEY}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const body = await r.json().catch(() => null);
    if (r.ok && body != null) {
      if (cache.size >= MAX_CACHE) cache.clear();
      cache.set(cacheKey, { ts: Date.now(), ttl, status: 200, body });
    }
    return res.status(r.status).json(body ?? { error: `FMP HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
