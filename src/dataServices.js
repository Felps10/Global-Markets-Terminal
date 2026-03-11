// ─── DATA SERVICES ───────────────────────────────────────────────────────────
// Centralized data layer for all external API integrations.
// Each source has its own fetch helpers, rate-limit guards, and caching.

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
  const cacheKey = `fh:quote:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await finnhubFetch(
    `/api/finnhub/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
  );
  if (data && data.c) {
    cacheSet(cacheKey, data, 30_000); // 30s cache
    return data;
  }
  return null;
}

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
  const cacheKey = `fh:news:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const now = new Date();
  const from = new Date(now - 7 * 86400_000).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  const data = await finnhubFetch(
    `/api/finnhub/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
  );
  if (data && Array.isArray(data)) {
    const sliced = data.slice(0, 5);
    cacheSet(cacheKey, sliced, 600_000); // 10min cache
    return sliced;
  }
  return null;
}

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
  const cacheKey = `fh:rec:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await finnhubFetch(
    `/api/finnhub/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
  );
  if (data && Array.isArray(data) && data.length > 0) {
    const latest = data[0];
    cacheSet(cacheKey, latest, 3600_000);
    return latest;
  }
  return null;
}

// ─── ALPHA VANTAGE (25 calls/day — ON DEMAND ONLY) ──────────────────────────
// NEVER called on page load. Only triggered by explicit user action.

export function hasAlphaVantageKey() { return !!AV_KEY; }

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
  const cacheKey = `fred:${seriesKey}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/fred/series/observations?series_id=${cfg.id}&sort_order=desc&limit=12&file_type=json&api_key=${FRED_KEY}`,
    {}, "FRED"
  );
  if (data && data.observations) {
    const result = {
      ...cfg,
      observations: data.observations
        .filter(o => o.value !== ".")
        .slice(0, 12)
        .map(o => ({ date: o.date, value: parseFloat(o.value) })),
    };
    cacheSet(cacheKey, result, 3600_000); // 1hr cache
    return result;
  }
  return null;
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
  const cacheKey = `cg:prices:${ids}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/coingecko/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
    {}, "CoinGecko"
  );
  if (data && Object.keys(data).length > 0) {
    cacheSet(cacheKey, data, 120_000); // 2min cache
    return data;
  }
  return null;
}

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
// Profile/Ratios called on panel open; batch profile used once for dividend screening.

export function hasFmpKey() { return !!FMP_KEY; }

export async function fmpProfile(symbol) {
  if (!FMP_KEY) return null;
  const cacheKey = `fmp:profile:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/fmp/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
    {}, "FMP"
  );
  if (data && Array.isArray(data) && data.length > 0) {
    const p = data[0];
    const result = {
      pe:           p.pe ?? null,
      eps:          p.eps ?? null,
      marketCap:    p.marketCap,
      beta:         p.beta,
      lastDiv:      p.lastDividend,
      sector:       p.sector,
      industry:     p.industry,
      description:  p.description?.slice(0, 200),
    };
    cacheSet(cacheKey, result, 3600_000); // 1hr cache
    return result;
  }
  return null;
}

export async function fmpRatios(symbol) {
  if (!FMP_KEY) return null;
  const cacheKey = `fmp:ratios:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/fmp/ratios-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
    {}, "FMP"
  );
  if (data && Array.isArray(data) && data.length > 0) {
    const r = data[0];
    const result = {
      peRatio:        r.priceToEarningsRatioTTM ?? r.peRatioTTM,
      debtEquity:     r.debtToEquityRatioTTM ?? r.debtEquityRatioTTM,
      roe:            r.returnOnEquityTTM ?? null,
      profitMargin:   r.netProfitMarginTTM,
      currentRatio:   r.currentRatioTTM,
    };
    cacheSet(cacheKey, result, 3600_000);
    return result;
  }
  return null;
}

export async function fmpDCF(symbol) {
  if (!FMP_KEY) return null;
  const cacheKey = `fmp:dcf:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/fmp/discounted-cash-flow?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
    {}, "FMP"
  );
  if (data && Array.isArray(data) && data.length > 0) {
    cacheSet(cacheKey, data[0], 3600_000);
    return data[0];
  }
  return null;
}

