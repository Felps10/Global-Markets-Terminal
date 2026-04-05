/**
 * server/services/yahooSession.js
 *
 * Shared Yahoo Finance session management — crumb token + session cookies.
 *
 * Yahoo Finance requires a crumb token and session cookies for quote/chart APIs.
 * This module acquires both by scraping the crumb from a Yahoo Finance page,
 * then exposes helpers for any module that needs to call Yahoo server-side.
 *
 * Used by:
 *   - server/routes/yahoo.js (proxy routes for browser clients)
 *   - server/services/quoteFetchManager.js (server-side periodic fetcher)
 */

import https from 'https';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CRUMB_TTL_MS = 60 * 60 * 1000; // refresh session every hour

let session = { cookie: '', crumb: '', fetchedAt: 0 };

// ─── HTTP helper (uses node:https to avoid undici header-overflow limits) ─────

export function httpsGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...extraHeaders,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode, headers: res.headers, body })
      );
    });

    req.on('error', reject);
    req.end();
  });
}

function parseCookies(res) {
  const raw = res.headers['set-cookie'] || [];
  return (Array.isArray(raw) ? raw : [raw])
    .map((c) => c.split(';')[0].trim())
    .join('; ');
}

// ─── Session management ───────────────────────────────────────────────────────

async function fetchSession() {
  const res = await httpsGet('https://finance.yahoo.com/quote/AAPL/');

  const cookie = parseCookies(res);
  if (!cookie) throw new Error('No session cookie received from Yahoo Finance.');

  const crumbMatch = res.body.match(/"crumb":"([^"\\]+)"/);
  if (!crumbMatch) throw new Error('Could not find crumb in Yahoo Finance page.');

  const crumb = crumbMatch[1];

  session = { cookie, crumb, fetchedAt: Date.now() };
  console.log(
    `[yahoo] Session refreshed — crumb: ${crumb}  cookie: ${cookie.slice(0, 40)}…`
  );
}

export async function ensureSession() {
  if (!session.crumb || Date.now() - session.fetchedAt > CRUMB_TTL_MS) {
    await fetchSession();
  }
}

/**
 * Returns the current session state (cookie + crumb).
 * Call ensureSession() before using this.
 */
export function getSession() {
  return session;
}

/**
 * Forces a session refresh. Useful after a 401/403 from Yahoo.
 */
export async function refreshSession() {
  await fetchSession();
}
