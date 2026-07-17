// Per-timeframe candle-interval choices, shared by the asset drawer's pill
// row and the Chart & Research toolbar. `default` is what fmpOHLCV serves
// when the user hasn't picked; `options` are the granularities that make
// sense for the window. Data-layer support (dataServices.fmpOHLCV):
// intraday options are served natively by FMP (or Yahoo fallback); '1wk' and
// '1mo' are aggregated client-side from daily candles, so they work on every
// daily source (FMP, BRAPI, EODHD). B3 intraday remains best-effort (BRAPI
// free tier is daily-only; the Yahoo .SA fallback honors it when it runs).
export const INTERVAL_OPTIONS = {
  '1D':  { default: '5m',  options: ['1m', '5m', '15m', '30m'] },
  '5D':  { default: '30m', options: ['15m', '30m', '1h'] },
  '1W':  { default: '30m', options: ['15m', '30m', '1h'] },
  '1M':  { default: '1d',  options: ['1h', '1d'] },
  '3M':  { default: '1d',  options: ['1d', '1wk'] },
  'YTD': { default: '1d',  options: ['1d', '1wk'] },
  '1Y':  { default: '1wk', options: ['1d', '1wk', '1mo'] },
  '5Y':  { default: '1wk', options: ['1d', '1wk', '1mo'] },
  'MAX': { default: '1mo', options: ['1wk', '1mo'] },
};

const DAILY_PLUS = new Set(['1d', '1wk', '1mo']);

/**
 * Interval choices for a timeframe, narrowed to what the asset's data
 * sources can actually honor. Pass { dailyOnly: true } for B3 assets —
 * their history comes from BRAPI/EODHD, which serve daily bars only, so
 * offering intraday pills there would highlight a selection the chart can't
 * deliver. Centralizes the default-interval fallback chain for both the
 * drawer and the Chart & Research toolbar (they must never diverge).
 */
export function intervalChoicesFor(timeframe, { dailyOnly = false } = {}) {
  const cfg = INTERVAL_OPTIONS[timeframe] || { default: '1d', options: [] };
  if (!dailyOnly) return cfg;
  const options = cfg.options.filter(iv => DAILY_PLUS.has(iv));
  return {
    default: DAILY_PLUS.has(cfg.default) ? cfg.default : (options[0] || '1d'),
    options,
  };
}
