/**
 * portfolioEngine.js
 * Pure calculation functions for GMT Clube de Investimento portfolio analytics.
 * No API calls, no React, no side effects.
 * All functions receive plain data and return plain data.
 *
 * marketData shape (from GlobalMarketsTerminal state):
 *   marketData[symbol] = { price, change, changePct, volume, marketCap,
 *                          high, low, sparkline }
 *
 * positions shape (from GET /api/v1/clubes/:id/posicoes):
 *   [{ asset_id, peso_alvo, asset: { id, symbol, name, group_id, subgroup_id } }]
 */

// ── FUNCTION 1 ────────────────────────────────────────────────────────────────

/**
 * Builds a current portfolio snapshot by merging position weights
 * with live market prices from GMT marketData state.
 *
 * @param {Array}  positions  - posicoes from API, each with nested asset object
 * @param {Object} marketData - GMT marketData state keyed by symbol
 * @returns {Array} enriched positions, each with current price and contribution
 *
 * Return shape per item:
 * {
 *   asset_id:      string,
 *   symbol:        string,
 *   name:          string,
 *   group_id:      string,
 *   subgroup_id:   string,
 *   peso_alvo:     number,       // 0.0–1.0
 *   price:         number|null,  // current price from marketData
 *   changePct:     number|null,  // daily % change
 *   contribution:  number|null,  // peso_alvo * changePct (daily contribution)
 *   hasPrice:      boolean,      // true if marketData has this symbol
 * }
 */
export function buildPortfolioSnapshot(positions, marketData) {
  const snapshot = positions.map((pos) => {
    const symbol  = pos.asset?.symbol ?? null;
    const md      = symbol ? marketData[symbol] : null;
    const hasPrice = md != null && md.price != null;

    return {
      asset_id:    pos.asset_id,
      symbol:      symbol,
      name:        pos.asset?.name       ?? null,
      group_id:    pos.asset?.group_id   ?? null,
      subgroup_id: pos.asset?.subgroup_id ?? null,
      peso_alvo:   pos.peso_alvo,
      price:       hasPrice ? md.price    : null,
      changePct:   hasPrice ? md.changePct : null,
      contribution: hasPrice ? pos.peso_alvo * (md.changePct / 100) : null,
      hasPrice,
    };
  });

  return snapshot.sort((a, b) => b.peso_alvo - a.peso_alvo);
}

// ── FUNCTION 2 ────────────────────────────────────────────────────────────────

/**
 * Calculates the weighted daily return of the portfolio.
 * Uses only positions that have live price data.
 *
 * @param {Array} snapshot - output of buildPortfolioSnapshot
 * @returns {{
 *   dailyReturn:        number,   // weighted sum of contributions (decimal)
 *   dailyReturnPct:     number,   // dailyReturn * 100 (percentage)
 *   coveredWeight:      number,   // sum of peso_alvo for positions with prices
 *   missingSymbols:     string[], // symbols with no price data
 *   isPartial:          boolean,  // true if any position has no price
 * }}
 */
export function calculatePortfolioDailyReturn(snapshot) {
  let dailyReturn    = 0;
  let coveredWeight  = 0;
  const missingSymbols = [];

  for (const item of snapshot) {
    if (item.hasPrice) {
      dailyReturn   += item.contribution;
      coveredWeight += item.peso_alvo;
    } else {
      missingSymbols.push(item.symbol);
    }
  }

  if (coveredWeight === 0) {
    return { dailyReturn: 0, dailyReturnPct: 0, coveredWeight: 0, missingSymbols, isPartial: missingSymbols.length > 0 };
  }

  return {
    dailyReturn,
    dailyReturnPct:  dailyReturn * 100,
    coveredWeight,
    missingSymbols,
    isPartial:       missingSymbols.length > 0,
  };
}

// ── FUNCTION 3 ────────────────────────────────────────────────────────────────

/**
 * Computes portfolio analytics from the full NAV history.
 *
 * @param {Array} navHistory - nav_historico rows ordered by data ASC
 *   Each row: { data, valor_cota, retorno_diario, retorno_acumulado,
 *               retorno_ibov, retorno_cdi, patrimonio_total }
 * @param {Object} clube - clube row with valor_cota_inicial
 * @returns {{
 *   currentNAV:        number,
 *   inceptionNAV:      number,
 *   totalReturnPct:    number,   // (currentNAV / inceptionNAV - 1) * 100
 *   ytdReturnPct:      number,   // return from Jan 1 of current year to latest
 *   ibovReturnPct:     number,   // cumulative IBOV return over same period
 *   cdiReturnPct:      number,   // cumulative CDI return over same period
 *   navSeries:         Array,    // [{ date: string, nav: number }] for charting
 *   ibovSeries:        Array,    // [{ date: string, nav: number }] IBOV rebased
 *   cdiSeries:         Array,    // [{ date: string, nav: number }] CDI rebased
 *   entryCount:        number,
 * }}
 */
