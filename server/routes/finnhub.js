/**
 * finnhub.js — server-side Finnhub proxy with the key injected server-side (Stage 4 / P3).
 *
 * GET /api/v1/finnhub/<endpoint>?<params>
 *
 * The browser no longer holds VITE_FINNHUB_KEY. These allowlisted read endpoints inject the key
 * server-side and cache responses (shared across users), so the key stays off the client and the
 * free 60/min quota is shared instead of burned per-browser. Public market data; replaces the old
 * open `/proxy/finnhub/*` passthrough. (Free key → low stakes, but same hygiene as FMP/BRAPI.)
 */

import { Router } from 'express';

const router = Router();
const BASE = 'https://finnhub.io/api/v1';

const TTL = {
  'quote':                    60e3,
  'company-news':          5 * 60e3,
  'stock/earnings':       60 * 60e3,
  'stock/insider-sentiment': 60 * 60e3,
  'stock/recommendation':    60 * 60e3,
};
function ttlFor(ep) { return ep in TTL ? TTL[ep] : null; }

const cache = new Map();
const MAX_CACHE = 2000;

router.get(/.*/, async (req, res) => {
  if (!process.env.VITE_FINNHUB_KEY) return res.status(503).json({ error: 'Finnhub not configured' });
  const ep = (req.url.split('?')[0] || '').replace(/^\/+/, '');
  if (!/^[a-z0-9/_-]+$/i.test(ep)) return res.status(400).json({ error: 'bad endpoint' });
  const ttl = ttlFor(ep);
  if (ttl == null) return res.status(404).json({ error: 'endpoint not allowed: ' + ep });

  const cacheKey = req.url;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < ttl) return res.status(hit.status).json(hit.body);

  const qIdx = req.url.indexOf('?');
  const qs = qIdx >= 0 ? req.url.slice(qIdx + 1) : '';
  const url = `${BASE}/${ep}?${qs}${qs ? '&' : ''}token=${process.env.VITE_FINNHUB_KEY}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const body = await r.json().catch(() => null);
    if (r.ok && body != null) {
      if (cache.size >= MAX_CACHE) cache.clear();
      cache.set(cacheKey, { ts: Date.now(), status: 200, body });
    }
    return res.status(r.status).json(body ?? { error: `Finnhub HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
