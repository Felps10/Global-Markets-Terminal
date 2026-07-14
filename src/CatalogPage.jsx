import { useState, useEffect, useCallback, useRef, Component } from "react";
import {
  getSourceStatus, healthPing, getApiUsage,
  getHealthHistory,
} from "./dataServices.js";
import { quotaTracker } from './services/quotaTracker.js';
import { getCacheStats } from './services/apiCache.js';
import { apiClient } from './services/apiClient.js';
import { getAllApiIds, getApiDef, getDormantEndpoints } from './services/apiRegistry.js';

// ─── SHARED STYLES ───────────────────────────────────────────────────────────

const mono = "'JetBrains Mono', monospace";
const sans = "'IBM Plex Sans', sans-serif";

// ─── ERROR BOUNDARY ─────────────────────────────────────────────────────────

class PanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[DataPointPanel crash]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--c-error)", marginBottom: 12 }}>
            Something went wrong loading this data point. Please try again.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              fontFamily: mono, fontSize: 10, color: "var(--c-text-2)",
              background: "var(--c-surface)", border: "1px solid var(--c-border)",
              borderRadius: 6, padding: "6px 16px", cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── SOURCE CONFIG ───────────────────────────────────────────────────────────

const SOURCE_COLORS = {
  eodhd:        "#4F46E5",
  yahoo:        "#7B1FA2",
  finnhub:      "#00BCD4",
  alphaVantage: "#FF9100",
  fred:         "#1565C0",
  coingecko:    "#8BC34A",
  fmp:          "#E91E63",
  brapi:        "#009C3B",
  bcb:          "#003087",
  awesomeapi:   "#FF6B00",
};

const SOURCE_LABELS = {
  eodhd:        "EODHD",
  yahoo:        "Yahoo Finance",
  finnhub:      "Finnhub",
  alphaVantage: "Alpha Vantage",
  fred:         "FRED",
  coingecko:    "CoinGecko",
  fmp:          "FMP",
  brapi:        "BRAPI",
  bcb:          "BCB",
  awesomeapi:   "AwesomeAPI",
  synthetic:    "Synthetic",
};

const ALL_SOURCES = ["eodhd", "yahoo", "finnhub", "alphaVantage", "fred", "coingecko", "fmp", "brapi", "bcb", "awesomeapi"];

const SOURCE_META = {
  eodhd: {
    rateLimit: "100k calls/day (plan)", rateLimitMax: null, rateLimitPer: null,
    coverage: "Global equities, indices, FX & ETFs", freshness: "~15–20 min delayed",
    assetClasses: ["Equities", "Indices", "Forex", "ETFs"], geo: "Global · server-side",
    docUrl: "https://eodhd.com/financial-apis",
    healthEndpoint: "server-side · /api/v1/quotes/live",
    note: "PRIMARY global quote provider (All-World). Fetched server-side by the quote engine and merged ahead of Yahoo. API-key authenticated — no IP blocking. Does not cover commodities (Yahoo serves those). Health is measured on the backend, not client-probed.",
    fallbackSuggestion: "Yahoo Finance",
    serverSide: true,
    tier: "paid",
  },
  yahoo: {
    rateLimit: "Unlimited (proxy)", rateLimitMax: null, rateLimitPer: null,
    coverage: "Fallback for global quotes · primary for commodities & charts", freshness: "~15 min delayed",
    assetClasses: ["Equities", "Indices", "Forex", "Commodities"], geo: "Global",
    docUrl: "https://finance.yahoo.com",
    healthEndpoint: "/proxy/yahoo/v7/finance/quote?symbols=AAPL",
    note: "Unofficial scraping-based source — now the LAST-RESORT fallback only, behind FMP/EODHD/BRAPI for every class (quotes AND charts). Still the live-quote fallback for WTI/natgas (CL=F/NG=F), which have no paid single-quote. No API key; may break without notice.",
    fallbackSuggestion: "EODHD is the primary; Yahoo backfills what EODHD does not return",
  },
  finnhub: {
    rateLimit: "60 calls/min", rateLimitMax: getApiDef('finnhub')?.limits.perMinute ?? 60, rateLimitPer: "minute",
    coverage: "US equities", freshness: "Real-time",
    assetClasses: ["Equities", "Sentiment", "News"], geo: "US",
    docUrl: "https://finnhub.io/docs/api",
    keyRegistrationUrl: "https://finnhub.io",
    healthEndpoint: "/proxy/finnhub/quote?symbol=AAPL",
    note: null, fallbackSuggestion: null,
  },
  alphaVantage: {
    rateLimit: "25 calls/day", rateLimitMax: getApiDef('alphavantage')?.limits.perDay ?? 25, rateLimitPer: "day",
    coverage: "US equities technicals", freshness: "15min delay",
    assetClasses: ["Technicals"], geo: "US",
    docUrl: "https://www.alphavantage.co/documentation/",
    keyRegistrationUrl: "https://www.alphavantage.co/support/#api-key",
    healthEndpoint: "/proxy/alphavantage/query?function=GLOBAL_QUOTE&symbol=AAPL",
    note: "On-demand only — never called on page load", fallbackSuggestion: null,
  },
  fred: {
    rateLimit: "Unlimited", rateLimitMax: null, rateLimitPer: null,
    coverage: "US macroeconomic data", freshness: "Daily / Monthly",
    assetClasses: ["Macro"], geo: "US",
    docUrl: "https://fred.stlouisfed.org/docs/api/fred/",
    keyRegistrationUrl: "https://fred.stlouisfed.org/docs/api/api_key.html",
    healthEndpoint: "/proxy/fred/series/observations?series_id=DGS10&limit=1",
    note: "Most reliable source — unlimited calls, high availability",
    fallbackSuggestion: null,
  },
  coingecko: {
    rateLimit: "30 calls/min", rateLimitMax: getApiDef('coingecko')?.limits.perMinute ?? 30, rateLimitPer: "minute",
    coverage: "Cryptocurrency markets", freshness: "Real-time",
    assetClasses: ["Crypto"], geo: "Global",
    docUrl: "https://www.coingecko.com/api/documentation",
    healthEndpoint: "/proxy/coingecko/ping",
    note: "No API key required", fallbackSuggestion: null,
  },
  fmp: {
    rateLimit: "Premium · 750 calls/min", rateLimitMax: getApiDef('fmp')?.limits.perMinute ?? 750, rateLimitPer: "minute",
    coverage: "US equities/ETFs/FX quotes + fundamentals", freshness: "Real-time",
    assetClasses: ["Equities", "FX", "Fundamentals", "Valuation"], geo: "US + global",
    docUrl: "https://financialmodelingprep.com/developer/docs",
    keyRegistrationUrl: "https://financialmodelingprep.com/developer",
    healthEndpoint: "server-side · /api/v1/fmp/profile?symbol=AAPL",
    note: "PRIMARY real-time quote source for equities/ETFs/FX (+ gold/silver + ^FTSE) and fundamentals. Premium tier — 750/min, no daily cap.",
    fallbackSuggestion: null,
    tier: "paid",
  },
  brapi: {
    rateLimit: "Pro · 20 tickers/req · 5-min", rateLimitMax: null, rateLimitPer: null,
    coverage: "Brazil B3 equities, FIIs & ETFs", freshness: "~5 min (Pro)",
    assetClasses: ["Equities", "FIIs", "ETFs"], geo: "Brazil",
    docUrl: "https://brapi.dev/docs",
    keyRegistrationUrl: "https://brapi.dev",
    healthEndpoint: "server-side · /api/v1/quotes/brazil",
    note: "PRIMARY source for Brazil B3. Served server-side via BRAPI Pro (batch 20/req, 5-min) with a Yahoo .SA fallback; a client path also exists for the Terminal Mini ticker. Health here reflects the server BRAPI Pro feed.",
    fallbackSuggestion: "Yahoo Finance with .SA suffix",
    serverSide: true,
    tier: "paid",
  },
  bcb: {
    rateLimit: "Unlimited", rateLimitMax: null, rateLimitPer: null,
    coverage: "Brazilian macro indicators — SELIC, IPCA, CDI", freshness: "Daily (SELIC), Monthly (IPCA, CDI)",
    assetClasses: ["Macro"], geo: "Brazil",
    docUrl: "https://dadosabertos.bcb.gov.br",
    keyRegistrationUrl: "https://dadosabertos.bcb.gov.br",
    healthEndpoint: "/proxy/bcb/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
    note: "Official Brazilian Central Bank API — no key required, unlimited access",
    fallbackSuggestion: null,
  },
  awesomeapi: {
    rateLimit: "Free, no key required", rateLimitMax: null, rateLimitPer: null,
    coverage: "Brazilian Real exchange rates — USD/BRL, EUR/BRL", freshness: "Real-time (15min local cache)",
    assetClasses: ["FX"], geo: "Brazil",
    docUrl: "https://docs.awesomeapi.com.br",
    keyRegistrationUrl: "https://docs.awesomeapi.com.br",
    healthEndpoint: "/proxy/awesomeapi/last/USD-BRL",
    note: "Unauthenticated requests cached 1 minute by provider — no key required",
    fallbackSuggestion: null,
  },
};