export function calculateNAVFromHistory(navHistory, clube) {
  const empty = {
    currentNAV:     0,
    inceptionNAV:   clube?.valor_cota_inicial ?? 1000,
    totalReturnPct: 0,
    ytdReturnPct:   0,
    ibovReturnPct:  0,
    cdiReturnPct:   0,
    navSeries:      [],
    ibovSeries:     [],
    cdiSeries:      [],
    entryCount:     0,
  };

  if (!navHistory || navHistory.length === 0) return empty;

  const inceptionNAV = clube?.valor_cota_inicial ?? 1000;
  const currentNAV   = navHistory[navHistory.length - 1].valor_cota;
  const round4       = (x) => Math.round(x * 10000) / 10000;

  // Build series and rebase benchmarks
  const navSeries  = [];
  const ibovSeries = [];
  const cdiSeries  = [];

  let prevIbovNav = inceptionNAV;
  let prevCdiNav  = inceptionNAV;

  for (const row of navHistory) {
    navSeries.push({ date: row.data, nav: row.valor_cota });

    const ibovNav = prevIbovNav * (1 + (row.retorno_ibov || 0));
    const cdiNav  = prevCdiNav  * (1 + (row.retorno_cdi  || 0));
    ibovSeries.push({ date: row.data, nav: ibovNav });
    cdiSeries.push({  date: row.data, nav: cdiNav  });

    prevIbovNav = ibovNav;
    prevCdiNav  = cdiNav;
  }

  // YTD base: last entry strictly before Jan 1 of current year
  const currentYear = new Date().getFullYear();
  const ytdCutoff   = `${currentYear}-01-01`;
  let ytdBaseNAV    = inceptionNAV;

  for (let i = navHistory.length - 1; i >= 0; i--) {
    if (navHistory[i].data < ytdCutoff) {
      ytdBaseNAV = navHistory[i].valor_cota;
      break;
    }
  }

  const totalReturnPct = round4((currentNAV   / inceptionNAV - 1) * 100);
  const ytdReturnPct   = round4((currentNAV   / ytdBaseNAV   - 1) * 100);
  const ibovReturnPct  = round4((ibovSeries[ibovSeries.length - 1].nav / inceptionNAV - 1) * 100);
  const cdiReturnPct   = round4((cdiSeries[cdiSeries.length  - 1].nav / inceptionNAV - 1) * 100);

  return {
    currentNAV,
    inceptionNAV,
    totalReturnPct,
    ytdReturnPct,
    ibovReturnPct,
    cdiReturnPct,
    navSeries,
    ibovSeries,
    cdiSeries,
    entryCount: navHistory.length,
  };
}

// ── FUNCTION 4 ────────────────────────────────────────────────────────────────

/**
 * Calculates the drawdown series and maximum drawdown from NAV history.
 *
 * @param {Array} navSeries - [{ date: string, nav: number }] ordered ASC
 * @returns {{
 *   drawdownSeries:  Array,    // [{ date, drawdown }] drawdown as negative decimal
 *   currentDrawdown: number,   // most recent drawdown value (negative decimal)
 *   maxDrawdown:     number,   // worst drawdown (most negative, decimal)
 *   maxDrawdownPct:  number,   // maxDrawdown * 100
 *   peakDate:        string|null,
 *   troughDate:      string|null,
 * }}
 */
export function calculateDrawdown(navSeries) {
  const empty = {
    drawdownSeries:  [],
    currentDrawdown: 0,
    maxDrawdown:     0,
    maxDrawdownPct:  0,
    peakDate:        null,
    troughDate:      null,
  };

  if (!navSeries || navSeries.length < 2) return empty;

  const drawdownSeries = [];
  let runningMax     = -Infinity;
  let runningMaxDate = null;
  let maxDrawdown    = 0;
  let peakDate       = null;
  let troughDate     = null;

  for (const { date, nav } of navSeries) {
    if (nav > runningMax) {
      runningMax     = nav;
      runningMaxDate = date;
    }
    const dd = nav / runningMax - 1;
    drawdownSeries.push({ date, drawdown: dd });

    if (dd < maxDrawdown) {
      maxDrawdown = dd;
      troughDate  = date;
      peakDate    = runningMaxDate;
    }
  }

  const currentDrawdown = drawdownSeries[drawdownSeries.length - 1].drawdown;

  return {
    drawdownSeries,
    currentDrawdown,
    maxDrawdown,
    maxDrawdownPct: maxDrawdown * 100,
    peakDate,
    troughDate,
  };
}

// ── FUNCTION 5 ────────────────────────────────────────────────────────────────

