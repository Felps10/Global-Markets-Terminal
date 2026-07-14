/**
 * brapi.js — server-side BRAPI proxy with the Pro token injected server-side (Stage 2).
 *
 * GET /api/v1/brapi/quote/<tickers>?<range&interval&modules…>
 *
 * The browser no longer holds VITE_BRAPI_TOKEN. This injects the Pro token server-side and caches
 * responses, so the paid token never ships in the bundle and quota isn't burned per-browser.
 * Serves both the live B3 quote (no range) and the B3 chart history (range/interval). Public
 * market data; confined to the read `quote` endpoint. Replaces the old open `/proxy/brapi/*`.
 */

import { Router } from 'express';

const router = Router();
const BRAPI_BASE = 'https://brapi.dev/api';

const TTL_MS = 60e3; // 60s — quote + daily history
const cache = new Map(); // req.url → { ts, body }
const MAX_CACHE = 2000;

router.get('/quote/:tickers', async (req, res) => {
  const token = process.env.VITE_BRAPI_TOKEN; // Railway runtime var (same one quoteFetchManager uses)
  if (!token) return res.status(503).json({ error: 'BRAPI not configured' });

  const tickers = req.params.tickers || '';
  // B3 tickers: letters+digits, plus comma (multi), dot, caret (indices), hyphen. Reject anything else.
  if (!/^[A-Za-z0-9.,^-]+$/.test(tickers)) return res.status(400).json({ error: 'bad tickers' });

  const cacheKey = req.url;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL_MS) return res.status(200).json(hit.body);

  const qIdx = req.url.indexOf('?');
  const qs = qIdx >= 0 ? req.url.slice(qIdx + 1) : '';
  const url = `${BRAPI_BASE}/quote/${tickers}?${qs}${qs ? '&' : ''}token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const body = await r.json().catch(() => null);
    if (r.ok && body != null) {
      if (cache.size >= MAX_CACHE) cache.clear();
      cache.set(cacheKey, { ts: Date.now(), body });
    }
    return res.status(r.status).json(body ?? { error: `BRAPI HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
