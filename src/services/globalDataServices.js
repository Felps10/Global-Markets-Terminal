// globalDataServices.js
// Global Terminal data providers: Yahoo, Finnhub,
// FMP, FRED, AlphaVantage, CoinGecko.
//
// SCOPE RULE: This file must never import from
// brazilDataServices.js or call BRAPI, BCB SGS,
// or AwesomeAPI directly.
//
// All exports are re-exported from dataServices.js.
// No logic lives here — this is a boundary layer.

// ── Yahoo Finance ───────────────────────────────────
export {
  fetchYahooMarketData,
  fetchYahooChartData,
  fetchYahooOHLCV,
} from '../dataServices.js';

// ── Finnhub ─────────────────────────────────────────
export {
  hasFinnhubKey,
  finnhubQuote,
  finnhubEarnings,
  finnhubNews,
  finnhubInsiderSentiment,
  finnhubRecommendation,
} from '../dataServices.js';

// ── FMP (Financial Modeling Prep) ───────────────────
export {
  hasFmpKey,
  getFmpRateLimitHits,
  fmpProfile,
  fmpRatios,
  fmpDCF,
  fmpBatchProfile,
} from '../dataServices.js';

// ── FRED ────────────────────────────────────────────
export {
  hasFredKey,
  getFredSeriesConfig,
  fredSeries,
  fredAllMacro,
  fredReleases,
  fredReleaseDates,
} from '../dataServices.js';

// ── AlphaVantage ────────────────────────────────────
export {
  hasAlphaVantageKey,
  alphaVantageRSI,
  alphaVantageMACD,
} from '../dataServices.js';

// ── CoinGecko ───────────────────────────────────────
export {
  coingeckoPrices,
  coingeckoTrending,
} from '../dataServices.js';

// ── Shared utilities ─��──────────────────────────────
export {
  API_BASE,
  getSourceStatus,
  trackApiCall,
  getApiUsage,
  healthPing,
  getHealthHistory,
  pushHealthHistory,
} from '../dataServices.js';
