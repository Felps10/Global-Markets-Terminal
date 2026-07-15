/**
 * gmtConfig.js — Static configuration constants for the Global Markets Terminal.
 *
 * Pure data — no React, no components, no hooks.
 * Imported by GlobalMarketsTerminal.jsx, gmtBadges.jsx, GroupSummaryCard.jsx,
 * and any consumer that needs asset/category metadata.
 */

import { SUBGROUPS as STATIC_SUBGROUPS_ARRAY } from '../data/subgroups.js';
import { ASSETS    as STATIC_ASSETS_ARRAY    } from '../data/assets.js';

// ─── Static fallback maps ─────────────────────────────────────────────────────

export const STATIC_CATEGORIES = Object.fromEntries(
  STATIC_SUBGROUPS_ARRAY.map(s => [s.id, { label: s.display_name, icon: s.icon, color: s.color }])
);

// Symbol-keyed asset map builder, shared by the static map below and the
// runtime taxonomy map in GlobalMarketsTerminal. Duplicate symbols are legal
// (the brazil-highlights rows mirror br-acoes symbols), so the builder must be
// order-independent for B3 identity: isB3 is sticky — once any row for a
// symbol declares it, a later flagless row cannot erase it (last-write-wins on
// the flag was the 2026-07-14 incident).
export function buildStaticAssetsMap(rows) {
  const map = {};
  for (const a of rows) {
    const entry = {
      name:     a.name,
      cat:      a.subgroup_id,
      sector:   a.sector || null,
      exchange: a.exchange || 'NASDAQ',
      type:     a.type,
      ...(a.meta || {}),
    };
    const prev = map[a.symbol];
    if (prev && !prev._displaySymbol) {
      if (prev.isB3 || entry.isB3) entry.isB3 = true;
      if (import.meta.env?.DEV && (prev.type !== entry.type || prev.sector !== entry.sector)) {
        console.warn(`[gmtConfig] duplicate symbol ${a.symbol}: rows disagree on type/sector — later row wins`,
          { kept: { type: entry.type, sector: entry.sector }, dropped: { type: prev.type, sector: prev.sector } });
      }
    }
    map[a.symbol] = entry;
    if (a.meta?.yahooSymbol && a.meta.yahooSymbol !== a.symbol
        && (!map[a.meta.yahooSymbol] || map[a.meta.yahooSymbol]._displaySymbol)) {
      // Alias entries are lookup shims for provider-keyed payloads, never B3
      // grid members: without the isB3 override, rows carrying both isB3 and a
      // yahooSymbol would admit phantom '.SA' entries into every isB3 filter
      // (grid sections, ticker counts, fallback fetch lists). An alias also
      // never clobbers a real entry that owns the same key.
      map[a.meta.yahooSymbol] = { ...entry, isB3: false, _displaySymbol: a.symbol };
    }
  }
  return map;
}

export const STATIC_ASSETS_MAP = buildStaticAssetsMap(STATIC_ASSETS_ARRAY);

// ─── Color maps ───────────────────────────────────────────────────────────────

export const EXCHANGE_COLORS = {
  NASDAQ: "#00BCD4",
  NYSE:   "#7C4DFF",
  LSE:    "#FF9100",
  XETRA:  "#FFD740",
  TSE:    "#E91E63",
  HKEX:   "var(--c-error)",
  B3:     "#00E676",
  INDEX:  "#78909C",
  FOREX:  "#9E9E9E",
  CRYPTO: "#F9A825",
};

export const SOURCE_COLORS = {
  eodhd:        "#4C6EF5",
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

// ─── Macro context banners ────────────────────────────────────────────────────

export const GROUP_MACRO = {
  financials:  { fredKey: "fedRate",           label: "Fed Funds Rate" },
  consumer:    { fredKey: "consumerSentiment", label: "Consumer Sentiment" },
  cleanenergy: { fredKey: "treasury10y",       label: "10Y Treasury Yield" },
  reits:       { fredKey: "mortgage30y",       label: "30-Year Mortgage Rate" },
};

// ─── Equity categories and volatility ─────────────────────────────────────────

export const EQUITY_CATS = new Set([
  "technology", "oil-gas", "financials", "healthcare", "semiconductors",
  "consumer", "aerospace", "cleanenergy", "reits", "emerging",
  "automobile", "industrials", "biotech",
]);

export function isEquityCat(cat) { return EQUITY_CATS.has(cat); }

export const VOLATILITY = {
  technology: 0.018, "oil-gas": 0.014, financials: 0.012, healthcare: 0.014,
  semiconductors: 0.020, consumer: 0.010, aerospace: 0.010, cleanenergy: 0.025,
  reits: 0.012, emerging: 0.016, crypto: 0.035, indices: 0.01, fx: 0.004,
  automobile: 0.022, credit: 0.008, industrials: 0.012, biotech: 0.022,
  "dividend-income": 0.008, treasuries: 0.006, bonds: 0.006,
  "precious-metals": 0.012, "energy-commodities": 0.018, agriculture: 0.014,
};

// ─── Density presets ──────────────────────────────────────────────────────────

export const DENSITY_CONFIG = {
  compact: {
    gridMin: 200, gap: 8, cardPadding: "14px 16px",
    iconSize: 14, nameSize: 11, pctSize: 12,
    mcapSize: 9, assetCountSize: 8, barHeight: 2,
    assetGridMin: 220, assetGap: 8, assetPadding: "10px 12px 6px",
    assetTickerSize: 12, assetNameSize: 9, assetPriceSize: 16,
    assetChangeSize: 11, assetVolumeSize: 8, assetBadgeSize: 7,
    assetSparkW: 70, assetSparkH: 24, assetShowHighLow: false,
  },
  comfortable: {
    gridMin: 260, gap: 12, cardPadding: "18px 20px",
    iconSize: 18, nameSize: 13, pctSize: 14,
    mcapSize: 10, assetCountSize: 9, barHeight: 3,
    assetGridMin: 270, assetGap: 10, assetPadding: "12px 14px 8px",
    assetTickerSize: 13, assetNameSize: 10, assetPriceSize: 18,
    assetChangeSize: 13, assetVolumeSize: 9, assetBadgeSize: 8,
    assetSparkW: 80, assetSparkH: 28, assetShowHighLow: true,
  },
  spacious: {
    gridMin: 320, gap: 16, cardPadding: "24px 24px",
    iconSize: 22, nameSize: 15, pctSize: 16,
    mcapSize: 11, assetCountSize: 10, barHeight: 4,
    assetGridMin: 340, assetGap: 14, assetPadding: "16px 18px 12px",
    assetTickerSize: 15, assetNameSize: 12, assetPriceSize: 22,
    assetChangeSize: 15, assetVolumeSize: 10, assetBadgeSize: 9,
    assetSparkW: 100, assetSparkH: 34, assetShowHighLow: true,
  },
};