// ─── SOURCE DETAIL DATA ──────────────────────────────────────────────────────
// Honest descriptive metadata shown in the source detail drawer. Uptime %, latency,
// null/duplicate rates and incident logs were previously hard-coded mock values and
// have been removed — the drawer now shows only live reachability checks run from the
// browser (see healthPing / getHealthHistory). Reinstate real metrics only when a
// health/observability backend is wired.
const SOURCE_DETAIL_DATA = {
  eodhd: {
    description: "EODHD (EOD Historical Data — All-World plan) is the primary global quote provider, fetched server-side by the quote engine and merged ahead of Yahoo. It covers global equities (incl. ADRs), indices, FX pairs and ETFs via API-key authentication, so it is not subject to the IP blocking that affected scraped Yahoo. Quotes are ~15–20 min delayed, which is acceptable for a monitoring terminal. It does not cover commodities — Yahoo remains primary there.",
    type: "HTTP REST API (server-side)", owner: "EOD Historical Data Ltd.", domain: "Global Market Data",
    tags: ["Primary", "Equities", "Indices", "Forex", "ETFs", "Server-side"],
    endpoint: "eodhd.com/api → GET /api/v1/quotes/live", authType: "API Key (server-side, EODHD_API_KEY)",
    refreshCadence: "~180s server cycle (batch ≤20 symbols/req)", lastSuccessfulSync: "Managed server-side",
  },
  yahoo: {
    description: "Yahoo Finance is an unofficial, scraping-based market data source accessed via an Express proxy. It is now the LAST-RESORT fallback only — FMP Premium is primary for equities/FX/metals, EODHD for indices, BRAPI Pro for B3, and charts run on FMP/BRAPI/EODHD (no longer Yahoo). Its only remaining primary role is the live quote for WTI/natgas (CL=F/NG=F), which have no paid single-quote (their charts use the USO/UNG ETF proxy). Because it has no official API contract, the schema may change without notice and datacenter IPs get rate-limited — the reason the paid FMP/EODHD/BRAPI migration happened.",
    type: "HTTP REST (Unofficial / Proxy)", owner: "Yahoo Finance", domain: "Market Data",
    tags: ["Fallback", "Commodities", "Charts", "Unofficial"],
    endpoint: "server engine + /proxy/yahoo → finance.yahoo.com", authType: "None (proxy tunnels requests)",
    refreshCadence: "~120s server cycle; charts on demand", lastSuccessfulSync: "Continuous (server cycle)",
  },
  finnhub: {
    description: "Finnhub is a professional-grade market data REST API. In this app it is the source for analyst consensus recommendations and company news in the detail panel (on demand), and a legacy equity-quote fallback. It is not part of the live quote precedence engine. API key required.",
    type: "HTTP REST API", owner: "Finnhub.io", domain: "Market Data / Sentiment",
    tags: ["Sentiment", "News", "Analyst", "On-demand"],
    endpoint: "https://finnhub.io/api/v1 (via proxy)", authType: "API Key (query param: token=...)",
    refreshCadence: "On demand; queue limited to 1 req/sec", lastSuccessfulSync: "On demand",
  },
  alphaVantage: {
    description: "Alpha Vantage provides US equity technical indicators including RSI, MACD, Bollinger Bands, and moving averages with a 25-call daily quota on the free tier. To preserve this strict quota, it is never called automatically on page load — all calls are triggered explicitly by user actions. Results are cached in sessionStorage for 24 hours.",
    type: "HTTP REST API", owner: "Alpha Vantage Inc.", domain: "Technical Indicators",
    tags: ["Technicals", "RSI", "MACD", "On-demand", "Cached"],
    endpoint: "https://www.alphavantage.co/query (via proxy)", authType: "API Key (query param: apikey=...)",
    refreshCadence: "On demand only — never auto-called", lastSuccessfulSync: "Session cached (24h TTL)",
  },
  fred: {
    description: "The Federal Reserve Economic Data (FRED) API is maintained by the St. Louis Fed and provides thousands of US macroeconomic time series — including CPI, GDP, Federal Funds Rate, unemployment, Treasury yields, mortgage rates, and consumer sentiment. Free with an API key and effectively unlimited for dashboard use.",
    type: "HTTP REST API (Government)", owner: "Federal Reserve Bank of St. Louis", domain: "Macroeconomics",
    tags: ["Macro", "US", "CPI", "GDP", "Interest Rates", "Official"],
    endpoint: "https://api.stlouisfed.org/fred (via proxy)", authType: "API Key (query param: api_key=...)",
    refreshCadence: "Hourly sessionStorage cache", lastSuccessfulSync: "On demand (cached)",
  },
  coingecko: {
    description: "CoinGecko is the leading public cryptocurrency data API, providing real-time prices, 24h changes, market caps, and trading volumes for the top cryptocurrencies. No API key is required on the free tier. The engine tracks Bitcoin, Ethereum, and Solana, with caching to stay within the 30 calls/min free limit.",
    type: "HTTP REST API (Public)", owner: "CoinGecko Pte. Ltd.", domain: "Cryptocurrency",
    tags: ["Crypto", "Primary", "No Auth", "Market Cap", "Volume"],
    endpoint: "https://api.coingecko.com/api/v3 (via proxy)", authType: "None (public endpoint)",
    refreshCadence: "~120s server cycle; 2-min cache", lastSuccessfulSync: "Continuous (server cycle)",
  },
  fmp: {
    description: "Financial Modeling Prep (FMP) Premium via the /stable API is the licensed primary real-time source for US equity/ETF/FX quotes (feeding the quote engine) plus fundamentals — P/E, EPS, margins, debt/equity, ROE, beta, dividend yield, and DCF. Premium allows 750 calls/min with no daily cap, so on-demand detail-panel and batch calls run without the old free-tier rationing.",
    type: "HTTP REST API", owner: "Financial Modeling Prep", domain: "Fundamentals / Valuation",
    tags: ["Fundamentals", "P/E", "EPS", "DCF", "Dividends", "On-demand"],
    endpoint: "https://financialmodelingprep.com/stable (via proxy)", authType: "API Key (query param: apikey=...)",
    refreshCadence: "On demand (panel open) + 1 batch call on page load", lastSuccessfulSync: "On demand",
  },
  brapi: {
    description: "BRAPI is the primary source for B3 (Bovespa) equity data — prices in BRL, day change and volume. Primary B3 quotes are now fetched server-side via BRAPI Pro (batch 20 tickers/req, ~5-min) with a Yahoo .SA fallback for tickers BRAPI drops. The client-side path shown here is the secondary fallback plus the Terminal Mini ticker. A BRAPI Pro token is used.",
    type: "HTTP REST API", owner: "BRAPI (Community)", domain: "Brazil — B3 Equities",
    tags: ["Primary", "Brasil", "B3", "FIIs", "ETFs"],
    endpoint: "brapi.dev/api → GET /api/v1/quotes/brazil", authType: "Server-side (BRAPI Pro token injected by /api/v1/brapi)",
    refreshCadence: "~5-min server cycle (Pro batch)", lastSuccessfulSync: "Managed server-side",
  },
  bcb: {
    description: "The Banco Central do Brasil (BCB) Open Data API is the official source for Brazilian macro indicators — SELIC base rate, IPCA inflation, and CDI interbank rate. Free, no API key required. Data comes from the BCB SGS (Sistema Gerenciador de Séries Temporais) platform.",
    type: "HTTP REST API (Government)", owner: "Banco Central do Brasil", domain: "Brazilian Macro",
    tags: ["Brasil", "Macro", "SELIC", "IPCA", "CDI", "Official"],
    endpoint: "https://api.bcb.gov.br → GET /api/v1/brazil/macro", authType: "None (public government endpoint)",
    refreshCadence: "1-hour cache", lastSuccessfulSync: "On demand (cached)",
  },
  awesomeapi: {
    description: "AwesomeAPI is a free, keyless Brazilian FX rate API providing USD/BRL and EUR/BRL rates with bid/ask spreads and 24h change. It powers the USD/BRL macro context banner in the Brazil Equities group. Provider-side responses are cached for 1 minute; the app adds a 15-minute cache on top.",
    type: "HTTP REST API (Public)", owner: "AwesomeAPI (Community)", domain: "FX / Currency",
    tags: ["Brasil", "FX", "USD/BRL", "EUR/BRL", "No Auth"],
    endpoint: "https://economia.awesomeapi.com.br → GET /api/v1/brazil/macro", authType: "None (public endpoint)",
    refreshCadence: "15-minute cache", lastSuccessfulSync: "On demand (cached)",
  },
};

// ─── CATALOG DATA ────────────────────────────────────────────────────────────

