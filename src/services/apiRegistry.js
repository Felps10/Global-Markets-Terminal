/**
 * @fileoverview API Registry — Single source of truth for all external API integrations.
 *
 * Every external API used in this project is defined here with its limits, tiers,
 * endpoints, cache TTLs, and quota metadata. No API limit or endpoint metadata
 * should be hardcoded anywhere else in the codebase.
 *
 * @module apiRegistry
 */

// ─── JSDoc Type Definitions ──────────────────────────────────────────────────

/**
 * @typedef {Object} TierOption
 * @property {string} name
 * @property {number|null} perMinute
 * @property {number|null} perDay
 * @property {number|null} perMonth
 * @property {number} costPerMonth  - USD per month; 0 for free tiers
 * @property {string} notes
 */

/**
 * @typedef {Object} EndpointDef
 * @property {string} id                 - Unique key within this API's endpoints array
 * @property {string} path               - URL path relative to the proxy base path
 * @property {number} callsPerRequest    - API quota units consumed per invocation.
 *                                         Use 0 for variable (e.g. batch: N calls for N symbols).
 *                                         When 0, apiClient MUST receive an explicit callCount
 *                                         argument and will throw if it is absent or zero.
 * @property {string} callsNote          - Human-readable explanation of callsPerRequest
 * @property {number} cacheTTL           - Seconds to cache responses; 0 = no caching
 * @property {'critical'|'high'|'medium'|'low'} priority
 * @property {boolean} canDefer          - Can this call be delayed when quota is low?
 * @property {boolean} canBatch          - Can multiple requests be combined into one call?
 * @property {'active'|'dormant'} [status]
 *   - 'active'  (default): endpoint is called from at least one component.
 *   - 'dormant': function exists in dataServices.js but is not called from any component.
 *               Excluded from quota enforcement; shown distinctly in QuotaDashboard.
 */

/**
 * @typedef {Object} ApiLimits
 * @property {number|null} perMinute  - null = no documented per-minute limit
 * @property {number|null} perDay     - null = no documented per-day limit
 * @property {number|null} perMonth   - null = no documented per-month limit
 */

/**
 * @typedef {Object} ApiDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} baseUrl       - Actual remote API base URL (for docs/reference)
 * @property {string} proxyPath     - Local Vite proxy prefix used in fetch calls
 * @property {string} currentTier   - Human-readable tier name currently in use
 * @property {ApiLimits} limits     - Active limits for the current tier
 * @property {number|null} costPerCall  - USD per call; null if free or unknown
 * @property {string} upgradeUrl    - Link to the API's pricing or plans page
 * @property {string} notes         - Important caveats, warnings, or usage notes
 * @property {TierOption[]} tierOptions - All known tiers for upgrade comparison
 * @property {EndpointDef[]} endpoints  - All endpoints registered for this API
 */

// ─── Registry ────────────────────────────────────────────────────────────────

