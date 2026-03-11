// ─── DATA SERVICES ───────────────────────────────────────────────────────────
// Centralized data layer for all external API integrations.
// Each source has its own fetch helpers, rate-limit guards, and caching.

import { apiClient, ApiHttpError } from './services/apiClient.js';

// ─── API KEYS (from .env.local via Vite) ─────────────────────────────────────
const FINNHUB_KEY   = import.meta.env.VITE_FINNHUB_KEY  || "";
const AV_KEY        = import.meta.env.VITE_ALPHAVANTAGE_KEY || "";
const FRED_KEY      = import.meta.env.VITE_FRED_KEY     || "";
const FMP_KEY       = import.meta.env.VITE_FMP_KEY      || "";
const BRAPI_TOKEN   = import.meta.env.VITE_BRAPI_TOKEN  || "";

// ─── STARTUP VALIDATION ─────────────────────────────────────────────────────
const KEY_CONFIG = [
  { key: "VITE_FINNHUB_KEY",      value: FINNHUB_KEY, label: "Finnhub",      url: "https://finnhub.io" },
  { key: "VITE_ALPHAVANTAGE_KEY", value: AV_KEY,       label: "Alpha Vantage", url: "https://www.alphavantage.co/support/#api-key" },
  { key: "VITE_FRED_KEY",         value: FRED_KEY,     label: "FRED",          url: "https://fred.stlouisfed.org/docs/api/api_key.html" },
  { key: "VITE_FMP_KEY",          value: FMP_KEY,      label: "FMP",           url: "https://financialmodelingprep.com/developer" },
  { key: "VITE_BRAPI_TOKEN",     value: BRAPI_TOKEN,  label: "BRAPI",         url: "https://brapi.dev" },
];

KEY_CONFIG.forEach(({ key, value, label, url }) => {
  if (!value) {
    console.warn(`[CONFIG WARNING] ${key} is not set. ${label} data will be unavailable. Get your free key at ${url}`);
  }
});

// ─── GENERIC HELPERS ─────────────────────────────────────────────────────────

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (Date.now() - ts > ttl) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data, ttlMs) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now(), ttl: ttlMs }));
  } catch { /* storage full — ignore */ }
}

// DORMANT-SUPPORT — used only by dormant functions (D-3 through D-5 and the Finnhub queue).
// Not on the apiClient migration path; remove when all dormant callers are activated.
async function safeFetch(url, opts = {}, sourceName = "unknown") {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), ...opts });
    if (!res.ok) {
      console.warn(`[${sourceName}] HTTP ${res.status} from ${url.split("?")[0]}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[${sourceName}] fetch failed: ${err.message}`);
    return null;
  }
}

// ─── FINNHUB (60 calls/min) ──────────────────────────────────────────────────
// Simple queue: max 1 request per second to stay within limits.
// DORMANT-SUPPORT — finnhubQueue / processFinnhubQueue / finnhubFetch are used only
// by dormant functions (D-1, D-2). Remove when those are activated and migrated.

const finnhubQueue = [];
let finnhubProcessing = false;

function processFinnhubQueue() {
  if (finnhubProcessing || finnhubQueue.length === 0) return;
  finnhubProcessing = true;
  const { resolve, url } = finnhubQueue.shift();
  safeFetch(url, {}, "Finnhub").then(resolve);
  setTimeout(() => {
    finnhubProcessing = false;
    processFinnhubQueue();
  }, 1000);
}

function finnhubFetch(url) {
  return new Promise((resolve) => {
    finnhubQueue.push({ resolve, url });
    processFinnhubQueue();
  });
}

export function hasFinnhubKey() { return !!FINNHUB_KEY; }

export async function finnhubQuote(symbol) {
  if (!FINNHUB_KEY) return null;
  const response = await apiClient.call('finnhub', 'quote', { symbol }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/finnhub/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!data || !data.c) throw new ApiHttpError(204, 'No quote data');
      return data;
    },
  });
  return response.data ?? null;
}

// DORMANT (D-1) — exported for future panel use; not called by any active UI path.
// When activated: replace the inner finnhubFetch() call with apiClient.call('finnhub', 'earnings', { symbol }, { fetcher }).
export async function finnhubEarnings(symbol) {
  if (!FINNHUB_KEY) return null;
  const cacheKey = `fh:earnings:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await finnhubFetch(
    `/api/finnhub/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
  );
  if (data && Array.isArray(data)) {
    cacheSet(cacheKey, data, 3600_000); // 1hr cache
    return data;
  }
  return null;
}

export async function finnhubNews(symbol) {
  if (!FINNHUB_KEY) return null;
  const now  = new Date();
  const from = new Date(now - 7 * 86400_000).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  const response = await apiClient.call('finnhub', 'news', { symbol, from, to }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/finnhub/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!Array.isArray(data)) throw new ApiHttpError(204, 'No news data');
      return data.slice(0, 5);
    },
  });
  if (response.deferred) return null;
  return response.data ?? null;
}