const CATALOG = [
  {
    category: "Market Data", icon: "📈",
    items: [
      { name: "Real-time Price", source: "fmp", fallback: "eodhd", rateLimit: "FMP Premium 750/min (server) · EODHD/BRAPI/Yahoo fallback", frequency: "~1 min (server merge)", coverage: "Global equities, indices, FX, ETFs, B3, crypto", status: "active", description: "Current market price for all tracked assets, from the server-side quote engine: FMP Premium is primary for equities/FX/metals, EODHD for indices (+ warm equity/FX fallback), BRAPI Pro for B3, CoinGecko for crypto; Yahoo is the last-resort fallback only (CL=F/NG=F).", groups: ["All groups"], component: "Dashboard cards, Detail panel", endpoint: "server: /api/v1/quotes/live", fetchMode: "Server cycle" },
      { name: "Daily Volume", source: "fmp", fallback: "eodhd", rateLimit: "FMP/EODHD/BRAPI (server)", frequency: "~1 min (server merge)", coverage: "Equities, indices, B3", status: "active", description: "Trading volume for the current session, from the same merged live quote (FMP/EODHD/BRAPI per class).", groups: ["All equity groups", "Indices"], component: "Dashboard cards", endpoint: "server: /api/v1/quotes/live", fetchMode: "Server cycle" },
      { name: "Day Change (%)", source: "fmp", fallback: "eodhd", rateLimit: "FMP/EODHD/BRAPI/CoinGecko (server)", frequency: "~1 min (server merge)", coverage: "All tracked assets", status: "active", description: "Percentage change from previous close; drives heat bars and sentiment. From the merged live quote (winning provider per class).", groups: ["All groups"], component: "Dashboard cards, Sentiment bar, Top movers", endpoint: "server: /api/v1/quotes/live", fetchMode: "Server cycle" },
      { name: "Market Capitalization", source: "fmp", fallback: "brapi", rateLimit: "FMP Premium · 750/min", frequency: "Server cycle + on demand", coverage: "US equities/ETFs + B3", status: "active", description: "Total market value of outstanding shares. FMP on the live quote engine + profile panels; BRAPI Pro supplies it for B3. (EODHD real-time does not return it.)", groups: ["All equity groups"], component: "Dashboard cards, Detail panel", endpoint: "server: /api/v1/quotes/live · /api/v1/fmp/profile", fetchMode: "Server cycle + on demand" },
      { name: "52-Week High / Low", source: "fmp", fallback: "eodhd", rateLimit: "FMP quote · EODHD 1y-EOD · BRAPI (B3)", frequency: "On demand + server cycle", coverage: "Equities, indices, B3", status: "active", description: "Highest/lowest price over the past 52 weeks. FMP yearHigh/yearLow for equities/FX/covered indices; BRAPI for B3; computed from EODHD 1-year EOD for the EODHD-only indices (no longer from Yahoo).", groups: ["All equity groups", "Indices"], component: "Detail panel, Watchlist", endpoint: "server: /api/v1/quote", fetchMode: "On demand" },
      { name: "Historical Price Chart", source: "fmp", fallback: "brapi", rateLimit: "FMP/BRAPI/EODHD", frequency: "On demand (per timeframe)", coverage: "All tracked assets", status: "active", description: "OHLC candles for 9 timeframes (1D–MAX). FMP (US equities/FX/metals/US+major indices), BRAPI Pro (B3), EODHD (EU/Asia indices), USO/UNG ETF proxy (WTI/natgas); Yahoo is the last-resort fallback only.", groups: ["All groups"], component: "Chart & Research, Detail panel chart", endpoint: "client fmpOHLCV → /api/v1/fmp · /api/v1/brapi · /api/v1/ohlcv", fetchMode: "On demand" },
      { name: "Sparkline (30-day)", source: "fmp", fallback: "eodhd", rateLimit: "server, 6h cadence", frequency: "Daily EOD (~6h refresh)", coverage: "All tracked assets", status: "active", description: "Real ~30-point daily-close series folded into the live quote server-side: FMP light-EOD (equities/FX/metals/indices), CoinGecko (crypto), BRAPI (B3), EODHD (EU/Asia indices), ETF proxy (WTI/natgas). The old Math.random synthetic is now only a last-resort client fallback.", groups: ["All groups"], component: "Dashboard cards", endpoint: "server: /api/v1/quotes/live (sparkline)", fetchMode: "Server cycle" },
    ],
  },
  {
    category: "Fundamentals", icon: "📊",
    items: [
      { name: "P/E Ratio", source: "fmp", fallback: "yahoo", rateLimit: "Premium · 750/min", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "Price-to-earnings ratio from FMP company profile.", groups: ["All equity groups"], component: "Detail panel Fundamentals", endpoint: "/profile?symbol={symbol}", fetchMode: "On demand" },
      { name: "Earnings Per Share", source: "fmp", fallback: "yahoo", rateLimit: "Premium · 750/min", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "EPS from the latest reported quarter.", groups: ["All equity groups"], component: "Detail panel Fundamentals", endpoint: "/profile?symbol={symbol}", fetchMode: "On demand" },
      { name: "Profit Margin", source: "fmp", fallback: null, rateLimit: "Premium · 750/min", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "Net profit margin TTM from FMP financial ratios.", groups: ["All equity groups"], component: "Detail panel Fundamentals", endpoint: "/ratios-ttm?symbol={symbol}", fetchMode: "On demand" },
      { name: "Debt / Equity", source: "fmp", fallback: null, rateLimit: "Premium · 750/min", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "Debt-to-equity ratio TTM, key leverage indicator.", groups: ["Financials", "Clean Energy"], component: "Detail panel Fundamentals", endpoint: "/ratios-ttm?symbol={symbol}", fetchMode: "On demand" },
      { name: "Return on Equity", source: "fmp", fallback: null, rateLimit: "Premium · 750/min", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "ROE TTM — how efficiently the company generates profit from equity.", groups: ["All equity groups"], component: "Detail panel Fundamentals", endpoint: "/ratios-ttm?symbol={symbol}", fetchMode: "On demand" },
      { name: "Beta", source: "fmp", fallback: null, rateLimit: "Premium · 750/min", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "Volatility relative to the overall market (S&P 500 benchmark).", groups: ["All equity groups"], component: "Detail panel Fundamentals", endpoint: "/profile?symbol={symbol}", fetchMode: "On demand" },
      { name: "Dividend Yield", source: "fmp", fallback: null, rateLimit: "Premium · 750/min", frequency: "Background (batch profile)", coverage: "US equities", status: "active", description: "Annual dividend yield computed from last dividend and price. Used to populate the Dividend Income group dynamically (threshold: >3%).", groups: ["Dividend Income"], component: "Dividends group assignment", endpoint: "/profile/{symbols} (batch)", fetchMode: "Background" },
      { name: "DCF Valuation", source: "fmp", fallback: null, rateLimit: "Premium · 750/min", frequency: "On demand", coverage: "US equities", status: "planned", description: "Discounted cash flow intrinsic value estimate.", groups: ["All equity groups"], component: "Detail panel", endpoint: "/discounted-cash-flow?symbol={symbol}", fetchMode: "On demand" },
    ],
  },
  {
    category: "Technical Indicators", icon: "📐",
    items: [
      { name: "RSI — 14 Day", source: "alphaVantage", fallback: null, rateLimit: "25 calls/day — on demand only", frequency: "On demand (user action)", coverage: "US equities", status: "active", description: "Relative Strength Index with 14-day lookback. Cached for 24 hours to preserve quota.", groups: ["All equity groups"], component: "Future: Detail panel technicals", endpoint: "/query?function=RSI&symbol=...&time_period=14", fetchMode: "On demand" },
      { name: "MACD", source: "alphaVantage", fallback: null, rateLimit: "25 calls/day — on demand only", frequency: "On demand (user action)", coverage: "US equities", status: "active", description: "Moving Average Convergence Divergence with signal line and histogram.", groups: ["All equity groups"], component: "Future: Detail panel technicals", endpoint: "/query?function=MACD&symbol=...", fetchMode: "On demand" },
      { name: "Bollinger Bands", source: "alphaVantage", fallback: null, rateLimit: "25 calls/day — on demand only", frequency: "On demand", coverage: "US equities", status: "planned", description: "Upper, middle, and lower Bollinger Bands for volatility analysis.", groups: ["All equity groups"], component: "Planned", endpoint: "/query?function=BBANDS", fetchMode: "On demand" },
      { name: "Moving Averages", source: "alphaVantage", fallback: null, rateLimit: "25 calls/day — on demand only", frequency: "On demand", coverage: "US equities", status: "planned", description: "Simple and exponential moving averages (SMA, EMA).", groups: ["All equity groups"], component: "Planned", endpoint: "/query?function=SMA", fetchMode: "On demand" },
    ],
  },
  {
    category: "Macro Economics", icon: "🏛",
    items: [
      { name: "CPI (All Urban)", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "Consumer Price Index for All Urban Consumers — primary US inflation gauge.", groups: ["Macro context"], component: "Future: Macro dashboard", endpoint: "/series/observations?series_id=CPIAUCSL", fetchMode: "Cached" },
      { name: "GDP (Quarterly)", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "Gross Domestic Product, seasonally adjusted quarterly.", groups: ["Macro context"], component: "Future: Macro dashboard", endpoint: "/series/observations?series_id=GDP", fetchMode: "Cached" },
      { name: "Fed Funds Rate", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "Effective Federal Funds Rate — displayed as macro context banner for Financials group.", groups: ["Financials"], component: "Group macro banner", endpoint: "/series/observations?series_id=FEDFUNDS", fetchMode: "Cached" },
      { name: "Unemployment Rate", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "US civilian unemployment rate, seasonally adjusted.", groups: ["Macro context"], component: "Future: Macro dashboard", endpoint: "/series/observations?series_id=UNRATE", fetchMode: "Cached" },
      { name: "10-Year Treasury Yield", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "10Y constant maturity Treasury yield — macro context banner for Clean Energy group.", groups: ["Clean Energy"], component: "Group macro banner", endpoint: "/series/observations?series_id=DGS10", fetchMode: "Cached" },
      { name: "2-Year Treasury Yield", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "2Y constant maturity Treasury yield — used for yield curve analysis.", groups: ["Macro context"], component: "Future: Macro dashboard", endpoint: "/series/observations?series_id=DGS2", fetchMode: "Cached" },
      { name: "30-Year Mortgage Rate", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "30Y fixed-rate mortgage average — macro context banner for Real Estate group.", groups: ["Real Estate"], component: "Group macro banner", endpoint: "/series/observations?series_id=MORTGAGE30US", fetchMode: "Cached" },
      { name: "Consumer Sentiment", source: "fred", fallback: null, rateLimit: "Unlimited", frequency: "Hourly cache", coverage: "United States", status: "active", description: "University of Michigan Consumer Sentiment Index — macro context banner for Consumer group.", groups: ["Consumer"], component: "Group macro banner", endpoint: "/series/observations?series_id=UMCSENT", fetchMode: "Cached" },
    ],
  },
  {
    category: "Sentiment & Events", icon: "📰",
    items: [
      { name: "Analyst Recommendations", source: "finnhub", fallback: null, rateLimit: "60 calls/min (queued)", frequency: "On demand (panel open)", coverage: "US equities", status: "active", description: "Buy/Hold/Sell consensus from sell-side analysts, rendered as a stacked bar in the detail panel.", groups: ["All equity groups"], component: "Detail panel Analyst Consensus", endpoint: "/stock/recommendation?symbol=...", fetchMode: "On demand" },
      { name: "Company News", source: "finnhub", fallback: null, rateLimit: "60 calls/min (queued)", frequency: "On demand (10min cache)", coverage: "US equities", status: "active", description: "Latest 5 company news headlines from the past 7 days.", groups: ["All equity groups"], component: "Detail panel Recent News", endpoint: "/company-news?symbol=...&from=...&to=...", fetchMode: "On demand" },
      { name: "Insider Sentiment", source: "finnhub", fallback: null, rateLimit: "60 calls/min (queued)", frequency: "On demand", coverage: "US equities", status: "planned", description: "Aggregate insider trading sentiment data.", groups: ["Health Care"], component: "Planned", endpoint: "/stock/insider-sentiment?symbol=...", fetchMode: "On demand" },
      { name: "Earnings Calendar", source: "finnhub", fallback: null, rateLimit: "60 calls/min (queued)", frequency: "On demand", coverage: "US equities", status: "planned", description: "Upcoming and recent earnings dates and EPS estimates.", groups: ["Financials", "Aerospace & Defense"], component: "Planned", endpoint: "/stock/earnings?symbol=...", fetchMode: "On demand" },
    ],
  },
  {
    category: "Crypto", icon: "🪙",
    items: [
      { name: "Crypto Price (USD)", source: "coingecko", fallback: null, rateLimit: "30 calls/min — no key", frequency: "2-minute cache", coverage: "Top cryptocurrencies", status: "active", description: "USD price for BTC, ETH, SOL via CoinGecko simple/price endpoint.", groups: ["Crypto"], component: "Dashboard crypto cards", endpoint: "/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd", fetchMode: "Page load" },
      { name: "Crypto Market Cap", source: "coingecko", fallback: null, rateLimit: "30 calls/min — no key", frequency: "2-minute cache", coverage: "Top cryptocurrencies", status: "active", description: "Total market capitalization in USD for each tracked cryptocurrency.", groups: ["Crypto"], component: "Detail panel", endpoint: "/simple/price?...&include_market_cap=true", fetchMode: "Page load" },
      { name: "Crypto 24h Volume", source: "coingecko", fallback: null, rateLimit: "30 calls/min — no key", frequency: "2-minute cache", coverage: "Top cryptocurrencies", status: "active", description: "24-hour trading volume in USD.", groups: ["Crypto"], component: "Dashboard cards", endpoint: "/simple/price?...&include_24hr_vol=true", fetchMode: "Page load" },
      { name: "Trending Coins", source: "coingecko", fallback: null, rateLimit: "30 calls/min — no key", frequency: "5-minute cache", coverage: "Global crypto", status: "active", description: "Top trending coins by search activity on CoinGecko.", groups: ["Crypto"], component: "Future feature", endpoint: "/search/trending", fetchMode: "On demand" },
    ],
  },
  {
    category: "Brazil Equities", icon: "🇧🇷",
    items: [
      { name: "B3 Real-time Price", source: "brapi", fallback: "yahoo", rateLimit: "BRAPI Pro · 20/req · 5-min (server)", frequency: "~5 min (server cycle)", coverage: "Brazil B3 equities, FIIs & ETFs", status: "active", description: "Current market price in BRL for all tracked B3 assets, fetched server-side via BRAPI Pro (batch 20/req) with Yahoo Finance (.SA suffix) as fallback. EODHD is not used for B3 (budget).", groups: ["Brazil Equities"], component: "Dashboard cards, Detail panel", endpoint: "server: /api/v1/quotes/brazil (BRAPI Pro → Yahoo .SA)", fetchMode: "Server cycle" },
      { name: "B3 Day Change (%)", source: "brapi", fallback: "yahoo", rateLimit: "BRAPI Pro · 5-min (server)", frequency: "~5 min (server cycle)", coverage: "Brazil B3 equities", status: "active", description: "Percentage change from previous close for B3 stocks, from the server BRAPI Pro feed (Yahoo .SA fallback).", groups: ["Brazil Equities"], component: "Dashboard cards", endpoint: "server: /api/v1/quotes/brazil", fetchMode: "Server cycle" },
      { name: "B3 Volume", source: "brapi", fallback: "yahoo", rateLimit: "BRAPI Pro · 5-min (server)", frequency: "~5 min (server cycle)", coverage: "Brazil B3 equities", status: "active", description: "Trading volume for B3 stocks in the current session, from the server BRAPI Pro feed (Yahoo .SA fallback).", groups: ["Brazil Equities"], component: "Dashboard cards", endpoint: "server: /api/v1/quotes/brazil", fetchMode: "Server cycle" },
      { name: "SELIC Rate", source: "bcb", fallback: null, rateLimit: "Unlimited — no key", frequency: "1-hour cache", coverage: "Brazil", status: "active", description: "Brazilian base interest rate (equivalent to Fed Funds Rate), from BCB SGS series 432.", groups: ["Brazil Equities"], component: "Group macro banner", endpoint: "/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", fetchMode: "Cached" },
      { name: "IPCA (Inflation)", source: "bcb", fallback: null, rateLimit: "Unlimited — no key", frequency: "1-hour cache", coverage: "Brazil", status: "active", description: "Brazilian inflation index (equivalent to CPI), from BCB SGS series 433.", groups: ["Brazil Equities"], component: "Group macro banner", endpoint: "/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json", fetchMode: "Cached" },
      { name: "CDI Rate", source: "bcb", fallback: null, rateLimit: "Unlimited — no key", frequency: "1-hour cache", coverage: "Brazil", status: "active", description: "CDI (Certificado de Depósito Interbancário) rate, from BCB SGS series 4389.", groups: ["Brazil Equities"], component: "Group macro banner", endpoint: "/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json", fetchMode: "Cached" },
      { name: "USD/BRL Rate", source: "awesomeapi", fallback: null, rateLimit: "Free — no key", frequency: "15-minute cache", coverage: "Brazil", status: "active", description: "Real-time USD/BRL exchange rate with bid/ask and percentage change from AwesomeAPI.", groups: ["Brazil Equities"], component: "Group macro banner", endpoint: "/last/USD-BRL", fetchMode: "Cached" },
    ],
  },
];

