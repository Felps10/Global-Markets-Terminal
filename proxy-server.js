/**
 * proxy-server.js
 *
 * Lightweight Express proxy for Yahoo Finance.
 *
 * Yahoo Finance requires a crumb token + session cookies for the quote API
 * to return data. This server acquires both by scraping the crumb from the
 * embedded JSON in a Yahoo Finance page, then forwards quote requests with
 * the correct credentials.
 *
 * Session is cached for 1 hour and auto-refreshed on expiry or on a 401/403.
 *
 * Endpoints exposed:
 *   GET /v7/finance/quote?symbols=AAPL,MSFT,…
 *   GET /v8/finance/chart?symbol=AAPL&range=1d&interval=5m
 *
 * Vite's dev proxy forwards /api/yahoo/* → here, so the browser never sees
 * Yahoo Finance directly.
 *
 * Must be started with  --max-http-header-size=65536  because Yahoo Finance
 * sends very large response headers that overflow Node's default 8 KB limit.
 * The npm "server" script already includes this flag.
 */

import express from "express";
import https from "https";

const app = express();
const PORT = 3001;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CRUMB_TTL_MS = 60 * 60 * 1000; // refresh session every hour

let session = { cookie: "", crumb: "", fetchedAt: 0 };

// ─── HTTP helper (uses node:https to avoid undici header-overflow limits) ─────

function httpsGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        ...extraHeaders,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, headers: res.headers, body })
      );
    });

    req.on("error", reject);
    req.end();
  });
}

function parseCookies(res) {
  const raw = res.headers["set-cookie"] || [];
  return (Array.isArray(raw) ? raw : [raw])
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

// ─── Session management ───────────────────────────────────────────────────────

async function fetchSession() {
  // Visit a Yahoo Finance quote page to collect session cookies AND the crumb
  // (Yahoo embeds the crumb as a JSON value in the page's inline scripts).
  const res = await httpsGet("https://finance.yahoo.com/quote/AAPL/");

  const cookie = parseCookies(res);
  if (!cookie) throw new Error("No session cookie received from Yahoo Finance.");

  const crumbMatch = res.body.match(/"crumb":"([^"\\]+)"/);
  if (!crumbMatch) throw new Error("Could not find crumb in Yahoo Finance page.");

  const crumb = crumbMatch[1];

  session = { cookie, crumb, fetchedAt: Date.now() };
  console.log(
    `[proxy] Session refreshed — crumb: ${crumb}  cookie: ${cookie.slice(0, 40)}…`
  );
}

async function ensureSession() {
  if (!session.crumb || Date.now() - session.fetchedAt > CRUMB_TTL_MS) {
    await fetchSession();
  }
}

// ─── Quote endpoint ───────────────────────────────────────────────────────────

app.get("/v7/finance/quote", async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) {
    return res.status(400).json({ error: "symbols query param is required" });
  }

  try {
    await ensureSession();
  } catch (err) {
    console.error("[proxy] Session error:", err.message);
    return res
      .status(502)
      .json({ error: "Could not establish Yahoo Finance session: " + err.message });
  }

  const makeRequest = () => {
    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols)}` +
      `&crumb=${encodeURIComponent(session.crumb)}`;

    return httpsGet(url, {
      Cookie: session.cookie,
      Accept: "application/json",
    });
  };

  try {
    let upstream = await makeRequest();

    // Crumb may have expired — refresh once and retry
    if (upstream.status === 401 || upstream.status === 403) {
      console.warn("[proxy] Crumb rejected — refreshing session…");
      await fetchSession();
      upstream = await makeRequest();
    }

    if (upstream.status !== 200) {
      console.error(`[proxy] Upstream returned ${upstream.status}`);
      return res
        .status(502)
        .json({ error: `Yahoo Finance returned HTTP ${upstream.status}` });
    }

    res.setHeader("Content-Type", "application/json");
    res.send(upstream.body);
  } catch (err) {
    console.error("[proxy] Request failed:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// ─── Chart history endpoint ───────────────────────────────────────────────────

app.get("/v8/finance/chart", async (req, res) => {
  const { symbol, range = "1d", interval = "5m" } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: "symbol query param is required" });
  }

  try {
    await ensureSession();
  } catch (err) {
    console.error("[proxy] Session error:", err.message);
    return res
      .status(502)
      .json({ error: "Could not establish Yahoo Finance session: " + err.message });
  }

  const makeRequest = () => {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${interval}&includePrePost=false` +
      `&crumb=${encodeURIComponent(session.crumb)}`;

    return httpsGet(url, {
      Cookie: session.cookie,
      Accept: "application/json",
    });
  };

  try {
    let upstream = await makeRequest();

    if (upstream.status === 401 || upstream.status === 403) {
      console.warn("[proxy] Crumb rejected — refreshing session…");
      await fetchSession();
      upstream = await makeRequest();
    }

    if (upstream.status !== 200) {
      console.error(`[proxy] Upstream returned ${upstream.status}`);
      return res
        .status(502)
        .json({ error: `Yahoo Finance returned HTTP ${upstream.status}` });
    }

    res.setHeader("Content-Type", "application/json");
    res.send(upstream.body);
  } catch (err) {
    console.error("[proxy] Chart request failed:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[proxy] Yahoo Finance proxy listening on http://localhost:${PORT}`);
  fetchSession().catch((e) =>
    console.warn("[proxy] Pre-warm failed (will retry on first request):", e.message)
  );
});