/** @type {Record<string, ApiDefinition>} */
export const API_REGISTRY = {

  // ── Yahoo Finance ──────────────────────────────────────────────────────────
  yahoo: {
    id: "yahoo",
    name: "Yahoo Finance",
    baseUrl: "https://query1.finance.yahoo.com",
    proxyPath: "/api/yahoo",
    currentTier: "Unofficial (proxy)",
    limits: { perMinute: null, perDay: null, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://finance.yahoo.com",
    notes:
      "⚠ Unofficial scraping-based source — no public API, no SLA, no key. " +
      "Uses CORS proxies (corsproxy.io, allorigins.win) as fallbacks. " +
      "May break without notice when Yahoo changes their internal endpoints.",
    tierOptions: [
      {
        name: "Unofficial (current)",
        perMinute: null,
        perDay: null,
        perMonth: null,
        costPerMonth: 0,
        notes:
          "No rate limit documented, but aggressive use may trigger IP bans. " +
          "Suitable for development and personal use only.",
      },
    ],
    endpoints: [
      {
        id: "quote",
        path: "/v7/finance/quote",
        callsPerRequest: 1,
        callsNote:
          "1 call for any number of comma-separated symbols. Fetched every 30s by market data loop.",
        cacheTTL: 30,
        priority: "critical",
        canDefer: false,
        canBatch: true,
      },
      {
        id: "chart",
        path: "/v8/finance/chart",
        callsPerRequest: 1,
        callsNote: "1 call per symbol per time range. Triggered by user selecting a chart range.",
        cacheTTL: 300, // 5min in-memory; range-keyed
        priority: "high",
        canDefer: true,
        canBatch: false,
      },
    ],
  },

  // ── Finnhub ───────────────────────────────────────────────────────────────
  finnhub: {
    id: "finnhub",
    name: "Finnhub",
    baseUrl: "https://finnhub.io/api/v1",
    proxyPath: "/api/finnhub",
    currentTier: "Free",
    limits: { perMinute: 60, perDay: null, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://finnhub.io/pricing",
    notes:
      "Free tier: 60 calls/min. All requests serialized through a 1-req/sec queue in dataServices.js. " +
      "Called from 4 independent locations: market data fallback, detail panel, NewsPage, MarketHeatmapPage. " +
      "sessionStorage cache shared across call sites to prevent duplicate hits.",
    tierOptions: [
      {
        name: "Free (current)",
        perMinute: 60,
        perDay: null,
        perMonth: null,
        costPerMonth: 0,
        notes:
          "Sufficient for individual use. Queue + cache keeps actual usage well below 60/min.",
      },
      {
        name: "Starter",
        perMinute: 300,
        perDay: null,
        perMonth: null,
        costPerMonth: 50,
        notes: "Suitable for active multi-user use or if background polling increases.",
      },
    ],
    endpoints: [
      {
        id: "quote",
        path: "/quote",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. Used as Yahoo fallback (~24 symbols) and by MarketHeatmapPage (~36 symbols).",
        cacheTTL: 30,
        priority: "critical",
        canDefer: false,
        canBatch: false,
      },
      {
        id: "news",
        path: "/company-news",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. Returns 7-day window, sliced to 5 items. " +
          "Called from detail panel AND NewsPage independently (shared cache prevents duplicate fetch).",
        cacheTTL: 600, // 10min
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
      {
        id: "recommendation",
        path: "/stock/recommendation",
        callsPerRequest: 1,
        callsNote: "1 call per symbol. Returns latest analyst consensus. Called on detail panel open.",
        cacheTTL: 3600, // 1hr
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
      {
        id: "earnings",
        path: "/stock/earnings",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. Defined in dataServices.js but currently not called from any component.",
        cacheTTL: 3600,
        priority: "medium",
        canDefer: true,
        canBatch: false,
        status: "dormant",
      },
      {
        id: "insiderSentiment",
        path: "/stock/insider-sentiment",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. Defined in dataServices.js but currently not called from any component.",
        cacheTTL: 3600,
        priority: "low",
        canDefer: true,
        canBatch: false,
        status: "dormant",
      },
    ],
  },

  // ── Alpha Vantage ─────────────────────────────────────────────────────────
  alphaVantage: {
    id: "alphaVantage",
    name: "Alpha Vantage",
    baseUrl: "https://www.alphavantage.co",
    proxyPath: "/api/alphavantage",
    currentTier: "Free",
    limits: { perMinute: 5, perDay: 25, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://www.alphavantage.co/premium/",
    notes:
      "Free tier: 25 calls/day hard limit, 5 calls/min. " +
      "⚠ ON-DEMAND ONLY — never call on page load or in polling loops. " +
      "Defined in dataServices.js but currently not called from any component (dead UI code). " +
      "24hr cache preserves quota when eventually activated.",
    tierOptions: [
      {
        name: "Free (current)",
        perMinute: 5,
        perDay: 25,
        perMonth: null,
        costPerMonth: 0,
        notes:
          "Extremely tight. 24hr cache is mandatory. Suitable only for occasional on-demand queries.",
      },
      {
        name: "Premium 75",
        perMinute: 75,
        perDay: null,
        perMonth: null,
        costPerMonth: 50,
        notes: "Removes daily cap. Suitable for active technical analysis charts.",
      },
      {
        name: "Premium 150",
        perMinute: 150,
        perDay: null,
        perMonth: null,
        costPerMonth: 100,
        notes: "High-frequency technical analysis. Appropriate for a full trading terminal.",
      },
    ],
    endpoints: [
      {
        id: "rsi",
        path: "/query", // function=RSI
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol+interval+timePeriod combination. Defined but not yet used in the UI.",
        cacheTTL: 86400, // 24hr — mandatory for 25/day budget
        priority: "medium",
        canDefer: true,
        canBatch: false,
        status: "dormant",
      },
      {
        id: "macd",
        path: "/query", // function=MACD
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol+interval combination. Defined but not yet used in the UI.",
        cacheTTL: 86400,
        priority: "medium",
        canDefer: true,
        canBatch: false,
        status: "dormant",
      },
    ],
  },

  // ── FRED ──────────────────────────────────────────────────────────────────
  fred: {
    id: "fred",
    name: "FRED (Federal Reserve Economic Data)",
    baseUrl: "https://api.stlouisfed.org",
    proxyPath: "/api/fred",
    currentTier: "Free (unlimited)",
    limits: { perMinute: null, perDay: null, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://fred.stlouisfed.org/docs/api/api_key.html",
    notes:
      "No documented rate limit. Free and effectively unlimited for normal dashboard use. " +
      "Key required to avoid IP-based limits. 9 economic series configured " +
      "(CPI, GDP, Fed Funds Rate, unemployment, treasury yields, mortgage, consumer sentiment, retail sales).",
    tierOptions: [
      {
        name: "Free (current)",
        perMinute: null,
        perDay: null,
        perMonth: null,
        costPerMonth: 0,
        notes: "Effectively unlimited. 1hr cache is sufficient and courteous to the public API.",
      },
    ],
    endpoints: [
      {
        id: "seriesObservations",
        path: "/series/observations",
        callsPerRequest: 1,
        callsNote:
          "1 call per FRED series ID. Currently fetches: fedRate, consumerSentiment (per group macro banners). " +
          "fredAllMacro() fetches all 9 series sequentially — used only on explicit user action.",
        cacheTTL: 3600, // 1hr — economic data updates daily or monthly
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
    ],
  },

  // ── CoinGecko ─────────────────────────────────────────────────────────────
  coingecko: {
    id: "coingecko",
    name: "CoinGecko",
    baseUrl: "https://api.coingecko.com/api/v3",
    proxyPath: "/api/coingecko",
    currentTier: "Public (no key)",
    limits: { perMinute: 30, perDay: null, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://www.coingecko.com/en/api/pricing",
    notes:
      "Public API: ~30 calls/min (may be lower under load). No key required. " +
      "2min cache for prices means at most 1 actual API call per 2min despite 30s polling interval. " +
      "Fetches BTC, ETH, SOL in one batched call.",
    tierOptions: [
      {
        name: "Public (current)",
        perMinute: 30,
        perDay: null,
        perMonth: null,
        costPerMonth: 0,
        notes: "2min cache keeps usage minimal. Rate limit is per IP, shared across all users.",
      },
      {
        name: "Demo (free API key)",
        perMinute: 30,
        perDay: 10_000,
        perMonth: null,
        costPerMonth: 0,
        notes: "Same rate limit but more predictable. Free with registration at coingecko.com.",
      },
      {
        name: "Analyst",
        perMinute: 500,
        perDay: null,
        perMonth: null,
        costPerMonth: 129,
        notes: "Suitable for high-frequency real-time crypto monitoring.",
      },
    ],
    endpoints: [
      {
        id: "prices",
        path: "/simple/price",
        callsPerRequest: 1,
        callsNote:
          "1 call per batch of coin IDs (BTC+ETH+SOL in one request). Polled every 30s, cached 2min.",
        cacheTTL: 120, // 2min
        priority: "critical",
        canDefer: false,
        canBatch: true,
      },
      {
        id: "trending",
        path: "/search/trending",
        callsPerRequest: 1,
        callsNote:
          "1 call, returns top 7 trending coins. Defined in dataServices.js but not currently used in any component.",
        cacheTTL: 300, // 5min
        priority: "low",
        canDefer: true,
        canBatch: false,
        status: "dormant",
      },
      {
        id: "ping",
        path: "/ping",
        callsPerRequest: 1,
        callsNote: "1 call, health check only. No quota cost.",
        cacheTTL: 0, // health checks must not be cached
        priority: "low",
        canDefer: true,
        canBatch: false,
      },
    ],
  },

  // ── FMP ───────────────────────────────────────────────────────────────────
  fmp: {
    id: "fmp",
    name: "Financial Modeling Prep",
    baseUrl: "https://financialmodelingprep.com/stable",
    proxyPath: "/api/fmp",
    currentTier: "Free",
    limits: { perMinute: null, perDay: 250, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://site.financialmodelingprep.com/developer/docs/pricing",
    notes:
      "Free tier: 250 calls/day. All requests serialized through queue (1 req/sec). " +
      "429 handled with exponential backoff (1s→2s→4s→8s, max 30s, respects Retry-After). " +
      "Profile cache 24hr, ratios/DCF 6hr to preserve daily budget.",
    tierOptions: [
      {
        name: "Free (current)",
        perDay: 250,
        perMinute: null,
        perMonth: null,
        costPerMonth: 0,
        notes:
          "Tight budget. fmpBatchProfile × 80 equity symbols = 80 calls in one run. " +
          "24hr cache means batch runs only once per session day.",
      },
      {
        name: "Starter",
        perDay: 750,
        perMinute: null,
        perMonth: null,
        costPerMonth: 19,
        notes: "3× free budget. Covers full trading day with moderate detail panel usage.",
      },
      {
        name: "Basic",
        perDay: 1_500,
        perMinute: null,
        perMonth: null,
        costPerMonth: 29,
        notes: "Comfortable for active use or team use across multiple sessions.",
      },
    ],
    endpoints: [
      {
        id: "profile",
        path: "/profile",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. Returns company profile, P/E, EPS, sector, beta. " +
          "Called on detail panel open. Also called N times by batchProfile (counted separately).",
        cacheTTL: 86400, // 24hr — profile data changes rarely
        priority: "high",
        canDefer: true,
        canBatch: false, // FMP does not support comma-separated batch
      },
      {
        id: "ratiosTTM",
        path: "/ratios-ttm",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. Returns profit margin, debt/equity, ROE, current ratio. " +
          "Called on detail panel open alongside profile.",
        cacheTTL: 21600, // 6hr — ratios shift quarterly but can change monthly
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
      {
        id: "dcf",
        path: "/discounted-cash-flow",
        callsPerRequest: 1,
        callsNote:
          "1 call per symbol. DCF valuation estimate. " +
          "Defined in dataServices.js but currently not called from any component.",
        cacheTTL: 21600, // 6hr
        priority: "low",
        canDefer: true,
        canBatch: false,
        status: "dormant",
      },
      {
        id: "batchProfile",
        path: "/profile",
        // Variable cost: 1 API call per symbol in the batch.
        // callsPerRequest: 0 is the sentinel for "variable/caller-supplied cost".
        // Layer 4 contract: apiClient MUST receive an explicit callCount = symbols.length.
        //   - quotaTracker.canCall("fmp", "batchProfile", symbols.length)
        //   - quotaTracker.recordCall("fmp", "batchProfile", symbols.length)
        // apiClient throws if callCount is absent or 0 — never silently records 0.
        callsPerRequest: 0,
        callsNote:
          "N calls where N = number of equity symbols (~80). Each symbol is a separate request " +
          "routed through the FMP queue. Runs once on mount; 24hr cache prevents repeat runs. " +
          "Caller MUST supply explicit callCount = symbols.length to apiClient.",
        cacheTTL: 86400, // 24hr
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
    ],
  },

  // ── BRAPI ─────────────────────────────────────────────────────────────────
  brapi: {
    id: "brapi",
    name: "BRAPI (Brazilian B3 Equities)",
    baseUrl: "https://brapi.dev/api",
    proxyPath: "/api/brapi",
    currentTier: "Free",
    // ⚠ UNKNOWN LIMIT: BRAPI does not publish explicit rate limits for the free tier.
    // 100 calls/day is used as a conservative safe assumption. Monitor for 429s.
    limits: { perMinute: null, perDay: 100, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://brapi.dev",
    notes:
      "⚠ Rate limits not officially documented. Safe assumption: 100 calls/day. " +
      "Supports comma-separated tickers in a single batch call. " +
      "30s cache + 30s polling interval means at most 1 actual API call per 30s.",
    tierOptions: [
      {
        name: "Free (current)",
        perMinute: null,
        perDay: 100,
        perMonth: null,
        costPerMonth: 0,
        notes:
          "Assumed limit — not officially documented. If 429s appear, this number needs updating.",
      },
    ],
    endpoints: [
      {
        id: "quote",
        path: "/quote/{tickers}",
        callsPerRequest: 1,
        callsNote:
          "1 call for all B3 tickers comma-separated in a single request (~14 B3 stocks). " +
          "Polled every 30s alongside Yahoo market data.",
        cacheTTL: 30,
        priority: "critical",
        canDefer: false,
        canBatch: true,
      },
    ],
  },

  // ── BCB ───────────────────────────────────────────────────────────────────
  bcb: {
    id: "bcb",
    name: "BCB (Banco Central do Brasil)",
    baseUrl: "https://api.bcb.gov.br/dados/serie/bcdata.sgs",
    proxyPath: "/api/bcb",
    currentTier: "Public (no key, unlimited)",
    limits: { perMinute: null, perDay: null, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://dadosabertos.bcb.gov.br",
    notes:
      "Brazilian central bank open data API. No key required, no documented rate limit. " +
      "Fetches SELIC, IPCA, and CDI rates in parallel (3 calls per bcbMacro() invocation). " +
      "1hr cache is sufficient — these rates change monthly.",
    tierOptions: [
      {
        name: "Public (current)",
        perMinute: null,
        perDay: null,
        perMonth: null,
        costPerMonth: 0,
        notes: "Effectively unlimited. Very stable government API.",
      },
    ],
    endpoints: [
      {
        id: "selic",
        path: "/432/dados/ultimos/1",
        callsPerRequest: 1,
        callsNote: "1 call for latest SELIC interest rate. Fetched in parallel with IPCA and CDI.",
        cacheTTL: 3600,
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
      {
        id: "ipca",
        path: "/433/dados/ultimos/1",
        callsPerRequest: 1,
        callsNote: "1 call for latest IPCA inflation rate. Fetched in parallel with SELIC and CDI.",
        cacheTTL: 3600,
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
      {
        id: "cdi",
        path: "/4389/dados/ultimos/1",
        callsPerRequest: 1,
        callsNote: "1 call for latest CDI rate. Fetched in parallel with SELIC and IPCA.",
        cacheTTL: 3600,
        priority: "medium",
        canDefer: true,
        canBatch: false,
      },
    ],
  },

  // ── AwesomeAPI ────────────────────────────────────────────────────────────
  awesomeapi: {
    id: "awesomeapi",
    name: "AwesomeAPI (FX Rates)",
    baseUrl: "https://economia.awesomeapi.com.br",
    proxyPath: "/api/awesomeapi",
    currentTier: "Public (no key, unlimited)",
    limits: { perMinute: null, perDay: null, perMonth: null },
    costPerCall: null,
    upgradeUrl: "https://docs.awesomeapi.com.br",
    notes:
      "Brazilian FX rate API providing USD-BRL and EUR-BRL. No key required, no documented limit. " +
      "Fetches both pairs in a single call. 15min cache is appropriate — FX rates update frequently " +
      "but this data is used for macro context, not live trading.",
    tierOptions: [
      {
        name: "Public (current)",
        perMinute: null,
        perDay: null,
        perMonth: null,
        costPerMonth: 0,
        notes: "Effectively unlimited. Very stable community API.",
      },
    ],
    endpoints: [
      {
        id: "fx",
        path: "/last/{pairs}",
        callsPerRequest: 1,
        callsNote:
          "1 call for USD-BRL and EUR-BRL in a single batched request. " +
          "Fetched once on mount alongside BCB macro data. Cached 15min.",
        cacheTTL: 900, // 15min
        priority: "medium",
        canDefer: true,
        canBatch: true,
      },
    ],
  },
};

// ─── Accessor Helpers ─────────────────────────────────────────────────────────

/**
 * Get a specific API definition.
 * @param {string} apiId
 * @returns {ApiDefinition|null}
 */
export function getApiDef(apiId) {
  return API_REGISTRY[apiId] ?? null;
}

/**
 * Get a specific endpoint definition for an API.
 * @param {string} apiId
 * @param {string} endpointId
 * @returns {EndpointDef|null}
 */
export function getEndpointDef(apiId, endpointId) {
  const api = API_REGISTRY[apiId];
  if (!api) return null;
  return api.endpoints.find(e => e.id === endpointId) ?? null;
}

/**
 * Get all APIs that have at least one documented quota limit (per-minute or per-day).
 * APIs with null limits on all windows are considered unlimited.
 * @returns {ApiDefinition[]}
 */
export function getQuotaConstrainedApis() {
  return Object.values(API_REGISTRY).filter(
    api => api.limits.perDay !== null || api.limits.perMinute !== null
  );
}

/**
 * Get all registered API IDs.
 * @returns {string[]}
 */
export function getAllApiIds() {
  return Object.keys(API_REGISTRY);
}

/**
 * Get the cache TTL (in milliseconds) for a given API endpoint.
 * Returns 0 if no caching is configured.
 * @param {string} apiId
 * @param {string} endpointId
 * @returns {number} milliseconds
 */
export function getEndpointCacheTTLms(apiId, endpointId) {
  const ep = getEndpointDef(apiId, endpointId);
  return ep ? ep.cacheTTL * 1000 : 0;
}

/**
 * Get all dormant endpoints across all registered APIs.
 * Dormant: defined in dataServices.js but not called from any component.
 * Used by QuotaDashboard to show them distinctly from active endpoints.
 *
 * @returns {Array<{ apiId: string, apiName: string, endpoint: EndpointDef }>}
 */
export function getDormantEndpoints() {
  const result = [];
  Object.values(API_REGISTRY).forEach(api => {
    api.endpoints.forEach(ep => {
      if (ep.status === "dormant") {
        result.push({ apiId: api.id, apiName: api.name, endpoint: ep });
      }
    });
  });
  return result;
}
