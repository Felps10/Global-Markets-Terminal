/**
 * server/routes/yahoo.js
 *
 * Yahoo Finance proxy router — absorbed from proxy-server.js for production.
 *
 * Yahoo Finance requires a crumb token + session cookies for the quote API
 * to return data. This router acquires both by scraping the crumb from the
 * embedded JSON in a Yahoo Finance page, then forwards quote requests with
 * the correct credentials.
 *
 * Session is cached for 1 hour and auto-refreshed on expiry or on a 401/403.
 *
 * Endpoints exposed (mounted at /api/yahoo in server/index.js):
 *   GET /api/yahoo/v7/finance/quote?symbols=AAPL,MSFT,…
 *   GET /api/yahoo/v8/finance/chart?symbol=AAPL&range=1d&interval=5m
 *
 * Must be started with  --max-http-header-size=65536  because Yahoo Finance
 * sends very large response headers that overflow Node's default 8 KB limit.
 * The "start" script in package.json already includes this flag.
 */

import express from 'express';
import {
  httpsGet,
  ensureSession,
  getSession,
  refreshSession,
} from '../services/yahooSession.js';

const router = express.Router();

// ─── Quote endpoint ───────────────────────────────────────────────────────────

router.get('/v7/finance/quote', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) {
    return res.status(400).json({ error: 'symbols query param is required' });
  }

  try {
    await ensureSession();
  } catch (err) {
    console.error('[yahoo] Session error:', err.message);
    return res
      .status(502)
      .json({ error: 'Could not establish Yahoo Finance session: ' + err.message });
  }

  const makeRequest = () => {
    const s = getSession();
    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols)}` +
      `&crumb=${encodeURIComponent(s.crumb)}`;

    return httpsGet(url, {
      Cookie: s.cookie,
      Accept: 'application/json',
    });
  };

  try {
    let upstream = await makeRequest();

    // Crumb may have expired — refresh once and retry
    if (upstream.status === 401 || upstream.status === 403) {
      console.warn('[yahoo] Crumb rejected — refreshing session…');
      await refreshSession();
      upstream = await makeRequest();
    }

    if (upstream.status !== 200) {
      console.error(`[yahoo] Upstream returned ${upstream.status}`);
      return res
        .status(502)
        .json({ error: `Yahoo Finance returned HTTP ${upstream.status}` });
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(upstream.body);
  } catch (err) {
    console.error('[yahoo] Request failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ─── Chart history endpoint ───────────────────────────────────────────────────

router.get('/v8/finance/chart', async (req, res) => {
  const { symbol, range = '1d', interval = '5m' } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: 'symbol query param is required' });
  }

  try {
    await ensureSession();
  } catch (err) {
    console.error('[yahoo] Session error:', err.message);
    return res
      .status(502)
      .json({ error: 'Could not establish Yahoo Finance session: ' + err.message });
  }

  const makeRequest = () => {
    const s = getSession();
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${interval}&includePrePost=false` +
      `&crumb=${encodeURIComponent(s.crumb)}`;

    return httpsGet(url, {
      Cookie: s.cookie,
      Accept: 'application/json',
    });
  };

  try {
    let upstream = await makeRequest();

    if (upstream.status === 401 || upstream.status === 403) {
      console.warn('[yahoo] Crumb rejected — refreshing session…');
      await refreshSession();
      upstream = await makeRequest();
    }

    if (upstream.status !== 200) {
      console.error(`[yahoo] Upstream returned ${upstream.status}`);
      return res
        .status(502)
        .json({ error: `Yahoo Finance returned HTTP ${upstream.status}` });
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(upstream.body);
  } catch (err) {
    console.error('[yahoo] Chart request failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

export default router;