/**
 * Calculates annualized volatility from daily returns.
 *
 * @param {Array} navHistory - nav_historico rows with retorno_diario field
 * @param {number} [window]  - number of most recent days to use (default: all)
 * @returns {{
 *   annualizedVolPct: number,   // annualized std dev * 100
 *   dailyStdDev:      number,   // raw daily std dev (decimal)
 *   sampleSize:       number,   // number of return observations used
 *   window:           number|null,
 * }}
 */
export function calculateVolatility(navHistory, window = null) {
  const zero = { annualizedVolPct: 0, dailyStdDev: 0, sampleSize: 0, window };

  if (!navHistory || navHistory.length === 0) return zero;

  // Extract non-null, non-zero retorno_diario values (filter inception row)
  let returns = navHistory
    .map((r) => r.retorno_diario)
    .filter((r) => r !== null && r !== undefined && r !== 0);

  if (window !== null) {
    returns = returns.slice(-window);
  }

  const n = returns.length;
  if (n < 2) return { ...zero, sampleSize: n };

  const mean   = returns.reduce((sum, r) => sum + r, 0) / n;
  const sumSq  = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0);
  const stdDev = Math.sqrt(sumSq / (n - 1));          // sample std dev
  const annVol = stdDev * Math.sqrt(252) * 100;

  return {
    annualizedVolPct: annVol,
    dailyStdDev:      stdDev,
    sampleSize:       n,
    window,
  };
}

// ── FUNCTION 6 ────────────────────────────────────────────────────────────────

/**
 * Calculates the 67% renda variável compliance status from positions.
 * Frontend mirror of the backend /compliance route — use for real-time
 * UI feedback without an API call when positions are already in state.
 *
 * @param {Array} positions - posicoes with nested asset object (group_id)
 * @returns {{
 *   percentualRV:    number,           // fraction in equities group (0.0–1.0)
 *   percentualOutras: number,
 *   compliant:       boolean,
 *   status:          'OK'|'WARNING'|'BREACH'|'NO_POSITIONS',
 *   minimumRequired: 0.67,
 * }}
 */
export function calculateRVCompliance(positions) {
  const noPositions = {
    percentualRV:    0,
    percentualOutras: 0,
    compliant:       false,
    status:          'NO_POSITIONS',
    minimumRequired: 0.67,
  };

  if (!positions || positions.length === 0) return noPositions;

  let percentualRV     = 0;
  let percentualOutras = 0;

  for (const pos of positions) {
    const is_rv = pos.asset?.group_id === 'equities';
    if (is_rv) percentualRV     += pos.peso_alvo;
    else       percentualOutras += pos.peso_alvo;
  }

  let compliant, status;
  if (percentualRV >= 0.67) {
    compliant = true;
    status    = 'OK';
  } else if (percentualRV >= 0.60) {
    compliant = false;
    status    = 'WARNING';
  } else {
    compliant = false;
    status    = 'BREACH';
  }

  return { percentualRV, percentualOutras, compliant, status, minimumRequired: 0.67 };
}

// ── FUNCTION 7 ────────────────────────────────────────────────────────────────

/**
 * Formats a number as Brazilian Real currency string.
 * Used by Clube views throughout — centralised here to avoid duplication.
 *
 * @param {number} value
 * @param {object} [opts]
 * @param {number} [opts.decimals=2]
 * @param {boolean} [opts.compact=false]  - use K/M/B suffixes above 1000
 * @returns {string}  e.g. "R$ 1.234,56" or "R$ 1,2M"
 */
export function formatCurrency(value, opts = {}) {
  if (value == null || typeof value !== 'number' || isNaN(value)) return '—';

  const { decimals = 2, compact = false } = opts;
  const abs = Math.abs(value);

  if (compact) {
    if (abs >= 1_000_000_000) return 'R$ ' + (value / 1_000_000_000).toFixed(1) + 'B';
    if (abs >= 1_000_000)     return 'R$ ' + (value / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000)         return 'R$ ' + (value / 1_000).toFixed(1) + 'K';
  }

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return 'R$ ' + formatted;
}

// ── FUNCTION 8 ────────────────────────────────────────────────────────────────

/**
 * Formats a decimal or percentage number as a display percentage string.
 *
 * @param {number} value       - percentage value (e.g. 1.23 means 1.23%)
 * @param {object} [opts]
 * @param {number} [opts.decimals=2]
 * @param {boolean} [opts.showSign=true]  - prefix positive with '+'
 * @returns {string}  e.g. "+1.23%" or "−0.45%"
 */
export function formatPct(value, opts = {}) {
  if (value == null || typeof value !== 'number' || isNaN(value)) return '—';

  const { decimals = 2, showSign = true } = opts;
  const abs = Math.abs(value).toFixed(decimals);

  if (value < 0)              return '\u2212' + abs + '%';
  if (value > 0 && showSign)  return '+' + abs + '%';
  return abs + '%';
}