const ASSET_GROUPS = [
  { name: "Aerospace & Defense",  icon: "🛡",  assetCount: "5 tickers",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo", "finnhub", "fmp"],      macroBanner: null },
  { name: "Brazil Equities",      icon: "🇧🇷", assetCount: "17 tickers",         assignment: "Manual ticker list",                    sources: ["brapi", "yahoo", "bcb", "awesomeapi"],    macroBanner: "SELIC, IPCA, CDI (BCB) + USD/BRL (AwesomeAPI)" },
  { name: "Clean Energy",         icon: "🔋",  assetCount: "5 + cross-listed",   assignment: "Manual + cross-list from Technology",   sources: ["eodhd", "yahoo", "finnhub", "fmp", "fred"], macroBanner: "10Y Treasury Yield (FRED)" },
  { name: "Consumer",             icon: "🛒",  assetCount: "5 + cross-listed",   assignment: "Manual + cross-list from Technology",   sources: ["eodhd", "yahoo", "finnhub", "fmp", "fred"], macroBanner: "Consumer Sentiment (FRED)" },
  { name: "Crypto",               icon: "🪙",  assetCount: "3 coins",            assignment: "CoinGecko price data exclusively",      sources: ["coingecko"],                             macroBanner: null },
  { name: "Dividend Income",      icon: "💰",  assetCount: "Dynamic",            assignment: "FMP dividend yield > 3%",               sources: ["eodhd", "yahoo", "fmp"],                 macroBanner: null },
  { name: "Emerging Markets",     icon: "🌍",  assetCount: "4 ETFs",             assignment: "Manual ETF list",                       sources: ["eodhd", "yahoo", "finnhub"],             macroBanner: null },
  { name: "Oil & Gas",            icon: "🛢",  assetCount: "8 tickers",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo", "finnhub", "fmp"],      macroBanner: null },
  { name: "Financials",           icon: "🏦",  assetCount: "8 tickers",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo", "finnhub", "fmp", "fred"], macroBanner: "Fed Funds Rate (FRED)" },
  { name: "Foreign Exchange",     icon: "💱",  assetCount: "8 pairs",            assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo"],                        macroBanner: null },
  { name: "Global Indices",       icon: "🌐",  assetCount: "8 indices",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo"],                        macroBanner: null },
  { name: "Health Care",          icon: "💊",  assetCount: "6 tickers",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo", "finnhub", "fmp"],      macroBanner: null },
  { name: "Real Estate",          icon: "🏢",  assetCount: "4 tickers",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo", "finnhub", "fmp", "fred"], macroBanner: "30-Year Mortgage Rate (FRED)" },
  { name: "Semiconductors",       icon: "🔬",  assetCount: "6 + cross-listed",   assignment: "Manual + cross-list from Technology",   sources: ["eodhd", "yahoo", "finnhub", "fmp"],      macroBanner: null },
  { name: "Technology",           icon: "⚡",  assetCount: "8 tickers",          assignment: "Manual ticker list",                    sources: ["eodhd", "yahoo", "finnhub", "fmp"],      macroBanner: null },
];

const STATUS_BADGE = {
  operational:   { label: "OPERATIONAL",  color: "#00E676", bg: "rgba(0,230,118,0.1)",  border: "rgba(0,230,118,0.3)" },
  degraded:      { label: "DEGRADED",     color: "#FFD740", bg: "rgba(255,215,64,0.1)", border: "rgba(255,215,64,0.3)" },
  outage:        { label: "OUTAGE",       color: "var(--c-error)", bg: "rgba(255,82,82,0.1)",  border: "rgba(255,82,82,0.3)" },
  "rate-limited":{ label: "RATE LIMITED", color: "#FF9800", bg: "rgba(255,152,0,0.1)",  border: "rgba(255,152,0,0.3)" },
};

// Small header badges that classify a source along two independent axes:
//   tier   → PAID subscription (EODHD, BRAPI Pro today; a future paid FMP flips here)
//   locus  → SERVER-SIDE (fetched by the backend engine, health measured there, not in-browser)
function ProBadge() {
  return (
    <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.6px", color: "#fff", background: "#7c3aed", border: "1px solid #8b5cf6", borderRadius: 3, padding: "2px 6px", whiteSpace: "nowrap" }}>
      ★ PRO
    </span>
  );
}

function ServerSideChip() {
  return (
    <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.6px", color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 3, padding: "2px 6px", whiteSpace: "nowrap" }}>
      SERVER-SIDE
    </span>
  );
}

const ITEM_STATUS_STYLES = {
  active:    { label: "ACTIVE",    color: "#00E676", bg: "rgba(0,230,118,0.1)",  border: "rgba(0,230,118,0.3)" },
  planned:   { label: "PLANNED",   color: "#FFD740", bg: "rgba(255,215,64,0.1)", border: "rgba(255,215,64,0.3)" },
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

function SourceBadge({ source, style: extra }) {
  const color = SOURCE_COLORS[source] || "#9E9E9E";
  const label = SOURCE_LABELS[source] || source;
  return (
    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", color, background: color + "18", border: `1px solid ${color}30`, borderRadius: 3, padding: "2px 7px", whiteSpace: "nowrap", ...extra }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.outage;
  return (
    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "3px 10px" }}>
      {s.label}
    </span>
  );
}

function ItemStatusDot({ status }) {
  const s = ITEM_STATUS_STYLES[status] || ITEM_STATUS_STYLES.planned;
  return (
    <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "2px 8px" }}>
      {s.label}
    </span>
  );
}

function MetricRow({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 9, color: valueColor || "var(--c-text-2)" }}>{value}</span>
    </div>
  );
}

function MetricBox({ label, value, valueColor }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: valueColor || "var(--c-text)" }}>{value}</div>
    </div>
  );
}

function SuccessRateDots({ history }) {
  const dots = [];
  for (let i = 0; i < 10; i++) {
    const val = history[i];
    dots.push(
      <div key={i} style={{
        width: 8, height: 8, borderRadius: "50%",
        background: val === undefined ? "var(--c-border)" : val ? "#00E676" : "var(--c-error)",
        transition: "background 0.3s ease",
      }} />
    );
  }
  return <div style={{ display: "flex", gap: 3, alignItems: "center" }}>{dots}</div>;
}

function UsageBar({ used, max, per }) {
  if (!max) return <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>No limit</span>;
  const pct = Math.min((used / max) * 100, 100);
  const barColor = pct > 90 ? "var(--c-error)" : pct > 70 ? "#FFD740" : "#00E676";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 4, background: "var(--c-border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 9, color: barColor, whiteSpace: "nowrap" }}>
        {used}/{max} {per ? `per ${per}` : ""}
      </span>
    </div>
  );
}

function TimeAgo({ timestamp }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>Not checked</span>;
  const secs = Math.round((now - timestamp) / 1000);
  const isPulsing = secs < 60;
  return (
    <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: isPulsing ? "#00E676" : "var(--c-text-3)",
        animation: isPulsing ? "pulse 2s ease-in-out infinite" : "none",
      }} />
      {secs < 5 ? "just now" : `${secs}s ago`}
    </span>
  );
}

// ─── SOURCE DETAIL PANEL ─────────────────────────────────────────────────────

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: mono, fontSize: 9, letterSpacing: "1.5px", color: "var(--c-text-3)",
        textTransform: "uppercase", marginBottom: 10, paddingBottom: 6,
        borderBottom: "1px solid var(--c-border)",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatGrid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: valueColor || "var(--c-text)", lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SourceDetailPanel({ source, health, onClose }) {
  const meta    = SOURCE_META[source];
  const detail  = SOURCE_DETAIL_DATA[source];
  const color   = SOURCE_COLORS[source];
  const label   = SOURCE_LABELS[source];
  const configured   = getSourceStatus()[source];
  const isConfigured = configured?.hasKey || !configured?.keyRequired;
  const serverSide   = meta.serverSide || configured?.serverSide;
  const history      = health?.serverHistory ?? getHealthHistory(source);
  const successCount = history.filter(Boolean).length;
  const totalChecks  = history.length;
  const statusKey    = health?.status || (isConfigured ? "operational" : "outage");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1,
        background: "var(--c-panel)", borderBottom: "1px solid var(--c-border)",
        padding: "18px 20px 14px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 5, height: 26, borderRadius: 3, background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-0.3px" }}>
                {label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <StatusBadge status={statusKey} />
              {meta.tier === "paid" && <ProBadge />}
              {serverSide && <ServerSideChip />}
              <TimeAgo timestamp={health?.timestamp} />
              {health?.responseTime != null && (
                <span style={{
                  fontFamily: mono, fontSize: 9, color: health.responseTime > 3000 ? "var(--c-error)" : health.responseTime > 1000 ? "#FFD740" : "#00E676",
                }}>
                  {health.responseTime}ms
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6,
              cursor: "pointer", padding: "6px 10px", color: "var(--c-text-3)", fontSize: 14,
              transition: "all 0.15s ease", flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.color = "var(--c-text-3)"; }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* Overview */}
        <DetailSection title="Overview">
          <p style={{ fontFamily: sans, fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.65, margin: "0 0 12px" }}>
            {detail.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {detail.tags.map(tag => (
              <span key={tag} style={{
                fontFamily: mono, fontSize: 9, letterSpacing: "0.3px",
                color, background: color + "15", border: `1px solid ${color}30`,
                borderRadius: 3, padding: "3px 8px",
              }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <MetricRow label="DOMAIN"  value={detail.domain} />
            <MetricRow label="OWNER"   value={detail.owner} />
            <MetricRow label="GEO"     value={meta.geo} />
            <MetricRow label="FRESHNESS" value={meta.freshness} />
            <MetricRow label="ASSET CLASSES" value={meta.assetClasses.join(", ")} />
          </div>
        </DetailSection>

        {/* Connection & Configuration */}
        <DetailSection title="Connection & Configuration">
          <div style={{ display: "grid", gap: 4 }}>
            <MetricRow label="TYPE"           value={detail.type} />
            <MetricRow label="AUTH"           value={detail.authType} />
            <MetricRow label="ENDPOINT"       value={detail.endpoint} />
            <MetricRow label="HEALTH CHECK"   value={meta.healthEndpoint} />
            <MetricRow label="RATE LIMIT"     value={meta.rateLimit} />
            <MetricRow label="REFRESH"        value={detail.refreshCadence} />
            <MetricRow label="LAST SYNC"      value={detail.lastSuccessfulSync} />
            <MetricRow label="KEY REQUIRED"   value={configured?.keyRequired ? "Yes" : "No"} />
            <MetricRow label="KEY CONFIGURED" value={isConfigured ? "Yes" : "No"} valueColor={isConfigured ? "#00E676" : "#FFD740"} />
          </div>
          {meta.keyRegistrationUrl && (
            <div style={{ marginTop: 10 }}>
              <a href={meta.keyRegistrationUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: mono, fontSize: 9, color, textDecoration: "none" }}>
                Get API key →
              </a>
              <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginLeft: 12 }}>
                <a href={meta.docUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--c-text-3)", textDecoration: "none" }}>
                  Documentation →
                </a>
              </span>
            </div>
          )}
          {!meta.keyRegistrationUrl && (
            <div style={{ marginTop: 10 }}>
              <a href={meta.docUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: mono, fontSize: 9, color, textDecoration: "none" }}>
                Documentation →
              </a>
            </div>
          )}
        </DetailSection>

        {/* Health — live reachability checks only (historical uptime/incidents were mock and removed) */}
        <DetailSection title={serverSide ? "Health — Server Fetch" : "Health — Live Checks"}>
          <StatGrid>
            <StatCard
              label={serverSide ? "FETCH LATENCY" : "AVG LATENCY"}
              value={health?.responseTime != null ? `${health.responseTime}ms` : "—"}
              sub={serverSide ? "backend → provider" : null}
              valueColor={
                health?.responseTime == null ? undefined :
                health.responseTime > 3000 ? "var(--c-error)" :
                health.responseTime > 1000 ? "#FFD740" : "#00E676"
              }
            />
            <StatCard
              label={serverSide ? "FETCH SUCCESS" : "SUCCESS RATE"}
              value={totalChecks > 0 ? `${Math.round(successCount / totalChecks * 100)}%` : "—"}
              sub={totalChecks > 0 ? `${successCount}/${totalChecks} ${serverSide ? "cycles" : "checks"}` : (serverSide ? "no cycles yet" : "no checks yet")}
              valueColor={totalChecks > 0 ? (successCount / totalChecks >= 0.9 ? "#00E676" : "#FFD740") : undefined}
            />
          </StatGrid>

          {serverSide && health?.rawValue && (
            <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
              <MetricRow label="LAST FETCH COVERAGE" value={`${health.rawValue} symbols`} />
            </div>
          )}

          {totalChecks > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px", marginBottom: 6 }}>
                {serverSide ? `RECENT FETCH CYCLES (${totalChecks})` : `RECENT CHECKS (${totalChecks})`}
              </div>
              <SuccessRateDots history={history} />
            </div>
          )}

          <div style={{ fontFamily: sans, fontSize: 10, color: "var(--c-text-3)", marginTop: 12, lineHeight: 1.45 }}>
            {serverSide
              ? "Measured at the backend quote engine — the browser can't reach this provider directly, so latency and success reflect the engine's own fetch cycles. Historical uptime percentiles are not yet instrumented."
              : "Only live reachability checks from your browser are shown. Historical uptime, latency percentiles and incident history are not yet instrumented."}
          </div>
        </DetailSection>

        {/* Notes */}
        {meta.note && (
          <DetailSection title="Notes">
            <div style={{
              fontFamily: sans, fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.6,
              background: "rgba(255,215,64,0.06)", border: "1px solid rgba(255,215,64,0.2)",
              borderRadius: 6, padding: "10px 12px",
            }}>
              {meta.note}
            </div>
            {meta.fallbackSuggestion && (
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginTop: 8 }}>
                FALLBACK: {meta.fallbackSuggestion}
              </div>
            )}
          </DetailSection>
        )}

      </div>
    </div>
  );
}

// ─── SOURCE HEALTH CARD ─────────────────────────────────────────────────────

