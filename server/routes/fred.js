/**
 * fred.js — server-side FRED proxy with the key injected server-side (Stage 4 / P3).
 *
 * GET /api/v1/fred/<endpoint>?<params>
 *
 * The browser no longer holds VITE_FRED_KEY. These allowlisted read endpoints inject the key
 * server-side and cache responses, so the key stays off the client. FRED is free + unlimited, so
 * this is pure hygiene. Public macro data; replaces the old open `/proxy/fred/*` passthrough.
 */

import { Router } from 'express';

const router = Router();
const BASE = 'https://api.stlouisfed.org/fred';

const TTL = {
  'series/observations': 60 * 60e3, // macro series update at most daily
  'releases':            24 * 60 * 60e3,
  'releases/dates':      12 * 60 * 60e3,
};
function ttlFor(ep) { return ep in TTL ? TTL[ep] : null; }

const cache = new Map();
const MAX_CACHE = 1000;

router.get(/.*/, async (req, res) => {
  if (!process.env.VITE_FRED_KEY) return res.status(503).json({ error: 'FRED not configured' });
  const ep = (req.url.split('?')[0] || '').replace(/^\/+/, '');
  if (!/^[a-z0-9/_-]+$/i.test(ep)) return res.status(400).json({ error: 'bad endpoint' });
  const ttl = ttlFor(ep);
  if (ttl == null) return res.status(404).json({ error: 'endpoint not allowed: ' + ep });

  const cacheKey = req.url;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < ttl) return res.status(hit.status).json(hit.body);

  const qIdx = req.url.indexOf('?');
  const qs = qIdx >= 0 ? req.url.slice(qIdx + 1) : '';
  const url = `${BASE}/${ep}?${qs}${qs ? '&' : ''}api_key=${process.env.VITE_FRED_KEY}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const body = await r.json().catch(() => null);
    if (r.ok && body != null) {
      if (cache.size >= MAX_CACHE) cache.clear();
      cache.set(cacheKey, { ts: Date.now(), status: 200, body });
    }
    return res.status(r.status).json(body ?? { error: `FRED HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