// DORMANT (D-2) — exported for future panel use; not called by any active UI path.
// When activated: replace the inner finnhubFetch() call with apiClient.call('finnhub', 'insiderSentiment', { symbol }, { fetcher }).
export async function finnhubInsiderSentiment(symbol) {
  if (!FINNHUB_KEY) return null;
  const cacheKey = `fh:insider:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await finnhubFetch(
    `/api/finnhub/stock/insider-sentiment?symbol=${encodeURIComponent(symbol)}&from=2024-01-01&token=${FINNHUB_KEY}`
  );
  if (data && data.data) {
    cacheSet(cacheKey, data.data, 3600_000);
    return data.data;
  }
  return null;
}

export async function finnhubRecommendation(symbol) {
  if (!FINNHUB_KEY) return null;
  const response = await apiClient.call('finnhub', 'recommendation', { symbol }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/finnhub/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new ApiHttpError(204, 'No recommendation data');
      return data[0];
    },
  });
  if (response.deferred) return null;
  return response.data ?? null;
}

// ─── ALPHA VANTAGE (25 calls/day — ON DEMAND ONLY) ──────────────────────────
// NEVER called on page load. Only triggered by explicit user action.

export function hasAlphaVantageKey() { return !!AV_KEY; }

// DORMANT (D-3) — exported for future panel use; not called by any active UI path.
// When activated: replace the inner safeFetch() call with apiClient.call('alphavantage', 'rsi', { symbol, interval, timePeriod }, { fetcher }).
export async function alphaVantageRSI(symbol, interval = "daily", timePeriod = 14) {
  if (!AV_KEY) return null;
  const cacheKey = `av:rsi:${symbol}:${interval}:${timePeriod}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/alphavantage/query?function=RSI&symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${AV_KEY}`,
    {}, "AlphaVantage"
  );
  if (data && data["Technical Analysis: RSI"]) {
    const entries = Object.entries(data["Technical Analysis: RSI"]);
    const result = entries.slice(0, 30).map(([date, v]) => ({ date, value: parseFloat(v.RSI) }));
    cacheSet(cacheKey, result, 86400_000); // 24hr cache — preserve quota
    return result;
  }
  return null;
}

// DORMANT (D-4) — exported for future panel use; not called by any active UI path.
// When activated: replace the inner safeFetch() call with apiClient.call('alphavantage', 'macd', { symbol, interval }, { fetcher }).
export async function alphaVantageMACD(symbol, interval = "daily") {
  if (!AV_KEY) return null;
  const cacheKey = `av:macd:${symbol}:${interval}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/alphavantage/query?function=MACD&symbol=${encodeURIComponent(symbol)}&interval=${interval}&series_type=close&apikey=${AV_KEY}`,
    {}, "AlphaVantage"
  );
  if (data && data["Technical Analysis: MACD"]) {
    const entries = Object.entries(data["Technical Analysis: MACD"]);
    const result = entries.slice(0, 30).map(([date, v]) => ({
      date,
      macd:   parseFloat(v.MACD),
      signal: parseFloat(v.MACD_Signal),
      hist:   parseFloat(v.MACD_Hist),
    }));
    cacheSet(cacheKey, result, 86400_000);
    return result;
  }
  return null;
}

// ─── FRED (unlimited — most reliable) ────────────────────────────────────────

export function hasFredKey() { return !!FRED_KEY; }

const FRED_SERIES = {
  cpi:               { id: "CPIAUCSL",     label: "CPI (All Urban)",          unit: "Index" },
  gdp:               { id: "GDP",          label: "GDP (Quarterly)",          unit: "$B" },
  fedRate:           { id: "FEDFUNDS",     label: "Fed Funds Rate",           unit: "%" },
  unemployment:      { id: "UNRATE",       label: "Unemployment Rate",        unit: "%" },
  treasury10y:       { id: "DGS10",        label: "10-Year Treasury Yield",   unit: "%" },
  treasury2y:        { id: "DGS2",         label: "2-Year Treasury Yield",    unit: "%" },
  mortgage30y:       { id: "MORTGAGE30US", label: "30-Year Mortgage Rate",    unit: "%" },
  consumerSentiment: { id: "UMCSENT",      label: "Consumer Sentiment",       unit: "Index" },
  retailSales:       { id: "RSAFS",        label: "Retail Sales (Monthly)",   unit: "$M" },
};

export function getFredSeriesConfig() { return FRED_SERIES; }

export async function fredSeries(seriesKey) {
  if (!FRED_KEY) return null;
  const cfg = FRED_SERIES[seriesKey];
  if (!cfg) return null;
  const response = await apiClient.call('fred', 'seriesObservations', { seriesKey }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/fred/series/observations?series_id=${cfg.id}&sort_order=desc&limit=12&file_type=json&api_key=${FRED_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!data?.observations) throw new ApiHttpError(204, 'No observations in FRED response');
      return {
        ...cfg,
        observations: data.observations
          .filter(o => o.value !== ".")
          .slice(0, 12)
          .map(o => ({ date: o.date, value: parseFloat(o.value) })),
      };
    },
  });
  // deferred: true — fredAllMacro skips this key (partial macro data is acceptable)
  if (response.deferred) return null;
  return response.data ?? null;
}

export async function fredAllMacro() {
  const keys = Object.keys(FRED_SERIES);
  const results = {};
  for (const k of keys) {
    const r = await fredSeries(k);
    if (r) results[k] = r;
  }
  return Object.keys(results).length > 0 ? results : null;
}

// ─── COINGECKO (30 calls/min, no key) ────────────────────────────────────────

export async function coingeckoPrices(ids = "bitcoin,ethereum,solana") {
  const response = await apiClient.call('coingecko', 'prices', { ids }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/coingecko/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!data || !Object.keys(data).length) throw new ApiHttpError(204, 'No price data');
      return data;
    },
  });
  return response.data ?? null;
}

// DORMANT (D-5) — exported for future panel use; not called by any active UI path.
// When activated: replace the inner safeFetch() call with apiClient.call('coingecko', 'trending', {}, { fetcher }).
export async function coingeckoTrending() {
  const cacheKey = "cg:trending";
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch("/api/coingecko/search/trending", {}, "CoinGecko");
  if (data && data.coins) {
    const result = data.coins.slice(0, 6).map(c => c.item);
    cacheSet(cacheKey, result, 300_000); // 5min cache
    return result;
  }
  return null;
}

// ─── FMP (250 calls/day) ─────────────────────────────────────────────────────
// All FMP requests are serialized through a throttled queue (1 req/sec max)
// to prevent burst 429s. Profile data cached 24hr, ratios/DCF cached 6hr.

export function hasFmpKey() { return !!FMP_KEY; }

// ── FMP rate-limit observability counter ──────────────────────────────────────
let fmpRateLimitHits = 0;
export function getFmpRateLimitHits() { return fmpRateLimitHits; }

/// ── FMP-aware fetch: handles 429 with exponential backoff + Retry-After ───────
// DORMANT-SUPPORT — fmpSafeFetch / fmpQueue / processFmpQueue / fmpFetch are used
// only by dormant function D-6 (fmpDCF). Remove when D-6 is activated and migrated.
async function fmpSafeFetch(url, maxRetries = 3) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (res.status === 429) {
        fmpRateLimitHits++;
        const retryAfterSec = parseInt(res.headers.get("Retry-After") || "0", 10);
        const backoffMs = retryAfterSec > 0
          ? retryAfterSec * 1000
          : Math.min(1000 * 2 ** attempt, 30_000); // 1s → 2s → 4s → 8s … cap 30s
        console.warn(
          `[FMP] 429 Rate Limited — ${url.split("?")[0]} | ` +
          `hit #${fmpRateLimitHits}, attempt ${attempt + 1}/${maxRetries + 1}, ` +
          `backing off ${backoffMs}ms`
        );
        if (attempt === maxRetries) return { _rateLimited: true };
        await new Promise(r => setTimeout(r, backoffMs));
        attempt++;
        continue;
      }

      // Auth errors — fail fast, no retry
      if (res.status === 401 || res.status === 403) {
        console.warn(`[FMP] Auth error HTTP ${res.status} — check VITE_FMP_KEY`);
        return null;
      }

      if (!res.ok) {
        console.warn(`[FMP] HTTP ${res.status} from ${url.split("?")[0]}`);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.warn(`[FMP] fetch failed: ${err.message}`);
      return null;
    }
  }
  return null;
}