export async function fmpBatchProfile(symbols) {
  if (!FMP_KEY || !symbols.length) return null;
  const sorted = [...symbols].sort();
  const cacheKey = `fmp:batch:${sorted.join(",")}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const result = {};
  // FMP /stable/ does not support comma-separated batch — call individually
  // Process in parallel chunks of 5 to avoid rate limiting
  for (let i = 0; i < symbols.length; i += 5) {
    const chunk = symbols.slice(i, i + 5);
    const responses = await Promise.all(
      chunk.map(sym =>
        safeFetch(`/api/fmp/profile?symbol=${encodeURIComponent(sym)}&apikey=${FMP_KEY}`, {}, "FMP")
      )
    );
    responses.forEach(data => {
      if (data && Array.isArray(data) && data[0]) {
        const p = data[0];
        if (!p.symbol) return;
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
    });
  }
  if (Object.keys(result).length > 0) {
    cacheSet(cacheKey, result, 3600_000); // 1hr cache
    return result;
  }
  return null;
}

// ─── BRAPI (Brazilian B3 equities) ──────────────────────────────────────────

export function hasBrapiToken() { return !!BRAPI_TOKEN; }

export async function brapiQuote(tickers) {
  if (!BRAPI_TOKEN || !tickers.length) return null;
  const sorted = [...tickers].sort();
  const cacheKey = `brapi:quote:${sorted.join(",")}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const tickerStr = tickers.join(",");
  const data = await safeFetch(
    `/api/brapi/quote/${encodeURIComponent(tickerStr)}?token=${BRAPI_TOKEN}`,
    {}, "BRAPI"
  );
  if (data && data.results && data.results.length > 0) {
    const result = {};
    data.results.forEach(q => {
      if (!q.symbol) return;
      result[q.symbol] = {
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
      };
    });
    if (Object.keys(result).length > 0) {
      cacheSet(cacheKey, result, 30_000); // 30s cache
      return result;
    }
  }
  return null;
}

// ─── BCB — Banco Central do Brasil (no key required) ────────────────────────

const BCB_SERIES = {
  selic: 432,
  ipca:  433,
  cdi:   4389,
};

export async function bcbMacro() {
  const cacheKey = "bcb_macro_cache";
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const result = {};
  const entries = Object.entries(BCB_SERIES);
  const responses = await Promise.all(
    entries.map(([key, code]) =>
      safeFetch(`/api/bcb/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`, {}, "BCB")
        .then(data => ({ key, data }))
    )
  );
  responses.forEach(({ key, data }) => {
    if (data && Array.isArray(data) && data.length > 0) {
      result[key] = parseFloat(data[0].valor);
    }
  });
  if (Object.keys(result).length > 0) {
    cacheSet(cacheKey, result, 3600_000); // 1hr cache
    return result;
  }
  return null;
}

// ─── AWESOMEAPI — FX Rates (no key required) ────────────────────────────────

export async function awesomeFx() {
  const cacheKey = "awesomeapi_fx_cache";
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await safeFetch(
    `/api/awesomeapi/last/USD-BRL,EUR-BRL`,
    {}, "AwesomeAPI"
  );
  if (data) {
    const result = {};
    if (data.USDBRL) {
      result.usdBrl = parseFloat(data.USDBRL.bid);
      result.usdBrlAsk = parseFloat(data.USDBRL.ask);
      result.usdBrlPct = parseFloat(data.USDBRL.pctChange);
    }
    if (data.EURBRL) {
      result.eurBrl = parseFloat(data.EURBRL.bid);
      result.eurBrlPct = parseFloat(data.EURBRL.pctChange);
    }
    if (Object.keys(result).length > 0) {
      cacheSet(cacheKey, result, 900_000); // 15min cache
      return result;
    }
  }
  return null;
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
      return { status: "degraded", responseTime: elapsed, error: `HTTP ${res.status}`, timestamp: Date.now(), rawValue: null };
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