function SourceHealthCard({ source, health, usage, onRefresh, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const meta = SOURCE_META[source];
  const color = SOURCE_COLORS[source];
  const configured = getSourceStatus()[source];
  const isConfigured = configured?.hasKey || !configured?.keyRequired;
  const checking = health?.checking;
  const serverSide = meta.serverSide || configured?.serverSide;
  // Server-side providers carry their own rolling fetch history from the engine; client
  // providers accumulate history from browser pings in sessionStorage.
  const history = health?.serverHistory ?? getHealthHistory(source);
  const successCount = history.filter(Boolean).length;
  const totalChecks = history.length;

  const statusKey = health?.status || (isConfigured ? "operational" : "outage");

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { if (e.target.closest("button") || e.target.closest("a")) return; onSelect?.(source); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(source); } }}
      style={{
        background: hovered ? `linear-gradient(135deg,${color}08,rgba(13,15,24,0.95))` : "var(--c-surface)",
        border: `1px solid ${hovered ? color + "40" : "var(--c-border)"}`,
        borderRadius: 10, padding: "16px 18px",
        transition: "all 0.25s ease", position: "relative",
        opacity: checking ? 0.7 : 1,
        cursor: "pointer",
      }}
    >
      {checking && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "60%", background: `linear-gradient(90deg,transparent,${color},transparent)`, animation: "scanline 1.5s ease-in-out infinite" }} />
        </div>
      )}

      {/* Header: source name + refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: color }} />
            <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>
              {SOURCE_LABELS[source]}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <StatusBadge status={statusKey} />
            {meta.tier === "paid" && <ProBadge />}
            {serverSide && <ServerSideChip />}
          </div>
        </div>
        <button
          onClick={() => onRefresh(source)}
          title={serverSide ? "Refresh (re-reads backend fetch status)" : "Refresh health check"}
          style={{
            background: "transparent", border: `1px solid var(--c-border)`, borderRadius: 6,
            cursor: "pointer", padding: "5px 8px", color: "var(--c-text-3)", fontSize: 12,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.color = "var(--c-text-3)"; }}
        >
          ↻
        </button>
      </div>

      {/* Response time + last checked (server-side cards show the backend fetch latency) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          {health?.responseTime != null ? (
            <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: health.responseTime > 3000 ? "var(--c-error)" : health.responseTime > 1000 ? "#FFD740" : "var(--c-text)" }}>
              {health.responseTime}ms
            </span>
          ) : (
            <span style={{ fontFamily: mono, fontSize: 14, color: "var(--c-text-3)" }}>—</span>
          )}
          {serverSide && <span style={{ fontFamily: mono, fontSize: 8, color: "var(--c-text-3)", letterSpacing: "0.3px" }}>backend fetch</span>}
        </div>
        <TimeAgo timestamp={health?.timestamp} />
      </div>

      {/* Success rate */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>
            {serverSide ? "FETCH SUCCESS" : "SUCCESS RATE"}
          </span>
          {totalChecks > 0 && <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-2)" }}>{successCount}/{totalChecks}</span>}
        </div>
        <SuccessRateDots history={history} />
      </div>

      {/* Error / missing key message */}
      {!serverSide && !isConfigured && (
        <div style={{ background: "rgba(255,215,64,0.08)", border: "1px solid rgba(255,215,64,0.25)", borderRadius: 4, padding: "8px 10px", marginBottom: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#FFD740", marginBottom: 4, fontWeight: 600 }}>API key not configured</div>
          {meta.keyRegistrationUrl && (
            <a href={meta.keyRegistrationUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: mono, fontSize: 9, color: color, textDecoration: "none" }}>
              Get your free key →
            </a>
          )}
        </div>
      )}
      {isConfigured && health?.error && (
        <div style={{
          background: health.status === "rate-limited" ? "rgba(255,152,0,0.08)" : "rgba(255,82,82,0.08)",
          border: `1px solid ${health.status === "rate-limited" ? "rgba(255,152,0,0.3)" : "rgba(255,82,82,0.2)"}`,
          borderRadius: 4, padding: "6px 10px", marginBottom: 10,
        }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: health.status === "rate-limited" ? "#FF9800" : "var(--c-error)" }}>{health.error}</span>
        </div>
      )}

      {/* Rate limit usage */}
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>RATE LIMIT: {meta.rateLimit}</span>
        <div style={{ marginTop: 4 }}>
          <UsageBar used={usage || 0} max={meta.rateLimitMax} per={meta.rateLimitPer} />
        </div>
      </div>

      {/* Coverage & freshness */}
      <div style={{ display: "grid", gap: 3 }}>
        <MetricRow label="COVERAGE" value={meta.geo} />
        <MetricRow label="FRESHNESS" value={meta.freshness} />
        <MetricRow label="ASSET CLASSES" value={meta.assetClasses.join(", ")} />
      </div>

      {/* Yahoo-specific warning */}
      {source === "yahoo" && statusKey !== "operational" && meta.fallbackSuggestion && (
        <div style={{ background: "rgba(255,82,82,0.06)", border: "1px solid rgba(255,82,82,0.15)", borderRadius: 4, padding: "6px 10px", marginTop: 8 }}>
          <span style={{ fontFamily: mono, fontSize: 8, color: "var(--c-error)", letterSpacing: "0.3px" }}>
            Yahoo is unofficial and may break. Fallback: {meta.fallbackSuggestion}
          </span>
        </div>
      )}

      {/* Notes */}
      {meta.note && (
        <div style={{ fontFamily: sans, fontSize: 10, color: "var(--c-text-3)", marginTop: 8, lineHeight: 1.4 }}>
          {meta.note}
        </div>
      )}
    </div>
  );
}

// ─── ASSET GROUP CARD ────────────────────────────────────────────────────────

function AssetGroupCard({ group, onFilter }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onFilter(group.sources[0])}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter(group.sources[0]); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "var(--c-surface)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "var(--c-border)"}`,
        borderRadius: 8, padding: "14px 16px",
        transition: "all 0.2s ease", cursor: "pointer",
      }}
    >
      {/* Row 1: Icon + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{group.icon}</span>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{group.name}</span>
      </div>

      {/* Row 2: Source badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {group.sources.map(src => <SourceBadge key={src} source={src} />)}
      </div>

      {/* Row 3: Metrics */}
      <div style={{ display: "grid", gap: 4 }}>
        <MetricRow label="ASSETS" value={group.assetCount} />
        <MetricRow label="ASSIGNMENT" value={group.assignment} />
        {group.macroBanner && <MetricRow label="MACRO" value={group.macroBanner} />}
      </div>
    </div>
  );
}

// ─── ENHANCED CATALOG CARD ───────────────────────────────────────────────────

function CatalogCard({ item, sourceHealth, onClick }) {
  const [hovered, setHovered] = useState(false);
  const sourceStatus = sourceHealth?.[item.source]?.status;
  const isOutage = sourceStatus === "outage";
  const statusColor = sourceStatus === "operational" ? "#00E676" : sourceStatus === "degraded" ? "#FFD740" : sourceStatus === "outage" ? "var(--c-error)" : "var(--c-text-3)";

  return (
    <div
      onClick={() => onClick(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isOutage
          ? "rgba(255,82,82,0.03)"
          : hovered ? "rgba(255,255,255,0.04)" : "var(--c-surface)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "var(--c-border)"}`,
        borderRadius: 8, padding: "14px 16px",
        transition: "all 0.2s ease", cursor: "pointer",
        opacity: isOutage ? 0.6 : 1,
        position: "relative",
      }}
    >
      {/* Outage overlay icon */}
      {isOutage && (
        <div style={{ position: "absolute", top: 8, right: 10, fontFamily: mono, fontSize: 10, color: "var(--c-error)", opacity: 0.7 }}>
          ⚠
        </div>
      )}

      {/* Row 1: Name + Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "var(--c-text)", lineHeight: 1.3, flex: 1, marginRight: 8 }}>
          {item.name}
        </div>
        <ItemStatusDot status={item.status} />
      </div>

      {/* Row 2: Source badges + live dot */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginBottom: 10 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: statusColor,
          boxShadow: sourceStatus === "operational" ? `0 0 4px ${statusColor}66` : "none",
        }} />
        <SourceBadge source={item.source} />
        {item.fallback && <SourceBadge source={item.fallback} style={{ opacity: 0.5 }} />}
      </div>

      {/* Row 3: Details */}
      <div style={{ display: "grid", gap: 4 }}>
        <MetricRow label="RATE LIMIT" value={item.rateLimit} />
        <MetricRow label="FREQUENCY" value={item.frequency} />
        <MetricRow label="COVERAGE" value={item.coverage} />
      </div>
    </div>
  );
}

// ─── DATA POINT DETAIL PANEL ─────────────────────────────────────────────────