/// ── FMP request queue: serialize all requests, 1 per second ──────────────────
const fmpQueue = [];
let fmpProcessing = false;

function processFmpQueue() {
  if (fmpProcessing || fmpQueue.length === 0) return;
  fmpProcessing = true;
  const { resolve, url } = fmpQueue.shift();
  fmpSafeFetch(url).then(data => {
    resolve(data);
    setTimeout(() => {
      fmpProcessing = false;
      processFmpQueue();
    }, 1000); // 1s between requests = max 60/min, safe for any FMP plan tier
  });
}

function fmpFetch(url) {
  return new Promise(resolve => {
    fmpQueue.push({ resolve, url });
    processFmpQueue();
  });
}

export async function fmpProfile(symbol) {
  if (!FMP_KEY) return null;
  const response = await apiClient.call('fmp', 'profile', { symbol }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/fmp/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10) || null;
        throw new ApiHttpError(429, 'FMP rate limit', retryAfter);
      }
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new ApiHttpError(204, 'No profile data');
      const p = data[0];
      return {
        pe:          p.pe ?? null,
        eps:         p.eps ?? null,
        marketCap:   p.marketCap,
        beta:        p.beta,
        lastDiv:     p.lastDividend,
        sector:      p.sector,
        industry:    p.industry,
        description: p.description?.slice(0, 200),
      };
    },
  });
  if (response.deferred) return null;
  return response.data ?? null;
}

