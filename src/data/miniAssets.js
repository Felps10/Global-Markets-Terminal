/**
 * miniAssets.js — Curated asset list for Terminal Mini
 *
 * Selection rule: one asset per subgroup, first alphabetically by symbol.
 * Subgroups that only have BCB/AwesomeAPI data (no price quotes) are excluded.
 *
 * This file defines metadata only — no fetching.
 * Prices are fetched by fetchMiniPrices() in dataServices.js.
 */

export const MINI_ASSETS = [
  // ── Global Equities (Yahoo) ──────────────────────────────────────────────
  { symbol: 'AAPL',      name: 'Apple',                  group: 'Equities',       subgroup: 'Technology',          source: 'yahoo', flag: 'global' },
  { symbol: 'AMD',       name: 'AMD',                    group: 'Equities',       subgroup: 'Semiconductors',      source: 'yahoo', flag: 'global' },
  { symbol: 'AXP',       name: 'American Express',       group: 'Equities',       subgroup: 'Financials',          source: 'yahoo', flag: 'global' },
  { symbol: 'ABBV',      name: 'AbbVie',                 group: 'Equities',       subgroup: 'Health Care',         source: 'yahoo', flag: 'global' },
  { symbol: 'COST',      name: 'Costco',                 group: 'Equities',       subgroup: 'Consumer',            source: 'yahoo', flag: 'global' },
  { symbol: 'AMT',       name: 'American Tower',         group: 'Equities',       subgroup: 'Real Estate',         source: 'yahoo', flag: 'global' },
  { symbol: 'BA',        name: 'Boeing',                 group: 'Equities',       subgroup: 'Aerospace & Defense', source: 'yahoo', flag: 'global' },
  { symbol: 'BE',        name: 'Bloom Energy',           group: 'Equities',       subgroup: 'Clean Energy',        source: 'yahoo', flag: 'global' },
  { symbol: 'BP',        name: 'BP',                     group: 'Equities',       subgroup: 'Oil & Gas',           source: 'yahoo', flag: 'global' },
  { symbol: 'BYDDY',     name: 'BYD',                    group: 'Equities',       subgroup: 'Automobile',          source: 'yahoo', flag: 'global' },
  { symbol: 'BIIB',      name: 'Biogen',                 group: 'Equities',       subgroup: 'Biotech',             source: 'yahoo', flag: 'global' },
  { symbol: 'CAT',       name: 'Caterpillar',            group: 'Equities',       subgroup: 'Industrials',         source: 'yahoo', flag: 'global' },
  { symbol: 'EWY',       name: 'South Korea ETF',        group: 'Equities',       subgroup: 'Emerging Markets',    source: 'yahoo', flag: 'global' },

  // ── Currencies (Yahoo) ───────────────────────────────────────────────────
  { symbol: 'EURUSD=X',  name: 'Euro / US Dollar',       group: 'Currencies',     subgroup: 'Foreign Exchange',    source: 'yahoo', flag: 'global' },

  // ── Indices (Yahoo) ──────────────────────────────────────────────────────
  { symbol: '^GSPC',     name: 'S&P 500',                group: 'Indices',        subgroup: 'Global Indices',      source: 'yahoo', flag: 'global' },

  // ── Commodities (Yahoo) ──────────────────────────────────────────────────
  { symbol: 'GC=F',      name: 'Gold Futures',           group: 'Commodities',    subgroup: 'Precious Metals',     source: 'yahoo', flag: 'global' },
  { symbol: 'BNO',       name: 'US Brent Oil Fund',      group: 'Commodities',    subgroup: 'Energy Commodities',  source: 'yahoo', flag: 'global' },
  { symbol: 'CANE',      name: 'Teucrium Sugar Fund',    group: 'Commodities',    subgroup: 'Agriculture',         source: 'yahoo', flag: 'global' },

  // ── Fixed Income (Yahoo) ─────────────────────────────────────────────────
  { symbol: 'DVY',       name: 'iShares Select Dividend', group: 'Fixed Income',  subgroup: 'Dividend Income',     source: 'yahoo', flag: 'global' },
  { symbol: 'HYG',       name: 'iShares High Yield Bond', group: 'Fixed Income',  subgroup: 'Credit',              source: 'yahoo', flag: 'global' },
  { symbol: 'BIL',       name: 'SPDR Bloomberg T-Bill',   group: 'Fixed Income',  subgroup: 'Treasuries',          source: 'yahoo', flag: 'global' },
  { symbol: 'AGG',       name: 'iShares US Aggregate Bond',group: 'Fixed Income', subgroup: 'Bonds',               source: 'yahoo', flag: 'global' },

  // ── Digital Assets (CoinGecko) ───────────────────────────────────────────
  { symbol: 'BTC',       name: 'Bitcoin',                group: 'Digital Assets', subgroup: 'Crypto',              source: 'coingecko', flag: 'global', cgId: 'bitcoin' },

  // ── Brasil — B3 (BRAPI) ──────────────────────────────────────────────────
  { symbol: 'PETR4',     name: 'Petrobras PN',           group: 'Brasil Mercado', subgroup: 'Ações B3',            source: 'brapi', flag: 'brasil' },
  { symbol: 'ACWI11',    name: 'iShares MSCI ACWI',      group: 'Brasil Mercado', subgroup: 'ETFs',                source: 'brapi', flag: 'brasil' },
  { symbol: 'ALZR11',    name: 'Alianza Trust Renda',    group: 'Brasil Mercado', subgroup: 'FIIs',                source: 'brapi', flag: 'brasil' },
];

// Convenience: symbols by source for batch fetching
export const MINI_YAHOO_SYMBOLS  = MINI_ASSETS.filter(a => a.source === 'yahoo').map(a => a.symbol);
export const MINI_BRAPI_SYMBOLS  = MINI_ASSETS.filter(a => a.source === 'brapi').map(a => a.symbol);
export const MINI_CRYPTO_SYMBOLS = MINI_ASSETS.filter(a => a.source === 'coingecko').map(a => a.symbol);

// Global vs Brasil splits for the toggle
export const MINI_GLOBAL_ASSETS = MINI_ASSETS.filter(a => a.flag === 'global');
export const MINI_BRASIL_ASSETS = MINI_ASSETS.filter(a => a.flag === 'brasil');