function DataPointPanel({ item, sourceHealth, onClose }) {
  const [sampleData, setSampleData] = useState({ status: "loading", data: null, error: null });

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch live sample on panel open
  const itemSource = item?.source;
  const itemName = item?.name;
  useEffect(() => {
    if (!itemSource) return;
    // Server-side sources (EODHD) have no client proxy to sample — don't fake a probe.
    if (SOURCE_META[itemSource]?.serverSide) {
      setSampleData({ status: "serverside", data: null, error: null });
      return;
    }
    let cancelled = false;
    setSampleData({ status: "loading", data: null, error: null });
    (async () => {
      const result = await healthPing(itemSource);
      if (!cancelled) {
        if (result.status === "operational") {
          setSampleData({ status: "ok", data: result, error: null });
        } else {
          setSampleData({ status: "error", data: result, error: result.error });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [itemSource, itemName]);

  if (!item) return null;

  const meta = SOURCE_META[item.source];
  const color = SOURCE_COLORS[item.source];
  const health = sourceHealth?.[item.source];
  const history = health?.serverHistory ?? getHealthHistory(item.source);
  const successCount = history.filter(Boolean).length;
  const avgTime = health?.responseTime || 0;


  return (
    <>
      {/* Sticky header */}
      <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "20px 20px 16px", borderBottom: "1px solid var(--c-border)",
          position: "sticky", top: 0, background: "var(--c-panel)", zIndex: 1,
        }}>
          <div>
            <div style={{ fontFamily: sans, fontSize: 18, fontWeight: 700, color: "var(--c-text)", marginBottom: 4 }}>
              {item.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SourceBadge source={item.source} style={{ fontSize: 10, padding: "2px 8px" }} />
              <ItemStatusDot status={item.status} />
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, cursor: "pointer", color: "var(--c-text-2)", fontSize: 16, padding: "6px 10px", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--c-error)"; e.currentTarget.style.color = "var(--c-error)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.color = "var(--c-text-2)"; }}>
            ✕
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>

          {/* Description */}
          <div style={{ fontFamily: sans, fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6, marginBottom: 16 }}>
            {item.description || "No description available."}
          </div>

          {/* Data Point Identity */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>IDENTITY</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MetricBox label="CATEGORY" value={CATALOG.find(c => c.items.includes(item))?.category || "—"} />
              <MetricBox label="FETCH MODE" value={item.fetchMode || "—"} />
            </div>
            {item.component && (
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 12px", marginTop: 8 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 4 }}>DISPLAYED IN</div>
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--c-text)" }}>{item.component}</div>
              </div>
            )}
          </div>

          {/* Asset Groups */}
          {item.groups && item.groups.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>USED BY GROUPS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {item.groups.map(g => (
                  <span key={g} style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-2)", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "3px 10px" }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source Information */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px" }}>SOURCE DETAILS</div>
              <SourceBadge source={item.source} />
            </div>
            <div style={{ display: "grid", gap: 3, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 14px" }}>
              <MetricRow label="API ENDPOINT" value={item.endpoint || "—"} />
              <MetricRow label="RATE LIMIT" value={meta?.rateLimit || item.rateLimit} />
              <MetricRow label="COVERAGE" value={meta?.coverage || item.coverage} />
              <MetricRow label="FRESHNESS" value={meta?.freshness || item.frequency} />
              {meta?.docUrl && (
                <MetricRow label="DOCS" value={
                  <a href={meta.docUrl} target="_blank" rel="noopener noreferrer" style={{ color, textDecoration: "none", fontSize: 9 }}>
                    {meta.docUrl.replace(/https?:\/\//, "").split("/")[0]} ↗
                  </a>
                } />
              )}
            </div>
          </div>

          {/* Live Data Sample */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>LIVE DATA SAMPLE</div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "12px 14px" }}>
              {sampleData.status === "loading" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: "pulse 1.2s ease-in-out infinite" }} />
                  <span style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)" }}>Fetching sample...</span>
                </div>
              )}
              {sampleData.status === "serverside" && (
                <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.5 }}>
                  This data point is served by the backend quote engine, so it can’t be sampled directly
                  from the browser. The engine fetches {SOURCE_LABELS[item.source]} server-side
                  {item.fallback ? ` (with ${SOURCE_LABELS[item.fallback]} as an automatic fallback)` : ""} and
                  the live value renders on the dashboard. The Brazil B3 feed already tags each symbol with its
                  resolved{" "}
                  <span style={{ fontFamily: mono, color: "var(--c-text-3)" }}>source</span>; the global feed
                  will expose the same tagging in a later pass.
                </div>
              )}
              {sampleData.status === "ok" && sampleData.data && (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>RAW VALUE</span>
                    <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "#00E676" }}>
                      {sampleData.data.rawValue != null ? String(sampleData.data.rawValue) : "null"}
                    </span>
                  </div>
                  <MetricRow label="RESPONSE TIME" value={`${sampleData.data.responseTime}ms`} valueColor={sampleData.data.responseTime > 2000 ? "#FFD740" : "#00E676"} />
                  <MetricRow label="TIMESTAMP" value={sampleData.data.timestamp ? new Date(sampleData.data.timestamp).toLocaleTimeString("en-US", { hour12: false }) : "—"} />
                  <MetricRow label="SAMPLE TICKER" value={item.source === "coingecko" ? "ping" : item.source === "fred" ? "DGS10" : "AAPL"} />
                </div>
              )}
              {sampleData.status === "error" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--c-error)" }}>Fetch failed</span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-error)", background: "rgba(255,82,82,0.08)", borderRadius: 4, padding: "6px 10px" }}>
                    {sampleData.error || "Unknown error"}
                  </div>
                  {item.fallback && (
                    <div style={{ fontFamily: mono, fontSize: 9, color: "#FFD740", marginTop: 6 }}>
                      Fallback available: {SOURCE_LABELS[item.fallback]}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reliability History */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>RELIABILITY</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <MetricBox label="SUCCESS RATE" value={history.length > 0 ? `${successCount}/${history.length}` : "—"} valueColor={successCount === history.length ? "#00E676" : "#FFD740"} />
              <MetricBox label="AVG RESPONSE" value={avgTime > 0 ? `${avgTime}ms` : "—"} valueColor={avgTime > 2000 ? "var(--c-error)" : avgTime > 500 ? "#FFD740" : "var(--c-text)"} />
            </div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px", marginBottom: 6 }}>LAST 10 CHECKS</div>
              <SuccessRateDots history={history} />
            </div>
            {item.source === "yahoo" && (
              <div style={{ fontFamily: sans, fontSize: 10, color: "var(--c-text-3)", marginTop: 6, lineHeight: 1.4 }}>
                Yahoo Finance is an unofficial API based on web scraping. It may experience intermittent outages or structural changes without notice.
              </div>
            )}
          </div>

          {/* Fallback Information */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>FALLBACK</div>
            {item.fallback ? (
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>FALLBACK SOURCE:</span>
                  <SourceBadge source={item.fallback} />
                </div>
                <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.4 }}>
                  If {SOURCE_LABELS[item.source]} is unavailable, this data point will automatically attempt to load from {SOURCE_LABELS[item.fallback]}.
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(255,215,64,0.06)", border: "1px solid rgba(255,215,64,0.15)", borderRadius: 6, padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 9, color: "#FFD740", letterSpacing: "0.5px" }}>SINGLE POINT OF FAILURE</span>
                </div>
                <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-3)", marginTop: 4, lineHeight: 1.4 }}>
                  No fallback source is configured. If {SOURCE_LABELS[item.source]} goes down, this data point will be unavailable.
                </div>
              </div>
            )}
          </div>

        </div>
    </>
  );
}

// ─── QUOTA DASHBOARD ─────────────────────────────────────────────────────────

const QUOTA_HEALTH_COLORS = {
  healthy:   { color: "#00E676", bg: "rgba(0,230,118,0.08)",  border: "rgba(0,230,118,0.3)"  },
  warning:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)" },
  critical:  { color: "var(--c-error)", bg: "rgba(255,82,82,0.08)",  border: "rgba(255,82,82,0.3)"  },
  exhausted: { color: "var(--c-error)", bg: "rgba(255,82,82,0.08)",  border: "rgba(255,82,82,0.3)"  },
};

// ── QuotaDashboard helpers ────────────────────────────────────────────────────

const QD_CARD_ORDER = ['alphaVantage', 'fmp', 'finnhub', 'coingecko', 'brapi', 'yahoo', 'fred', '_bcb'];