export async function fmpRatios(symbol) {
  if (!FMP_KEY) return null;
  const response = await apiClient.call('fmp', 'ratiosTTM', { symbol }, {
    fetcher: async () => {
      const res = await fetch(
        `/api/fmp/ratios-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10) || null;
        throw new ApiHttpError(429, 'FMP rate limit', retryAfter);
      }
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new ApiHttpError(204, 'No ratios data');
      const r = data[0];
      return {
        peRatio:      r.priceToEarningsRatioTTM ?? r.peRatioTTM,
        debtEquity:   r.debtToEquityRatioTTM ?? r.debtEquityRatioTTM,
        roe:          r.returnOnEquityTTM ?? null,
        profitMargin: r.netProfitMarginTTM,
        currentRatio: r.currentRatioTTM,
      };
    },
  });
  if (response.deferred) return null;
  return response.data ?? null;
}

// DORMANT (D-6) — exported for future panel use; not called by any active UI path.
// When activated: replace the inner fmpFetch() call with apiClient.call('fmp', 'dcf', { symbol }, { fetcher }).
export async function fmpDCF(symbol) {
  if (!FMP_KEY) return null;
  const cacheKey = `fmp:dcf:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await fmpFetch(
    `/api/fmp/discounted-cash-flow?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`
  );
  if (data && !data._rateLimited && Array.isArray(data) && data.length > 0) {
    cacheSet(cacheKey, data[0], 21_600_000); // 6hr
    return data[0];
  }
  return null;
}

export async function fmpBatchProfile(symbols) {
  if (!FMP_KEY || !symbols.length) return null;
  const sorted = [...symbols].sort();
  // callCount MUST be passed at the call site — not cached in a variable.
  // apiClient throws synchronously if callCount is absent or 0 (variable-cost contract).
  const response = await apiClient.call('fmp', 'batchProfile', { symbols: sorted }, {
    callCount: symbols.length,
    fetcher: async () => {
      const result = {};
      // Serialize requests — 1 per second to avoid FMP burst 429s
      for (const sym of symbols) {
        const res = await fetch(
          `/api/fmp/profile?symbol=${encodeURIComponent(sym)}&apikey=${FMP_KEY}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10) || null;
          throw new ApiHttpError(429, 'FMP rate limit hit during batch', retryAfter);
        }
        if (res.status === 401 || res.status === 403) throw new ApiHttpError(res.status, res.statusText);
        if (!res.ok) { console.warn(`[FMP] HTTP ${res.status} for ${sym} — skipping`); continue; }
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.symbol) {
          const p = data[0];
          const price = p.price || 0;
          result[p.symbol] = {
            pe:            p.pe ?? null,
            eps:           p.eps ?? null,
            marketCap:     p.marketCap,
            beta:          p.beta,
            lastDiv:       p.lastDividend,
            dividendYield: price > 0 && p.lastDividend ? (p.lastDividend / price) * 100 : 0,
            sector:        p.sector,
            industry:      p.industry,
            description:   p.description?.slice(0, 200),
          };
        }
        // 1s between symbols — stay within FMP burst limit
        if (sym !== symbols[symbols.length - 1]) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      if (!Object.keys(result).length) throw new ApiHttpError(204, 'No usable batch profile data');
      return result;
    },
  });
  // deferred: true means quota was critical — caller receives null and retries later
  if (response.deferred) return null;
  return response.data ?? null;
}

// ─── BRAPI (Brazilian B3 equities) ──────────────────────────────────────────

export function hasBrapiToken() { return !!BRAPI_TOKEN; }

async function brapiQuoteSingle(ticker) {
  const res = await fetch(
    `/api/brapi/quote/${ticker}`,
    {
      signal:  AbortSignal.timeout(10000),
      headers: { 'Authorization': `Bearer ${BRAPI_TOKEN}` },
    }
  );
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    throw new ApiHttpError(res.status, body || res.statusText);
  }
  const data = await res.json();
  const q = data?.results?.[0];
  if (!q?.symbol) return null;
  return {
    symbol: q.symbol,
    quote: {
      price:            q.regularMarketPrice,
      change:           q.regularMarketChange,
      changePct:        q.regularMarketChangePercent,
      prevClose:        q.regularMarketPreviousClose,
      high:             q.regularMarketDayHigh,
      low:              q.regularMarketDayLow,
      volume:           q.regularMarketVolume,
      marketCap:        q.marketCap || null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow:  q.fiftyTwoWeekLow || null,
      longName:         q.longName || q.shortName || null,
      currency:         q.currency || "BRL",
    },
  };
}

export async function brapiQuote(tickers) {
  if (!BRAPI_TOKEN || !tickers.length) return null;
  const sorted = [...tickers].sort();
  const response = await apiClient.call('brapi', 'quote', { tickers: sorted }, {
    fetcher: async () => {
      const result = {};
      for (const ticker of sorted) {
        try {
          const entry = await brapiQuoteSingle(ticker);
          if (entry) result[entry.symbol] = entry.quote;
        } catch (err) {
          console.warn(`[BRAPI] failed for ${ticker}:`, err?.message);
        }
      }
      if (!Object.keys(result).length) throw new ApiHttpError(204, 'No usable quote data');
      return result;
    },
  });
  return response.data ?? null;
}

// ─── BCB — Banco Central do Brasil (no key required) ────────────────────────

const BCB_SERIES = {
  selic: 432,
  ipca:  433,
  cdi:   4389,
};

export async function bcbMacro() {
  // Three independent calls — Promise.allSettled so partial data is valid.
  // Flag B: { selic: 4.75, ipca: null, cdi: 4.65 } is an acceptable return value.
  // Callers must check each key for null before rendering.
  const [selicRes, ipcaRes, cdiRes] = await Promise.allSettled([
    apiClient.call('bcb', 'selic', {}, {
      fetcher: async () => {
        const res = await fetch(
          `/api/bcb/dados/serie/bcdata.sgs.${BCB_SERIES.selic}/dados/ultimos/1?formato=json`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
        const data = await res.json();
        if (!Array.isArray(data) || !data[0]?.valor) throw new ApiHttpError(204, 'No SELIC data');
        return parseFloat(data[0].valor);
      },
    }),
    apiClient.call('bcb', 'ipca', {}, {
      fetcher: async () => {
        const res = await fetch(
          `/api/bcb/dados/serie/bcdata.sgs.${BCB_SERIES.ipca}/dados/ultimos/1?formato=json`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
        const data = await res.json();
        if (!Array.isArray(data) || !data[0]?.valor) throw new ApiHttpError(204, 'No IPCA data');
        return parseFloat(data[0].valor);
      },
    }),
    apiClient.call('bcb', 'cdi', {}, {
      fetcher: async () => {
        const res = await fetch(
          `/api/bcb/dados/serie/bcdata.sgs.${BCB_SERIES.cdi}/dados/ultimos/1?formato=json`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
        const data = await res.json();
        if (!Array.isArray(data) || !data[0]?.valor) throw new ApiHttpError(204, 'No CDI data');
        return parseFloat(data[0].valor);
      },
    }),
  ]);

  // apiClient.call never rejects — allSettled fulfilled status is always 'fulfilled'.
  // Extract data, treating deferred and error responses as null for that key.
  const extract = settled =>
    settled.status === 'fulfilled' && !settled.value.deferred && !settled.value.error
      ? settled.value.data
      : null;

  const result = {
    selic: extract(selicRes),
    ipca:  extract(ipcaRes),
    cdi:   extract(cdiRes),
  };

  // Return null only if all three failed — partial data is valid
  return Object.values(result).some(v => v !== null) ? result : null;
}

// ─── AWESOMEAPI — FX Rates (no key required) ────────────────────────────────

export async function awesomeFx() {
  const response = await apiClient.call('awesomeapi', 'fx', {}, {
    fetcher: async () => {
      const res = await fetch(
        `/api/awesomeapi/last/USD-BRL,EUR-BRL`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
      const data = await res.json();
      const result = {};
      if (data?.USDBRL) {
        result.usdBrl    = parseFloat(data.USDBRL.bid);
        result.usdBrlAsk = parseFloat(data.USDBRL.ask);
        result.usdBrlPct = parseFloat(data.USDBRL.pctChange);
      }
      if (data?.EURBRL) {
        result.eurBrl    = parseFloat(data.EURBRL.bid);
        result.eurBrlPct = parseFloat(data.EURBRL.pctChange);
      }
      if (!Object.keys(result).length) throw new ApiHttpError(204, 'No FX data');
      return result;
    },
  });
  if (response.deferred) return null;
  return response.data ?? null;
}

// ─── YAHOO MARKET DATA (GMT-1 Step A: extracted from GlobalMarketsTerminal.jsx) ──────────────────
// Static maps (ASSETS, VOLATILITY, isEquityCat) are passed as params — not imported here.
// Step B will wrap the Yahoo fetch calls with apiClient.call('yahoo', 'quote', ...).

function generateSparkline(basePrice, vol, points = 30) {
  if (!basePrice || !isFinite(basePrice)) return [];
  const arr = [basePrice];
  for (let i = 1; i < points; i++) {
    const prev = arr[i - 1];
    arr.push(prev + prev * vol * (Math.random() - 0.48));
  }
  return arr;
}

function parseYahooResults(results, prevData, assets, volatility) {
  const data = {};
  results.forEach((q) => {
    const sym = q.symbol;
    if (!assets[sym]) return;
    const prevSparkline = prevData?.[sym]?.sparkline;
    let sparkline;
    if (prevSparkline && prevSparkline.length >= 30) {
      sparkline = [...prevSparkline.slice(1), q.regularMarketPrice];
    } else {
      sparkline = generateSparkline(
        q.regularMarketPreviousClose || q.regularMarketPrice,
        volatility[assets[sym].cat] * 0.3
      );
      sparkline[sparkline.length - 1] = q.regularMarketPrice;
    }
    data[sym] = {
      price:            q.regularMarketPrice,
      change:           q.regularMarketChange,
      changePct:        q.regularMarketChangePercent,
      prevClose:        q.regularMarketPreviousClose,
      high:             q.regularMarketDayHigh,
      low:              q.regularMarketDayLow,
      volume:           q.regularMarketVolume,
      marketCap:        q.marketCap,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow:  q.fiftyTwoWeekLow,
      sparkline,
    };
  });
  return data;
}

/**
 * Fetch equity/index/fx market data from Yahoo Finance with corsproxy/allorigins fallbacks,
 * then fall back to Finnhub for key equity symbols.
 *
 * @param {string[]} yahooSymbols - Pre-filtered symbols (no crypto, no B3)
 * @param {Object|null} prevData - Previous data snapshot for sparkline rolling
 * @param {{ assets: Object, volatility: Object, isEquityCat: Function }} maps
 * @returns {Promise<{ data: Object|null, source: string }>}
 */
export async function fetchYahooMarketData(yahooSymbols, prevData, { assets, volatility, isEquityCat }) {
  const sorted    = [...yahooSymbols].sort();
  const symbols   = yahooSymbols.join(",");
  const yahooPath = `/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  const yahooUrl  = `https://query1.finance.yahoo.com${yahooPath}`;

  // Fetcher returns the raw results array — parseYahooResults runs after apiClient.call
  // so sparkline rolling always uses the current prevData (not a stale cached version).
  const response = await apiClient.call('yahoo', 'quote', { symbols: sorted }, {
    fetcher: async () => {
      const urls = [
        `/api/yahoo${yahooPath}`,
        `https://corsproxy.io/?url=${encodeURIComponent(yahooUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      ];
      for (const url of urls) {
        try {
          const res     = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (!res.ok) continue;
          const json    = await res.json();
          const results = json?.quoteResponse?.result;
          if (results?.length) return results;
        } catch (_) { /* try next url */ }
      }
      throw new ApiHttpError(503, 'Yahoo Finance unavailable via all proxy routes');
    },
  });

  // Parse raw results (applies sparkline rolling with current prevData — works on cache hits too)
  if (response.data?.length) {
    const data = parseYahooResults(response.data, prevData, assets, volatility);
    if (Object.keys(data).length >= 20) return { data, source: "live" };
  }

  // Yahoo had insufficient data — fall back to Finnhub for key equities
  if (hasFinnhubKey()) {
    try {
      const equitySymbols = Object.keys(assets).filter(s => isEquityCat(assets[s].cat));
      const fbData = {};
      for (const sym of equitySymbols.slice(0, 24)) {
        const q = await finnhubQuote(sym);
        if (q && q.c) {
          const prev = q.pc || q.c;
          fbData[sym] = {
            price: q.c, change: q.d || (q.c - prev), changePct: q.dp || ((q.c - prev) / prev * 100),
            prevClose: prev, high: q.h || q.c, low: q.l || q.c,
            volume: null, marketCap: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null,
            sparkline: generateSparkline(prev, (volatility[assets[sym].cat] || 0.015) * 0.3),
          };
        }
      }
      if (Object.keys(fbData).length >= 8) return { data: fbData, source: "finnhub-fallback" };
    } catch (_) { /* Finnhub fallback also failed */ }
  }

  return { data: null, source: "unavailable" };
}

/// ─── B3 MARKET DATA (GMT-3: extracted + migrated from GlobalMarketsTerminal.jsx) ───────────────

/**
 * Fetch B3 (Brazilian) market data from BRAPI with Yahoo .SA suffix fallback.
 *
 * @param {Array<[string, Object]>} b3Assets - Object.entries(ASSETS).filter(([,a]) => a.isB3)
 * @param {{ assets: Object, volatility: Object }} maps
 * @returns {Promise<Record<string, Object>>} Empty object on full failure (never null)
 */
export async function fetchB3MarketData(b3Assets, { assets, volatility }) {
  if (b3Assets.length === 0) return {};

  // Try BRAPI first
  if (hasBrapiToken()) {
    const tickers = b3Assets.map(([sym]) => sym);
    const data = await brapiQuote(tickers);
    if (data && Object.keys(data).length > 0) {
      const result = {};
      for (const [sym] of b3Assets) {
        const q = data[sym];
        if (!q) continue;
        const prevClose = q.prevClose || q.price;
        result[sym] = {
          price:            q.price,
          change:           q.change ?? (q.price - prevClose),
          changePct:        q.changePct ?? ((q.price - prevClose) / prevClose * 100),
          prevClose,
          high:             q.high || q.price,
          low:              q.low || q.price,
          volume:           q.volume || null,
          marketCap:        q.marketCap || null,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || null,
          fiftyTwoWeekLow:  q.fiftyTwoWeekLow || null,
          sparkline:        generateSparkline(prevClose, (volatility.brasil || 0.018) * 0.3),
          source:           "brapi",
        };
      }
      if (Object.keys(result).length >= 5) return result;
    }
  }

  // Fallback: Yahoo Finance with .SA suffix (GMT-3 Step B: wrapped with apiClient.call)
  try {
    const saList    = b3Assets.map(([sym]) => sym + ".SA");
    const saSorted  = [...saList].sort();
    const saSymbols = saList.join(",");
    const yahooPath = `/v7/finance/quote?symbols=${encodeURIComponent(saSymbols)}`;
    const response  = await apiClient.call('yahoo', 'quote', { symbols: saSorted }, {
      fetcher: async () => {
        const res = await fetch(`/api/yahoo${yahooPath}`, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new ApiHttpError(res.status, res.statusText);
        const json    = await res.json();
        const results = json?.quoteResponse?.result;
        if (!results?.length) throw new ApiHttpError(204, 'No B3 .SA results from Yahoo');
        return results;
      },
    });
    if (response.data?.length) {
      const data = {};
      response.data.forEach(q => {
        const sym = q.symbol.replace(".SA", "");
        if (!assets[sym]) return;
        data[sym] = {
          price:            q.regularMarketPrice,
          change:           q.regularMarketChange,
          changePct:        q.regularMarketChangePercent,
          prevClose:        q.regularMarketPreviousClose,
          high:             q.regularMarketDayHigh,
          low:              q.regularMarketDayLow,
          volume:           q.regularMarketVolume,
          marketCap:        q.marketCap || null,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || null,
          fiftyTwoWeekLow:  q.fiftyTwoWeekLow || null,
          sparkline:        generateSparkline(q.regularMarketPreviousClose || q.regularMarketPrice, (volatility.brasil || 0.018) * 0.3),
          source:           "yahoo-sa",
        };
      });
      if (Object.keys(data).length) return data;
    }
  } catch (_) { /* Yahoo .SA fallback failed */ }

  return {};
}

// ─── YAHOO CHART DATA (GMT-2: extracted + migrated from GlobalMarketsTerminal.jsx) ──────────────

/**
 * Fetch historical OHLCV chart data from Yahoo Finance for a single symbol.
 * Tries the local proxy first, then two public CORS proxies as fallback.
 * Throws Error("Chart data unavailable") when all routes fail or quota is critical (deferred).
 *
 * @param {string} symbol   - Internal symbol key (e.g. "PETR4", "AAPL")
 * @param {string} range    - Yahoo range string (e.g. "1d", "1mo", "1y")
 * @param {string} interval - Yahoo interval string (e.g. "5m", "1d")
 * @param {{ assets: Object }} maps
 * @returns {Promise<{ points: Array<{t:number,v:number}>, change: number, changePct: number }>}
 */
export async function fetchYahooChartData(symbol, range, interval, { assets }) {
  // B3 stocks need .SA suffix for Yahoo chart data
  const chartSymbol = assets[symbol]?.isB3 ? symbol + ".SA" : symbol;
  const yahooPath = `/v8/finance/chart/${encodeURIComponent(chartSymbol)}?range=${range}&interval=${interval}`;
  const yahooUrl  = `https://query1.finance.yahoo.com${yahooPath}`;

  const response = await apiClient.call('yahoo', 'chart', { symbol, range, interval }, {
    fetcher: async () => {
      const urls = [
        `/api/yahoo/v8/finance/chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`,
        `https://corsproxy.io/?url=${encodeURIComponent(yahooUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!res.ok) continue;
          const json   = await res.json();
          const result = json?.chart?.result?.[0];
          if (!result) continue;
          const timestamps = result.timestamp || [];
          const closes     = result.indicators?.quote?.[0]?.close || [];
          const points     = timestamps
            .map((t, i) => ({ t: t * 1000, v: closes[i] }))
            .filter((p) => p.v != null);
          if (points.length < 2) continue;
          const first = points[0].v;
          const last  = points[points.length - 1].v;
          return { points, change: last - first, changePct: ((last - first) / first) * 100 };
        } catch (_) { /* try next proxy */ }
      }
      throw new ApiHttpError(503, 'Yahoo chart unavailable via all proxy routes');
    },
  });

  if (response.deferred || !response.data) throw new Error("Chart data unavailable");
  return response.data;
}

// ─── HEALTH CHECKS & USAGE TRACKING ─────────────────────────────────────────

export function trackApiCall(source) {
  try {
    const raw = sessionStorage.getItem("api:usage");
    const usage = raw ? JSON.parse(raw) : {};
    usage[source] = (usage[source] || 0) + 1;
    sessionStorage.setItem("api:usage", JSON.stringify(usage));
  } catch { /* ignore */ }
}

export function getApiUsage() {
  try {
    const raw = sessionStorage.getItem("api:usage");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function getHealthHistory(source) {
  try {
    const raw = sessionStorage.getItem(`health:hist:${source}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function pushHealthHistory(source, success) {
  try {
    const hist = getHealthHistory(source);
    hist.push(success);
    if (hist.length > 10) hist.shift();
    sessionStorage.setItem(`health:hist:${source}`, JSON.stringify(hist));
  } catch { /* ignore */ }
}

// APILIENT EXEMPTION — healthPing intentionally bypasses apiClient.call().
// Reason: it is a diagnostic probe, not a data-fetching call. Its purpose is to
// measure raw endpoint reachability and latency. Routing it through apiClient would:
//   1. Pollute quota counters with synthetic traffic
//   2. Trigger deferred/backpressure logic on the very function used to detect outages
//   3. Cache results that must always be fresh to reflect real-time status
// healthPing calls are tracked via trackApiCall() for display only — not quota-managed.
export async function healthPing(source) {
  const endpoints = {
    yahoo:        "/api/yahoo/v7/finance/quote?symbols=AAPL",
    finnhub:      FINNHUB_KEY ? `/api/finnhub/quote?symbol=AAPL&token=${FINNHUB_KEY}` : null,
    alphaVantage: AV_KEY ? `/api/alphavantage/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${AV_KEY}` : null,
    fred:         FRED_KEY ? `/api/fred/series/observations?series_id=DGS10&sort_order=desc&limit=1&file_type=json&api_key=${FRED_KEY}` : null,
    coingecko:    "/api/coingecko/ping",
    fmp:          FMP_KEY ? `/api/fmp/profile?symbol=AAPL&apikey=${FMP_KEY}` : null,
    brapi:        BRAPI_TOKEN ? `/api/brapi/quote/PETR4?token=${BRAPI_TOKEN}` : null,
    bcb:          "/api/bcb/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
    awesomeapi:   "/api/awesomeapi/last/USD-BRL",
  };
  const url = endpoints[source];
  if (!url) {
    pushHealthHistory(source, false);
    return { status: "outage", responseTime: 0, error: "API key not configured", timestamp: Date.now(), rawValue: null };
  }
  const start = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const elapsed = Math.round(performance.now() - start);
    if (!res.ok) {
      pushHealthHistory(source, false);
      if (res.status === 429) {
        return { status: "rate-limited", responseTime: elapsed, error: "HTTP 429 — rate limit exceeded. Requests will auto-retry with backoff.", timestamp: Date.now(), rawValue: null };
      }
      const status = res.status >= 500 ? "outage" : "degraded";
      return { status, responseTime: elapsed, error: `HTTP ${res.status}`, timestamp: Date.now(), rawValue: null };
    }
    const json = await res.json();
    let rawValue = null;
    if (source === "yahoo") rawValue = json?.quoteResponse?.result?.[0]?.regularMarketPrice;
    else if (source === "finnhub") rawValue = json?.c;
    else if (source === "alphaVantage") rawValue = json?.["Global Quote"]?.["05. price"];
    else if (source === "fred") rawValue = json?.observations?.[0]?.value;
    else if (source === "coingecko") rawValue = json?.gecko_says || "OK";
    else if (source === "fmp") rawValue = Array.isArray(json) ? json[0]?.price : null;
    else if (source === "brapi") rawValue = json?.results?.[0]?.regularMarketPrice;
    else if (source === "bcb") rawValue = Array.isArray(json) ? json[0]?.valor : null;
    else if (source === "awesomeapi") rawValue = json?.USDBRL?.bid || null;
    trackApiCall(source);
    pushHealthHistory(source, true);
    return { status: "operational", responseTime: elapsed, error: null, timestamp: Date.now(), rawValue };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    pushHealthHistory(source, false);
    return { status: "outage", responseTime: elapsed, error: err.message, timestamp: Date.now(), rawValue: null };
  }
}

// ─── SOURCE AVAILABILITY ─────────────────────────────────────────────────────
// Used by the Catalog page to show which sources are configured.

export function getSourceStatus() {
  return {
    yahoo:       { active: true,  keyRequired: false, hasKey: true },
    finnhub:     { active: !!FINNHUB_KEY, keyRequired: true, hasKey: !!FINNHUB_KEY },
    alphaVantage:{ active: !!AV_KEY,      keyRequired: true, hasKey: !!AV_KEY },
    fred:        { active: !!FRED_KEY,    keyRequired: true, hasKey: !!FRED_KEY },
    coingecko:   { active: true,  keyRequired: false, hasKey: true },
    fmp:         { active: !!FMP_KEY,     keyRequired: true, hasKey: !!FMP_KEY },
    brapi:       { active: !!BRAPI_TOKEN,  keyRequired: true, hasKey: !!BRAPI_TOKEN },
    bcb:         { active: true,  keyRequired: false, hasKey: true },
    awesomeapi:  { active: true,  keyRequired: false, hasKey: true },
  };
}