function qdFmtReset(nextDayResetISO) {
  if (!nextDayResetISO) return null;
  const diff = new Date(nextDayResetISO) - Date.now();
  if (diff <= 0) return 'Soon';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function qdBarColor(pct) {
  if (pct < 0.6) return '#00E676';
  if (pct < 0.8) return '#f59e0b';
  return 'var(--c-error)';
}

function qdExportCSV(allStatus) {
  const rows = [['API', 'Endpoint', 'Calls', 'Daily Limit', 'Pct of Limit']];
  getAllApiIds().forEach(apiId => {
    const s = allStatus[apiId] ?? {};
    const byEp = s.sessionByEndpoint ?? {};
    Object.entries(byEp).forEach(([ep, count]) => {
      if (ep === '_total' || !count) return;
      const lim = s.perDayLimit;
      const pct = lim ? ((count / lim) * 100).toFixed(1) + '%' : '—';
      rows.push([apiId, ep, count, lim ?? 'unlimited', pct]);
    });
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'quota-session-log.csv'; a.click();
  URL.revokeObjectURL(url);
}

function QuotaDashboard() {
  const [allStatus, setAllStatus]           = useState({});
  const [cacheStats, setCacheStats]         = useState({ byApi: {}, global: { hits: 0, misses: 0, hitRate: 0, totalEntries: 0 } });
  const [deferredSizes, setDeferredSizes]   = useState({});
  const [expandedEp, setExpandedEp]         = useState({});   // apiId → bool (endpoints expanded)
  const [sessionLogOpen, setSessionLogOpen] = useState(false);
  const [confirmReset, setConfirmReset]     = useState({});   // apiId → bool
  const [lastRefresh, setLastRefresh]       = useState(Date.now());
  const [now, setNow]                       = useState(Date.now());
  const cardRefs = useRef({});

  const refreshAll = useCallback(() => {
    setAllStatus(quotaTracker.getAllQuotaStatus());
    setCacheStats(getCacheStats());
    setDeferredSizes(apiClient.getDeferredQueueSizes());
    setLastRefresh(Date.now());
  }, []);

  useEffect(() => {
    refreshAll();
    const full = setInterval(refreshAll, 15_000);
    const mini = setInterval(() => setAllStatus(quotaTracker.getAllQuotaStatus()), 5_000);
    return () => { clearInterval(full); clearInterval(mini); };
  }, [refreshAll]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const dormantEndpoints = getDormantEndpoints();
  const globalHits       = cacheStats.global?.hits ?? 0;
  const globalMisses     = cacheStats.global?.misses ?? 0;
  const globalHitRate    = cacheStats.global?.hitRate ?? 0;
  const globalEntries    = cacheStats.global?.totalEntries ?? 0;
  const secondsAgo       = Math.round((now - lastRefresh) / 1000);

  // ── Per-card data helper ────────────────────────────────────────────────────
  function getCardData(cardId) {
    if (cardId === '_bcb') {
      const bcbS  = allStatus['bcb']  ?? {};
      const awsS  = allStatus['awesomeapi'] ?? {};
      const bcbA  = getApiDef('bcb');
      const awsA  = getApiDef('awesomeapi');
      const byEp  = { ...(bcbS.sessionByEndpoint ?? {}), ...(awsS.sessionByEndpoint ?? {}) };
      const total = (bcbS.sessionTotal ?? 0) + (awsS.sessionTotal ?? 0);
      byEp._total = total;
      return {
        api: { ...bcbA, name: 'BCB + AwesomeAPI', endpoints: [...(bcbA?.endpoints ?? []), ...(awsA?.endpoints ?? [])] },
        status: { ...bcbS, sessionTotal: total, sessionByEndpoint: byEp },
        health: 'healthy', isUnmetered: true,
        deferred: (deferredSizes['bcb'] ?? 0) + (deferredSizes['awesomeapi'] ?? 0),
        cache: cacheStats.byApi?.['bcb'] ?? null,
      };
    }
    const api      = getApiDef(cardId);
    const status   = allStatus[cardId] ?? {};
    const health   = status.health ?? 'healthy';
    const isUnmetered = !api?.limits?.perDay && !api?.limits?.perMinute;
    return { api, status, health, isUnmetered, deferred: deferredSizes[cardId] ?? 0, cache: cacheStats.byApi?.[cardId] ?? null };
  }

  // ── Reset handler ─────────────────────────────────────────────────────────
  function handleReset(cardId) {
    if (cardId === '_bcb') {
      quotaTracker.resetCounters('bcb');
      quotaTracker.resetCounters('awesomeapi');
    } else {
      quotaTracker.resetCounters(cardId);
    }
    refreshAll();
    setConfirmReset(prev => ({ ...prev, [cardId]: true }));
    setTimeout(() => setConfirmReset(prev => { const n = { ...prev }; delete n[cardId]; return n; }), 2000); /* reset confirm timeout ms */
  }

  function handleResetAll() {
    getAllApiIds().forEach(id => quotaTracker.resetCounters(id));
    refreshAll();
  }

  // ── Tier pill style ────────────────────────────────────────────────────────
  function tierPill(tier) {
    if (!tier) return null;
    const t = tier.toLowerCase();
    const isUnlim    = t.includes('unlimited') || t.includes('public') || t.includes('no key');
    const isUnofficial = t.includes('unofficial') || t.includes('proxy');
    const color  = isUnlim ? '#00E676' : isUnofficial ? '#f59e0b' : 'var(--c-text-3)';
    const bg     = isUnlim ? 'rgba(0,230,118,0.08)' : isUnofficial ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)';
    const border = isUnlim ? 'rgba(0,230,118,0.3)' : isUnofficial ? 'rgba(245,158,11,0.3)' : 'var(--c-border)';
    const label  = isUnlim ? 'UNLIMITED' : isUnofficial ? 'UNOFFICIAL' : 'FREE';
    return (
      <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.6px', color, background: bg, border: `1px solid ${border}`, borderRadius: 3, padding: '2px 7px' }}>
        {label}
      </span>
    );
  }

  // ── Progress bar subcomponent ─────────────────────────────────────────────
  function QuotaBar({ used, limit, label }) {
    const pct   = limit ? Math.min(used / limit, 1) : 0;
    const color = qdBarColor(pct);
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)' }}>{label}</span>
          <span style={{ fontFamily: mono, fontSize: 9, color }}>{used}/{limit}</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    );
  }

  // ── Summary strip badges ───────────────────────────────────────────────────
  const summaryItems = QD_CARD_ORDER.map(cardId => {
    const { api, status, health, isUnmetered } = getCardData(cardId);
    const hc = QUOTA_HEALTH_COLORS[health] ?? QUOTA_HEALTH_COLORS.healthy;
    const remaining = status.perDayRemaining ?? status.perMinuteRemaining ?? null;
    const limit     = status.perDayLimit ?? status.perMinuteLimit ?? null;
    return { cardId, name: api?.name ?? cardId, health, hc, remaining, limit, isUnmetered };
  });

  // ── Session log rows ──────────────────────────────────────────────────────
  const sessionRows = [];
  getAllApiIds().forEach(apiId => {
    const s = allStatus[apiId] ?? {};
    const byEp = s.sessionByEndpoint ?? {};
    Object.entries(byEp).forEach(([ep, count]) => {
      if (ep === '_total' || !count) return;
      const lim = s.perDayLimit;
      const pct = lim ? ((count / lim) * 100).toFixed(1) + '%' : '—';
      sessionRows.push({ apiId, ep, count, lim, pct });
    });
  });
  sessionRows.sort((a, b) => b.count - a.count);
  const sessionTotal = sessionRows.reduce((s, r) => s + r.count, 0);

  return (
    <div style={{ padding: "20px 0", borderBottom: "1px solid var(--c-border)" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px" }}>
            API QUOTA MANAGEMENT
          </div>
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>
            Updated {secondsAgo}s ago
          </span>
          {globalHits > 0 && (
            <span style={{ fontFamily: mono, fontSize: 9, color: "#00E676" }}>
              ↑ {globalHits} cache saves
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => qdExportCSV(allStatus)} style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
            ↓ Export Log
          </button>
          <button onClick={handleResetAll} style={{ fontFamily: mono, fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
            ↺ Reset All
          </button>
          <button onClick={refreshAll} style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-2)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Section 1: Summary strip ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {summaryItems.map(({ cardId, name, health, hc, remaining, limit, isUnmetered }) => (
          <div
            key={cardId}
            onClick={() => cardRefs.current[cardId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: hc.color, background: hc.bg, border: `1px solid ${hc.border}`,
              borderRadius: 4, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: hc.color, display: 'inline-block', flexShrink: 0, animation: health === 'exhausted' ? 'pulse 1s ease-in-out infinite' : undefined }} />
            {name.split(' ')[0].toUpperCase()}
            {isUnmetered ? ' ∞' : limit != null ? ` ${remaining ?? '?'}/${limit}` : ''}
          </div>
        ))}
      </div>

      {/* ── Section 2: API cards grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
        {QD_CARD_ORDER.map(cardId => {
          const { api, status, health, isUnmetered, deferred, cache } = getCardData(cardId);
          const hc = QUOTA_HEALTH_COLORS[health] ?? QUOTA_HEALTH_COLORS.healthy;
          const isExhaustedCard = health === 'exhausted';
          const epExpanded = !!expandedEp[cardId];
          const isConfirm  = !!confirmReset[cardId];
          const resetTime  = qdFmtReset(status.nextDayResetISO);
          const byEp = status.sessionByEndpoint ?? {};
          const apiHits = cache?.totals?.hits ?? 0;

          return (
            <div
              key={cardId}
              ref={el => { if (el) cardRefs.current[cardId] = el; }}
              style={{
                background: isExhaustedCard ? 'rgba(255,82,82,0.04)' : 'var(--c-surface)',
                border: `1px solid ${isExhaustedCard ? 'rgba(255,82,82,0.27)' : 'var(--c-border)'}`,
                borderRadius: 8, overflow: 'hidden', minHeight: 220,
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Card header */}
              <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: hc.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: 'var(--c-text-1)', lineHeight: 1.3 }}>
                      {api?.name ?? cardId}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tierPill(api?.currentTier)}
                    <button
                      title={`Reset ${api?.name ?? cardId} quota counters`}
                      onClick={() => isConfirm ? null : handleReset(cardId)}
                      style={{ fontFamily: mono, fontSize: 10, color: isConfirm ? '#00E676' : 'var(--c-text-3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      {isConfirm ? '✓' : '↺'}
                    </button>
                  </div>
                </div>
                {api?.baseUrl && (
                  <div style={{ fontFamily: sans, fontSize: 10, color: 'var(--c-text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {api.baseUrl.replace('https://', '')}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, padding: '10px 12px' }}>
                {/* Exhausted badge */}
                {isExhaustedCard && (
                  <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: 'var(--c-error)', letterSpacing: '0.12em' }}>QUOTA EXHAUSTED</span>
                    {resetTime && <div style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', marginTop: 2 }}>Resets in {resetTime}</div>}
                  </div>
                )}

                {/* Quota bars */}
                {!isUnmetered && (
                  <div style={{ opacity: isExhaustedCard ? 0.5 : 1 }}>
                    {status.perDayLimit != null && (
                      <QuotaBar used={status.perDayUsed ?? 0} limit={status.perDayLimit} label="Daily" />
                    )}
                    {status.perMinuteLimit != null && (
                      <QuotaBar used={status.perMinuteUsed ?? 0} limit={status.perMinuteLimit} label="Per-min (rolling)" />
                    )}
                    {resetTime && !isExhaustedCard && (
                      <div style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', marginBottom: 8 }}>
                        Resets in {resetTime}
                      </div>
                    )}
                  </div>
                )}

                {/* Unlimited note */}
                {isUnmetered && !isExhaustedCard && (
                  <div style={{ fontFamily: sans, fontSize: 11, color: 'var(--c-text-3)', fontStyle: 'italic', marginBottom: 8 }}>
                    Unlimited — tracked for observability only
                  </div>
                )}

                {/* Session calls */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', letterSpacing: '0.8px', marginBottom: 4 }}>SESSION CALLS</div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: 'var(--c-text-2)', marginBottom: 4 }}>
                    {status.sessionTotal ?? 0} calls
                    {apiHits > 0 && <span style={{ color: '#00E676', marginLeft: 8 }}>· {apiHits} cached</span>}
                  </div>
                  {Object.entries(byEp).filter(([k, v]) => k !== '_total' && v > 0).map(([ep, count]) => (
                    <div key={ep} style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)' }}>
                      {ep} ×{count}
                    </div>
                  ))}
                  {(status.sessionTotal ?? 0) === 0 && (
                    <div style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', fontStyle: 'italic' }}>No calls this session</div>
                  )}
                </div>

                {deferred > 0 && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#f59e0b', marginBottom: 8 }}>{deferred} deferred</div>
                )}
              </div>

              {/* Health bar */}
              <div style={{ height: 4, background: hc.color, opacity: 0.7 }} />

              {/* Endpoints collapsible */}
              {api?.endpoints?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--c-border)' }}>
                  <button
                    onClick={() => setExpandedEp(prev => ({ ...prev, [cardId]: !prev[cardId] }))}
                    style={{ width: '100%', padding: '6px 12px', fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.6px' }}
                  >
                    ENDPOINTS {epExpanded ? '▴' : '▾'}
                  </button>
                  {epExpanded && (
                    <div style={{ padding: '0 12px 10px' }}>
                      {api.endpoints.map(ep => (
                        <div key={ep.id} style={{ display: 'flex', gap: 6, alignItems: 'baseline', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontFamily: mono, fontSize: 9, color: ep.status === 'dormant' ? 'var(--c-text-3)' : 'var(--c-text-2)', fontStyle: ep.status === 'dormant' ? 'italic' : 'normal', flexShrink: 0 }}>
                            {ep.status === 'dormant' ? '○' : '●'} {ep.id}
                          </span>
                          <span style={{ fontFamily: mono, fontSize: 8, color: 'var(--c-text-3)' }}>
                            {ep.cacheTTL}s TTL
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Server-side quote engine (not client-quota-tracked) ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 4 }}>
          SERVER-SIDE QUOTE ENGINE
        </div>
        <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-3)", marginBottom: 10, lineHeight: 1.4 }}>
          Primary live quotes are fetched once by the backend and shared across all users — so their
          usage is managed server-side and is <strong>not</strong> counted by the client quota tracker above.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {[
            { id: "eodhd", role: "Primary · global equities, indices, FX, ETFs", plan: "All-World plan", budget: "≈100k calls/day", cadence: "~180s cycle · batch ≤20/req", endpoint: "/api/v1/quotes/live" },
            { id: "brapi", role: "Primary · Brazil B3 (equities, FIIs, ETFs)", plan: "BRAPI Pro", budget: "500k calls/month", cadence: "~5-min cycle · batch 20/req", endpoint: "/api/v1/quotes/brazil" },
          ].map(feed => {
            const c = SOURCE_COLORS[feed.id];
            return (
              <div key={feed.id} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--c-text-1)" }}>{SOURCE_LABELS[feed.id]}</span>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.6px", color: c, background: c + "18", border: `1px solid ${c}40`, borderRadius: 3, padding: "2px 7px" }}>
                    {feed.plan}
                  </span>
                </div>
                <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.4, marginBottom: 8 }}>{feed.role}</div>
                <div style={{ display: "grid", gap: 3 }}>
                  <MetricRow label="BUDGET" value={feed.budget} />
                  <MetricRow label="CADENCE" value={feed.cadence} />
                  <MetricRow label="ENDPOINT" value={feed.endpoint} />
                </div>
                <div style={{ fontFamily: mono, fontSize: 8, color: "var(--c-text-3)", letterSpacing: "0.4px", marginTop: 8 }}>
                  MANAGED SERVER-SIDE · NOT CLIENT-TRACKED
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Session log table ── */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setSessionLogOpen(v => !v)}
          style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.8px', padding: 0, marginBottom: sessionLogOpen ? 10 : 0 }}
        >
          SESSION LOG {sessionLogOpen ? '▴' : '▾'}
        </button>
        {sessionLogOpen && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', letterSpacing: '0.8px' }}>CALL LOG — THIS SESSION</span>
              <button onClick={() => qdExportCSV(allStatus)} style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>↓ Export CSV</button>
            </div>
            {sessionRows.length === 0 ? (
              <div style={{ padding: '14px 12px', fontFamily: mono, fontSize: 10, color: 'var(--c-text-3)', fontStyle: 'italic' }}>
                No API calls recorded this session yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--c-border)' }}>
                    {['API', 'Endpoint', 'Calls', '% of Limit'].map(h => (
                      <th key={h} style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', textAlign: 'left', padding: '6px 12px', fontWeight: 600, letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ fontFamily: mono, fontSize: 9, color: SOURCE_COLORS[r.apiId] ?? 'var(--c-text-2)', padding: '5px 12px', fontWeight: 700 }}>{r.apiId}</td>
                      <td style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-2)', padding: '5px 12px' }}>{r.ep}</td>
                      <td style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-1)', padding: '5px 12px', fontWeight: 700 }}>{r.count}</td>
                      <td style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', padding: '5px 12px' }}>{r.pct}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid var(--c-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <td colSpan={2} style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-3)', padding: '5px 12px' }}>Total tracked calls this session</td>
                    <td style={{ fontFamily: mono, fontSize: 9, color: 'var(--c-text-1)', padding: '5px 12px', fontWeight: 700 }}>{sessionTotal}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Dormant endpoints ── */}
      {dormantEndpoints.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 7 }}>
            DORMANT ({dormantEndpoints.length}) — defined in dataServices.js, not wired to any component
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {dormantEndpoints.map(({ apiId, apiName, endpoint }) => (
              <span key={`${apiId}:${endpoint.id}`} style={{
                fontFamily: mono, fontSize: 9, letterSpacing: "0.3px",
                color: "var(--c-text-3)", background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--c-border)", borderRadius: 4, padding: "3px 10px",
              }}>
                {apiName} · {endpoint.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Global stats footer ── */}
      <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: "#00E676" }}>
          ↑ {globalHits} calls served from cache
        </span>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>
          {globalHits} hits · {globalMisses} misses · {Math.round(globalHitRate * 100)}% hit rate
        </span>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)" }}>
          {globalEntries} entries cached
        </span>
        {(cacheStats.global?.staleServed ?? 0) > 0 && (
          <span style={{ fontFamily: mono, fontSize: 9, color: "#f59e0b" }}>
            {cacheStats.global.staleServed} stale-served
          </span>
        )}
      </div>
    </div>
  );
}

// ─── MAIN CATALOG PAGE ───────────────────────────────────────────────────────

export default function CatalogPage() {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [sourceHealth, setSourceHealth] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const healthCacheRef = useRef(null);

  // Close source detail drawer on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setSelectedSource(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Run all health checks on mount (with 60s sessionStorage cache)
  const runHealthCheck = useCallback(async (source) => {
    setSourceHealth(prev => ({ ...prev, [source]: { ...prev[source], checking: true } }));
    const result = await healthPing(source);
    setSourceHealth(prev => ({ ...prev, [source]: { ...result, checking: false } }));
    // Update cache
    try {
      const raw = sessionStorage.getItem("catalog:health");
      const cache = raw ? JSON.parse(raw) : {};
      cache[source] = result;
      cache._ts = Date.now();
      sessionStorage.setItem("catalog:health", JSON.stringify(cache));
    } catch { /* ignore */ }
  }, []);

  const runAllHealthChecks = useCallback(() => {
    ALL_SOURCES.forEach(src => runHealthCheck(src));
  }, [runHealthCheck]);

  useEffect(() => {
    // Check sessionStorage cache first (60s TTL)
    try {
      const raw = sessionStorage.getItem("catalog:health");
      if (raw) {
        const cache = JSON.parse(raw);
        if (cache._ts && Date.now() - cache._ts < 300_000) { // 5min TTL
          const restored = {};
          ALL_SOURCES.forEach(src => {
            if (cache[src]) restored[src] = { ...cache[src], checking: false };
          });
          if (Object.keys(restored).length === ALL_SOURCES.length) {
            setSourceHealth(restored);
            healthCacheRef.current = true;
            return;
          }
        }
      }
    } catch { /* ignore */ }
    runAllHealthChecks();
  }, [runAllHealthChecks]);

  const usage = getApiUsage();

  const filteredCatalog = CATALOG.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      if (sourceFilter !== "all" && item.source !== sourceFilter && item.fallback !== sourceFilter) return false;
      if (issuesOnly) {
        const srcStatus = sourceHealth[item.source]?.status;
        return srcStatus === "degraded" || srcStatus === "outage" || srcStatus === "rate-limited";
      }
      return true;
    }),
  })).filter(cat => cat.items.length > 0);

  const totalActive = CATALOG.flatMap(c => c.items).filter(i => i.status === "active").length;
  const totalPlanned = CATALOG.flatMap(c => c.items).filter(i => i.status === "planned").length;
  const totalPoints = CATALOG.flatMap(c => c.items).length;
  const issueCount = CATALOG.flatMap(c => c.items).filter(i => {
    const s = sourceHealth[i.source]?.status;
    return s === "degraded" || s === "outage" || s === "rate-limited";
  }).length;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px 40px" }}>
      {/* Header */}
      <div style={{ padding: "24px 0 20px", borderBottom: "1px solid var(--c-border)" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-0.5px" }}>Data Catalog</div>
        <div style={{ fontFamily: sans, fontSize: 13, color: "var(--c-text-2)", marginTop: 4 }}>
          How every data point is sourced — providers, precedence, coverage and live reachability
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, fontFamily: mono, fontSize: 11 }}>
          <span style={{ color: "var(--c-text-3)" }}>{ALL_SOURCES.length} sources</span>
          <span style={{ color: "var(--c-text-3)" }}>{totalPoints} data points</span>
          <span style={{ color: "#00E676" }}>{totalActive} active</span>
          <span style={{ color: "#FFD740" }}>{totalPlanned} planned</span>
          {issueCount > 0 && <span style={{ color: "var(--c-error)" }}>{issueCount} issues</span>}
        </div>

        {/* How quotes are sourced — the live precedence, stated plainly */}
        <div style={{ marginTop: 16, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>HOW LIVE QUOTES ARE SOURCED</div>
          <div style={{ display: "grid", gap: 6, fontFamily: sans, fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.5 }}>
            <div>
              <SourceBadge source="fmp" /> <span style={{ color: "var(--c-text-3)" }}>→</span> <SourceBadge source="eodhd" /> <span style={{ color: "var(--c-text-3)" }}>→</span> <SourceBadge source="yahoo" />
              {"  "}Equities, FX &amp; ETFs — <strong>FMP Premium primary</strong> (real-time), EODHD warm fallback, Yahoo last resort. Indices are <strong>EODHD primary</strong> (FMP for US/FTSE/Nikkei/HSI/STOXX). Merged server-side into one quote per symbol.
            </div>
            <div>
              <SourceBadge source="brapi" /> <span style={{ color: "var(--c-text-3)" }}>→</span> <SourceBadge source="eodhd" /> <span style={{ color: "var(--c-text-3)" }}>→</span> <SourceBadge source="yahoo" />
              {"  "}Brazil B3 — <strong>BRAPI Pro primary</strong> (batch 20/req, ~5-min, full fields), EODHD <code style={{ fontFamily: mono }}>.SA</code> then Yahoo <code style={{ fontFamily: mono }}>.SA</code> fallback.
            </div>
            <div>
              <SourceBadge source="coingecko" />{"  "}Crypto (BTC / ETH / SOL). <SourceBadge source="fmp" style={{ marginLeft: 8 }} /> gold &amp; silver; charts run on FMP/BRAPI/EODHD. <SourceBadge source="yahoo" style={{ marginLeft: 8 }} /> is last-resort only (+ the WTI/natgas live quote).
            </div>
            <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>
              On-demand fundamentals, technicals, news &amp; macro use FMP, Finnhub, Alpha Vantage, FRED, BCB &amp; AwesomeAPI directly from the browser.
            </div>
          </div>
        </div>
      </div>

      {/* ── PHASE 1: SOURCE HEALTH DASHBOARD ── */}
      <div style={{ padding: "20px 0", borderBottom: "1px solid var(--c-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px" }}>SOURCE HEALTH</div>
          <button
            onClick={runAllHealthChecks}
            style={{
              fontFamily: mono, fontSize: 10, fontWeight: 600, color: "var(--c-text-2)",
              background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6,
              padding: "5px 14px", cursor: "pointer", letterSpacing: "0.5px", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = "#00E676"; e.target.style.color = "#00E676"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "var(--c-border)"; e.target.style.color = "var(--c-text-2)"; }}
          >
            REFRESH ALL
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {ALL_SOURCES.map(src => (
            <SourceHealthCard
              key={src}
              source={src}
              health={sourceHealth[src]}
              usage={usage[src] || 0}
              onRefresh={runHealthCheck}
              onSelect={setSelectedSource}
            />
          ))}
        </div>

        {/* Yahoo-specific global warning */}
        {sourceHealth.yahoo?.status === "outage" && (
          <div style={{ background: "rgba(255,82,82,0.06)", border: "1px solid rgba(255,82,82,0.2)", borderRadius: 6, padding: "10px 16px", marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "var(--c-error)", fontWeight: 700, letterSpacing: "0.5px" }}>YAHOO FINANCE UNAVAILABLE</div>
              <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                Yahoo is an unofficial API and may break without notice. It is now only a last-resort fallback — FMP/EODHD/BRAPI serve quotes, charts, market cap and 52-week ranges — so a Yahoo outage is largely invisible. The one exception is the WTI/natgas (CL=F/NG=F) live quote, which has no paid single-quote source.
              </div>
            </div>
          </div>
        )}

        {/* Rate limit warnings */}
        {ALL_SOURCES.filter(src => {
          const m = SOURCE_META[src];
          return m.rateLimitMax && (usage[src] || 0) > m.rateLimitMax * 0.7;
        }).map(src => {
          const m = SOURCE_META[src];
          const u = usage[src] || 0;
          const isRed = u > m.rateLimitMax * 0.9;
          return (
            <div key={src} style={{
              background: isRed ? "rgba(255,82,82,0.06)" : "rgba(255,215,64,0.06)",
              border: `1px solid ${isRed ? "rgba(255,82,82,0.2)" : "rgba(255,215,64,0.2)"}`,
              borderRadius: 6, padding: "8px 16px", marginTop: 8,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <SourceBadge source={src} />
              <span style={{ fontFamily: mono, fontSize: 10, color: isRed ? "var(--c-error)" : "#FFD740" }}>
                {u}/{m.rateLimitMax} calls used this session ({m.rateLimitPer})
              </span>
            </div>
          );
        })}
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{ padding: "12px 0", borderBottom: "1px solid var(--c-border)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginRight: 4 }}>FILTER:</span>
        <button
          onClick={() => { setSourceFilter("all"); setIssuesOnly(false); }}
          style={{
            fontFamily: sans, fontSize: 12, fontWeight: 600,
            color: sourceFilter === "all" && !issuesOnly ? "#00E676" : "var(--c-text-2)",
            background: sourceFilter === "all" && !issuesOnly ? "rgba(0,230,118,0.08)" : "var(--c-surface)",
            border: `1px solid ${sourceFilter === "all" && !issuesOnly ? "#00E67640" : "var(--c-border)"}`,
            borderRadius: 20, padding: "5px 14px", cursor: "pointer", transition: "all 0.15s ease",
          }}
        >
          All Sources
        </button>
        {ALL_SOURCES.map(src => {
          const active = sourceFilter === src;
          const c = SOURCE_COLORS[src];
          const srcStatus = sourceHealth[src]?.status;
          const dotColor = srcStatus === "operational" ? "#00E676" : srcStatus === "degraded" ? "#FFD740" : srcStatus === "outage" ? "var(--c-error)" : "var(--c-text-3)";
          return (
            <button key={src} onClick={() => { setSourceFilter(src); setIssuesOnly(false); }}
              style={{
                fontFamily: mono, fontSize: 10, fontWeight: 700,
                color: active ? c : "var(--c-text-3)",
                background: active ? c + "18" : "var(--c-surface)",
                border: `1px solid ${active ? c + "50" : "var(--c-border)"}`,
                borderRadius: 20, padding: "5px 12px", cursor: "pointer",
                letterSpacing: "0.3px", transition: "all 0.15s ease",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
              {SOURCE_LABELS[src]}
            </button>
          );
        })}
        <div style={{ width: 1, height: 20, background: "var(--c-border)", margin: "0 2px" }} />
        <button
          onClick={() => { setIssuesOnly(!issuesOnly); setSourceFilter("all"); }}
          style={{
            fontFamily: mono, fontSize: 10, fontWeight: 700,
            color: issuesOnly ? "var(--c-error)" : "var(--c-text-3)",
            background: issuesOnly ? "rgba(255,82,82,0.1)" : "var(--c-surface)",
            border: `1px solid ${issuesOnly ? "rgba(255,82,82,0.4)" : "var(--c-border)"}`,
            borderRadius: 20, padding: "5px 12px", cursor: "pointer",
            letterSpacing: "0.3px", transition: "all 0.15s ease",
          }}
        >
          Issues only {issueCount > 0 ? `(${issueCount})` : ""}
        </button>
      </div>

      {/* ── DATA POINT CARDS ── */}
      {filteredCatalog.map((cat, idx) => (
        <div key={cat.category} style={{ marginTop: 24, animation: "slideUp 0.4s ease both", animationDelay: `${idx * 0.06}s` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>{cat.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.3px" }}>{cat.category}</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)" }}>({cat.items.length})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {cat.items.map(item => (
              <CatalogCard key={item.name} item={item} sourceHealth={sourceHealth} onClick={setSelectedItem} />
            ))}
          </div>
        </div>
      ))}

      {/* ── ASSET GROUPS ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>📂</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.3px" }}>Asset Groups</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)" }}>({ASSET_GROUPS.length})</span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 11, color: "var(--c-text-3)", marginBottom: 14 }}>
          Click a group to filter data points by its primary source.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {ASSET_GROUPS.map(g => (
            <AssetGroupCard
              key={g.name}
              group={g}
              onFilter={(src) => { setSourceFilter(src); setIssuesOnly(false); }}
            />
          ))}
        </div>
      </div>

      {/* ── QUOTA MANAGEMENT ── */}
      <div style={{ marginTop: 32 }}>
        <QuotaDashboard />
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 14, marginTop: 32, fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>
        {ALL_SOURCES.length} SOURCES · {totalPoints} DATA POINTS · {totalActive} ACTIVE · {totalPlanned} PLANNED · {ASSET_GROUPS.length} GROUPS
      </div>

      {/* ── DATA POINT SLIDE-IN PANEL ── */}
      {selectedItem && (
        <>
          <div onClick={() => setSelectedItem(null)} style={{ position: "fixed", inset: 0, background: "var(--c-overlay)", zIndex: 300 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(480px, 100vw)",
            background: "var(--c-panel)", borderLeft: "1px solid var(--c-border)",
            zIndex: 301, overflowY: "auto",
            animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1) both",
          }}>
            <PanelErrorBoundary>
              <DataPointPanel item={selectedItem} sourceHealth={sourceHealth} onClose={() => setSelectedItem(null)} />
            </PanelErrorBoundary>
          </div>
        </>
      )}

      {/* ── SOURCE DETAIL DRAWER ── */}
      {selectedSource && (
        <>
          <div
            onClick={() => setSelectedSource(null)}
            style={{ position: "fixed", inset: 0, background: "var(--c-overlay)", zIndex: 300 }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(520px, 100vw)",
            background: "var(--c-panel)", borderLeft: "1px solid var(--c-border)",
            zIndex: 301, overflowY: "auto",
            animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1) both",
          }}>
            <PanelErrorBoundary>
              <SourceDetailPanel
                source={selectedSource}
                health={sourceHealth[selectedSource]}
                onClose={() => setSelectedSource(null)}
              />
            </PanelErrorBoundary>
          </div>
        </>
      )}
    </div>
  );
}
