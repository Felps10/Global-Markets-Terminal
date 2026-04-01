import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import CommandBar from "./components/CommandBar.jsx";
import AssetListView from "./components/AssetListView.jsx";
import AssetDetailDrawer from "./components/AssetDetailDrawer.jsx";
import {
  hasFinnhubKey, finnhubNews, finnhubRecommendation,
  hasFmpKey, fmpProfile, fmpRatios, fmpBatchProfile,
  hasFredKey, fredSeries, fredAllMacro, getFredSeriesConfig,
  hasAlphaVantageKey, alphaVantageRSI, alphaVantageMACD,
  coingeckoPrices,
  getSourceStatus,
  fetchYahooMarketData,
  fetchYahooChartData,
} from "./dataServices.js";
import { SUBGROUPS as STATIC_SUBGROUPS_ARRAY } from './data/subgroups.js';
import { ASSETS    as STATIC_ASSETS_ARRAY    } from './data/assets.js';
import { useTaxonomy } from './context/TaxonomyContext.jsx';
import { useTicker } from './context/TickerContext.jsx';
import { useSelectedAsset } from './context/SelectedAssetContext.jsx';
import { usePreferences } from './context/PreferencesContext.jsx';
import { useWatchlist }   from './context/WatchlistContext.jsx';
import { isExhausted } from './services/quotaTracker.js';
import { trackEvent } from './services/analytics.js';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MARKET GROUP CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
//
// Structure: flat alphabetical list (no section headers in data — sections are
// logical only). The display order in the UI is driven by the sort controls.
//
// Naming convention: institutional-grade labels aligned with GICS, Bloomberg
// Terminal, MSCI index families, and S&P Global sector classifications.
//
// ── LOGICAL SECTIONS (informational) ────────────────────────────────────────
//
//  EQUITIES — US SECTORS (GICS-aligned)
//    aerospace      Aerospace & Defense     (GICS: Industrials / A&D sub-industry)
//    biotech        Biotech                 (GICS: Health Care / Biotechnology)
//    cleanenergy    Clean Energy            (Thematic: EVs + renewables + utilities)
//    consumer       Consumer                (GICS: Consumer Discretionary + Staples)
//    oil-gas        Oil & Gas               (GICS: Energy)
//    financials     Financials              (GICS: Financials)
//    healthcare     Health Care             (GICS: Health Care — official two-word form)
//    industrials    Industrials             (GICS: Industrials)
//    reits          Real Estate             (GICS: Real Estate)
//    semiconductors Semiconductors          (GICS: IT / Semiconductors sub-industry)
//    technology     Technology              (GICS: Information Technology + Comm. Svcs.)
//
//  EQUITIES — STRATEGIES / SCREENS
//    dividends      Dividend Income         (Strategy screen: FMP dividend yield > 3%)
//
//  EQUITIES — INTERNATIONAL
//    brazil         Brazil Equities         (B3 / Bovespa — kept distinct, not merged
//                                            into Emerging Markets, for specificity)
//    emerging       Emerging Markets        (EM ETFs: EWZ, INDA, MCHI, EWY)
//
//  DIGITAL ASSETS
//    crypto         Crypto                  (BTC, ETH, SOL via CoinGecko)
//
//  MACRO / BENCHMARKS
//    fx             Foreign Exchange        (8 major currency pairs via Yahoo)
//    indices        Global Indices          (8 global benchmark indices via Yahoo)
//
// ── RENAME / MERGE / SPLIT LOG ───────────────────────────────────────────────
//
//  Old Name               → New Name              Key change
//  ─────────────────────────────────────────────────────────
//  "Big Tech"             → "Technology"           tech → technology
//  "Big Oil & Energy"     → "Energy"               energy (key unchanged)
//  "Energy"               → "Oil & Gas"            energy → oil-gas
//  "Digital Assets"       → "Crypto"               crypto (key unchanged)
//  "Financials & Banks"   → "Financials"           financials (key unchanged)
//  "Healthcare & Pharma"  → "Health Care"          healthcare (key unchanged)
//  "Semiconductors"       → "Semiconductors"       semis → semiconductors
//  "Consumer & Retail"    → "Consumer"             consumer (key unchanged)
//  "Defense & Aerospace"  → "Aerospace & Defense"  defense → aerospace
//  "EVs & Clean Energy"   → "Clean Energy"         ev → cleanenergy
//  "REITs & Real Estate"  → "Real Estate"          reits (key unchanged)
//  "Dividends & Income"   → "Dividend Income"      dividends (key unchanged)
//  "Emerging Markets"     → "Emerging Markets"     emerging (key unchanged)
//  "Crypto Assets"        → "Digital Assets"       crypto (key unchanged)  [see below]
//  "Global Indices"       → "Global Indices"       indices (key unchanged)
//  "Major Currencies"     → "Foreign Exchange"     fx (key unchanged)
//  "Brasil — B3"          → "Brazil Equities"      brasil → brazil
//
//  Notes:
//  • "Big Tech" and "Semiconductors" kept separate — NVDA cross-listed in both.
//  • "EVs & Clean Energy" kept as thematic group ("Clean Energy") rather than
//    splitting into Energy/Industrials, because its assets span multiple GICS
//    sectors (NEE=Utilities, ENPH/FSLR=Tech, RIVN/BYDDY=Industrials/Consumer).
//  • "Brazil Equities" is NOT merged into "Emerging Markets" — B3 has its own
//    macro banner (SELIC, IPCA, CDI, USD/BRL) and dedicated data source (BRAPI).
//  • No groups were deleted — all 15 groups are preserved.
// ─────────────────────────────────────────────────────────────────────────────

// Static fallback maps — built from src/data/ files (same source as DB seed)
export const STATIC_CATEGORIES = Object.fromEntries(
  STATIC_SUBGROUPS_ARRAY.map(s => [s.id, { label: s.display_name, icon: s.icon, color: s.color }])
);

export const STATIC_ASSETS_MAP = Object.fromEntries(
  STATIC_ASSETS_ARRAY.map(a => [a.symbol, {
    name:     a.name,
    cat:      a.subgroup_id,
    sector:   a.sector || null,
    exchange: a.exchange || 'NASDAQ',
    type:     a.type,
    ...(a.meta || {}),
  }])
);

export const EXCHANGE_COLORS = {
  NASDAQ: "#00BCD4",
  NYSE:   "#7C4DFF",
  LSE:    "#FF9100",
  XETRA:  "#FFD740",
  TSE:    "#E91E63",
  HKEX:   "#FF5252",
  B3:     "#00E676",
  INDEX:  "#78909C",
  FOREX:  "#9E9E9E",
  CRYPTO: "#F9A825",
};

const SOURCE_COLORS = {
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


// Macro context banners: which FRED series to show for each group
const GROUP_MACRO = {
  financials:  { fredKey: "fedRate",           label: "Fed Funds Rate" },
  consumer:    { fredKey: "consumerSentiment", label: "Consumer Sentiment" },
  cleanenergy: { fredKey: "treasury10y",       label: "10Y Treasury Yield" },
  reits:       { fredKey: "mortgage30y",       label: "30-Year Mortgage Rate" },
};

// Cross-listing: find all assets that belong to a given category (primary or alsoIn)
// Used at module level by fetchMarketData. Component uses the shadowed useCallback version.
function assetsInCategory(catKey) {
  return Object.keys(STATIC_ASSETS_MAP).filter(s => {
    const a = STATIC_ASSETS_MAP[s];
    return a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
  });
}

// All equity symbols (for FMP batch, Finnhub fallback, etc.)
const EQUITY_CATS = new Set(["technology", "oil-gas", "financials", "healthcare", "semiconductors", "consumer", "aerospace", "cleanenergy", "reits", "emerging", "automobile", "industrials", "biotech"]);
function isEquityCat(cat) { return EQUITY_CATS.has(cat); }

const VOLATILITY = {
  technology: 0.018, "oil-gas": 0.014, financials: 0.012, healthcare: 0.014,
  semiconductors: 0.020, consumer: 0.010, aerospace: 0.010, cleanenergy: 0.025,
  reits: 0.012, emerging: 0.016, crypto: 0.035, indices: 0.01, fx: 0.004,
  automobile: 0.022, credit: 0.008, industrials: 0.012, biotech: 0.022,
  "dividend-income": 0.008, treasuries: 0.006, bonds: 0.006,
  "precious-metals": 0.012, "energy-commodities": 0.018, agriculture: 0.014,
};

// ── DEAD CODE — legacy DetailPanel (replaced by AssetDetailDrawer) ──────────
// TODO: Remove after confirming no other consumer exists
const TIMEFRAMES = [
  { key: "1D",  range: "1d",  interval: "5m",  xFmt: "time"  },
  { key: "5D",  range: "5d",  interval: "30m", xFmt: "date"  },
  { key: "1M",  range: "1mo", interval: "1d",  xFmt: "date"  },
  { key: "3M",  range: "3mo", interval: "1d",  xFmt: "date"  },
  { key: "6M",  range: "6mo", interval: "1d",  xFmt: "date"  },
  { key: "1Y",  range: "1y",  interval: "1wk", xFmt: "month" },
  { key: "2Y",  range: "2y",  interval: "1wk", xFmt: "month" },
  { key: "5Y",  range: "5y",  interval: "1mo", xFmt: "year"  },
  { key: "MAX", range: "max", interval: "1mo", xFmt: "year"  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function formatVolume(v) {
  if (!v && v !== 0) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
}

export function formatMarketCap(mc) {
  if (!mc) return "—";
  if (mc >= 1e12) return "$" + (mc / 1e12).toFixed(2) + "T";
  if (mc >= 1e9)  return "$" + (mc / 1e9).toFixed(1) + "B";
  if (mc >= 1e6)  return "$" + (mc / 1e6).toFixed(1) + "M";
  return "$" + mc.toLocaleString();
}

export function formatPrice(symbol, price) {
  if (price == null) return "—";
  const asset = STATIC_ASSETS_MAP[symbol];
  if (!asset) return String(price);
  if (asset.isB3) return "R$ " + price.toFixed(2);
  if (asset.cat === "fx") return price.toFixed(4);
  if (asset.cat === "crypto") {
    if (price >= 1000) return "$" + Math.round(price).toLocaleString();
    if (price >= 1) return "$" + price.toFixed(2);
    return "$" + price.toFixed(4);
  }
  if (asset.cat === "indices") {
    const big = ["^DJI", "^N225", "^HSI", "^BVSP"];
    if (big.includes(symbol)) return Math.round(price).toLocaleString();
    return price.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return "$" + price.toFixed(2);
}

function generateSparkline(basePrice, vol, points = 30) {
  if (!basePrice || !isFinite(basePrice)) return [];
  const arr = [basePrice];
  for (let i = 1; i < points; i++) {
    const prev = arr[i - 1];
    arr.push(prev + prev * vol * (Math.random() - 0.48));
  }
  return arr;
}

async function fetchMarketData(prevData, assetsMap = STATIC_ASSETS_MAP) {
  // Exclude crypto (CoinGecko) and B3 (BRAPI) — they use dedicated sources
  const yahooSymbols = Object.keys(assetsMap).filter(s => !assetsMap[s].isCrypto && !assetsMap[s].isB3);
  return fetchYahooMarketData(yahooSymbols, prevData, { assets: assetsMap, volatility: VOLATILITY, isEquityCat });
}

// Fetch crypto data from CoinGecko and merge into the same data shape
async function fetchCryptoData(assetsMap = STATIC_ASSETS_MAP) {
  const cryptoAssets = Object.entries(assetsMap).filter(([, a]) => a.isCrypto);
  if (cryptoAssets.length === 0) return {};
  const ids = cryptoAssets.map(([, a]) => a.cgId).join(",");
  const data = await coingeckoPrices(ids);
  if (!data) return {};
  const result = {};
  for (const [sym, asset] of cryptoAssets) {
    const d = data[asset.cgId];
    if (!d) continue;
    const price     = d.usd || 0;
    const change24  = d.usd_24h_change || 0;
    const prevPrice = price / (1 + change24 / 100);
    result[sym] = {
      price,
      change:           price - prevPrice,
      changePct:        change24,
      prevClose:        prevPrice,
      high:             price,
      low:              price,
      volume:           d.usd_24h_vol || null,
      marketCap:        d.usd_market_cap || null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow:  null,
      sparkline:        generateSparkline(prevPrice, (VOLATILITY.crypto || 0.035) * 0.3),
      source:           "coingecko",
    };
  }
  return result;
}

// ── DEAD CODE — legacy DetailPanel (replaced by AssetDetailDrawer) ──────────
// TODO: Remove after confirming no other consumer exists
async function fetchChartData(symbol, range, interval) {
  return fetchYahooChartData(symbol, range, interval, { assets: STATIC_ASSETS_MAP });
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
export function Sparkline({ data, positive, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const clean = data.filter(v => isFinite(v) && !isNaN(v));
  if (clean.length < 2) return null;
  const min   = Math.min(...clean);
  const max   = Math.max(...clean);
  const range = max - min || 1;
  const pad   = 2;
  const pts   = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * width;
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color  = positive ? "#00E676" : "#FF5252";
  const gradId = `sg${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon  points={`0,${height} ${pts.join(" ")} ${width},${height}`} fill={`url(#${gradId})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── DEAD CODE — legacy DetailPanel (replaced by AssetDetailDrawer) ──────────
// TODO: Remove after confirming no other consumer exists
// ─── HISTORY CHART ────────────────────────────────────────────────────────────
function HistoryChart({ points, positive, xFmt }) {
  if (!points || points.length < 2) return null;
  const W = 400, H = 100;
  const values = points.map((p) => p.v);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const rng    = max - min || 1;
  const pad    = 3;
  const toX    = (i) => (i / (points.length - 1)) * W;
  const toY    = (v) => pad + ((max - v) / rng) * (H - pad * 2);
  const pts    = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.v).toFixed(1)}`).join(" ");
  const color  = positive ? "#00E676" : "#FF5252";
  const gradId = `hc${Math.random().toString(36).slice(2, 8)}`;

  const formatLabel = (ts) => {
    const d = new Date(ts);
    if (xFmt === "time")  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (xFmt === "date")  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (xFmt === "month") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    return String(d.getFullYear());
  };

  const labelCount   = 5;
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i * (points.length - 1)) / (labelCount - 1))
  );

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </linearGradient>
        </defs>
        <polygon  points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gradId})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 0" }}>
        {labelIndices.map((idx, i) => (
          <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)" }}>
            {formatLabel(points[idx].t)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── EXCHANGE BADGE ───────────────────────────────────────────────────────────
function ExchangeBadge({ exchange, style: extra }) {
  const color = EXCHANGE_COLORS[exchange] || "#9E9E9E";
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
      letterSpacing: "0.8px", color,
      background: color + "18", border: `1px solid ${color}28`,
      borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap",
      ...extra,
    }}>
      {exchange}
    </span>
  );
}

// ─── SOURCE BADGE ────────────────────────────────────────────────────────────
function SourceBadge({ source, style: extra }) {
  const labels = { yahoo: "Yahoo", finnhub: "Finnhub", alphaVantage: "Alpha Vantage", fred: "FRED", coingecko: "CoinGecko", fmp: "FMP", brapi: "BRAPI", bcb: "BCB", awesomeapi: "AwesomeAPI" };
  const color = SOURCE_COLORS[source] || "#9E9E9E";
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
      letterSpacing: "0.5px", color,
      background: color + "18", border: `1px solid ${color}28`,
      borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap",
      ...extra,
    }}>
      {labels[source] || source}
    </span>
  );
}

// ─── MACRO CONTEXT BANNER ────────────────────────────────────────────────────
function MacroBanner({ macroData, catKey }) {
  const cfg = GROUP_MACRO[catKey];
  if (!cfg || !macroData?.[cfg.fredKey]) return null;
  const series = macroData[cfg.fredKey];
  const latest = series.observations?.[0];
  if (!latest) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(21,101,192,0.08)", border: "1px solid rgba(21,101,192,0.2)",
      borderRadius: 6, padding: "8px 14px", marginBottom: 10,
    }}>
      <SourceBadge source="fred" />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
        {cfg.label}:
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#1565C0" }}>
        {typeof latest.value === "number" ? latest.value.toFixed(2) : latest.value}{series.unit === "%" ? "%" : ""}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)" }}>
        ({latest.date})
      </span>
    </div>
  );
}

// ─── CROSS-LIST BADGE ────────────────────────────────────────────────────────
function CrossListBadge({ symbol }) {
  const asset = STATIC_ASSETS_MAP[symbol];
  if (!asset?.alsoIn || asset.alsoIn.length === 0) return null;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 700,
      letterSpacing: "0.5px", color: "#78909C",
      background: "rgba(120,144,156,0.12)", border: "1px solid rgba(120,144,156,0.25)",
      borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap",
    }}>
      +{asset.alsoIn.map(c => STATIC_CATEGORIES[c]?.label?.split(" ")[0] || c).join(",")}
    </span>
  );
}

// ─── DENSITY CONFIG ──────────────────────────────────────────────────────────
const DENSITY_CONFIG = {
  compact: {
    // GroupSummaryCard
    gridMin: 200, gap: 8, cardPadding: "14px 16px",
    iconSize: 14, nameSize: 11, pctSize: 12,
    mcapSize: 9, assetCountSize: 8, barHeight: 2,
    // AssetCard
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

// ─── ASSET CARD ───────────────────────────────────────────────────────────────
export function AssetCard({ symbol, data, onClick, groupLabel, density = "compact" }) {
  const [hovered, setHovered] = useState(false);
  const { isAuthenticated, openAuthPanel } = useAuth();
  const { pin, unpin, isPinned }      = useWatchlist();
  const asset = STATIC_ASSETS_MAP[symbol];
  if (!asset || !data) return null;

  const dc = DENSITY_CONFIG[density] || DENSITY_CONFIG.compact;
  const positive     = (data.changePct ?? 0) >= 0;
  const color        = positive ? "#00E676" : "#FF5252";
  const arrow        = positive ? "▲" : "▼";
  const sign         = positive ? "+" : "";
  const displayTicker = asset.display || symbol;
  const heatWidth    = Math.min(Math.abs(data.changePct ?? 0) / 4, 1) * 100;
  const showVolume   = asset.cat !== "fx";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg,${positive ? "rgba(0,230,118,0.06)" : "rgba(255,82,82,0.06)"},rgba(13,15,24,0.95))`
          : "var(--c-surface)",
        border: `1px solid ${hovered ? color + "40" : "var(--c-border)"}`,
        borderRadius: 8, padding: dc.assetPadding,
        transition: "all 0.25s ease", position: "relative",
        overflow: "hidden", cursor: "pointer",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetTickerSize, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.5px" }}>
            {displayTicker}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: dc.assetNameSize, color: "var(--c-text-2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {asset.name}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
            <ExchangeBadge exchange={asset.exchange} />
            {asset.isCrypto && <SourceBadge source="coingecko" />}
            {asset.isB3 && <SourceBadge source="brapi" />}
            <CrossListBadge symbol={symbol} />
            {groupLabel && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetBadgeSize, padding: "1px 5px", borderRadius: 2, background: "#0a0f1a", color: "#2a4a6a", border: "0.5px solid #1a2f4a" }}>
                {groupLabel.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div style={{ marginRight: isAuthenticated ? 20 : 0 }}>
          <Sparkline data={data.sparkline} positive={positive} width={dc.assetSparkW} height={dc.assetSparkH} />
        </div>
      </div>

      {/* Price row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: showVolume ? 6 : 2, marginTop: 6 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetPriceSize, fontWeight: 700, color: "var(--c-text)" }}>
          {formatPrice(symbol, data.price)}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetChangeSize, fontWeight: 600, color }}>
            {arrow} {sign}{data.changePct != null ? data.changePct.toFixed(2) : '—'}%
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetChangeSize - 3, color: color + "99", marginTop: 1 }}>
            {sign}{data.change != null ? data.change.toFixed(asset.cat === "fx" ? 4 : 2) : '—'}
          </div>
        </div>
      </div>

      {/* Volume */}
      {showVolume && (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetVolumeSize, color: "var(--c-text-3)", marginBottom: 6 }}>
          <span>Vol {formatVolume(data.volume)}</span>
          {dc.assetShowHighLow && <span>H {formatPrice(symbol, data.high)} · L {formatPrice(symbol, data.low)}</span>}
        </div>
      )}

      {/* Heat bar */}
      <div style={{ height: 3, background: "var(--c-border)", borderRadius: 2, overflow: "hidden", marginTop: showVolume ? 0 : 6 }}>
        <div style={{ height: "100%", width: `${heatWidth}%`, background: `linear-gradient(90deg,${color}66,${color})`, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>

      {/* Star / pin button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isAuthenticated) { openAuthPanel('watchlist'); return; }
          isPinned('asset', symbol) ? unpin('asset', symbol) : pin('asset', symbol);
        }}
        style={{
          position: "absolute", top: 8, right: 8,
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 14, lineHeight: 1, padding: 2,
          color: isAuthenticated && isPinned('asset', symbol) ? "#FFB300" : "var(--c-text-3)",
          transition: "color 0.15s ease",
        }}
      >
        {isAuthenticated && isPinned('asset', symbol) ? "★" : "☆"}
      </button>
    </div>
  );
}

// ─── LIST COLUMN HEADER ───────────────────────────────────────────────────────
export function ListColumnHeader() {
  const cols   = ["#", "ASSET", "EXCH", "SECTOR", "PRICE", "CHANGE", "VOLUME", "TREND"];
  const aligns = ["right", "left", "left", "left", "right", "right", "right", "right"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px auto 130px 120px 80px 64px", alignItems: "center", gap: 12, padding: "6px 14px", borderBottom: "1px solid var(--c-border)", marginBottom: 2 }}>
      {cols.map((label, i) => (
        <div key={label} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: "var(--c-text-3)", letterSpacing: "1.2px", textAlign: aligns[i] }}>
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── ASSET ROW ────────────────────────────────────────────────────────────────
export function AssetRow({ symbol, data, rank, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { isAuthenticated, openAuthPanel } = useAuth();
  const { pin, unpin, isPinned }  = useWatchlist();
  const asset = STATIC_ASSETS_MAP[symbol];
  if (!asset || !data) return null;

  const positive     = (data.changePct ?? 0) >= 0;
  const color        = positive ? "#00E676" : "#FF5252";
  const sign         = positive ? "+" : "";
  const displayTicker = asset.display || symbol;
  const catInfo      = STATIC_CATEGORIES[asset.cat];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid", gridTemplateColumns: "28px 1fr 60px auto 130px 120px 80px 64px",
        alignItems: "center", gap: 12, padding: "9px 14px",
        background: hovered ? `linear-gradient(90deg,${positive ? "rgba(0,230,118,0.04)" : "rgba(255,82,82,0.04)"},transparent)` : "transparent",
        borderBottom: "1px solid var(--c-border-faint)",
        transition: "background 0.15s ease", cursor: "pointer",
      }}
    >
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", textAlign: "right" }}>{rank}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{displayTicker}</div>
        <div style={{ fontSize: 10, color: "var(--c-text-2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.name}</div>
      </div>
      <div><ExchangeBadge exchange={asset.exchange} /></div>
      <div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.5px", color: catInfo.color, background: catInfo.color + "14", border: `1px solid ${catInfo.color}28`, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>
          {catInfo.label}
        </span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "var(--c-text)", textAlign: "right" }}>{formatPrice(symbol, data.price)}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color }}>{positive ? "▲" : "▼"} {sign}{data.changePct != null ? data.changePct.toFixed(2) : '—'}%</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: color + "80", marginTop: 1 }}>{sign}{data.change != null ? data.change.toFixed(asset.cat === "fx" ? 4 : 2) : '—'}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", textAlign: "right" }}>{asset.cat !== "fx" ? formatVolume(data.volume) : "—"}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isAuthenticated) { openAuthPanel('watchlist'); return; }
            isPinned('asset', symbol) ? unpin('asset', symbol) : pin('asset', symbol);
          }}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: 13, lineHeight: 1, padding: "1px 2px",
            color: isAuthenticated && isPinned('asset', symbol) ? "#FFB300" : "var(--c-text-3)",
            transition: "color 0.15s ease", flexShrink: 0,
          }}
        >
          {isAuthenticated && isPinned('asset', symbol) ? "★" : "☆"}
        </button>
        <Sparkline data={data.sparkline} positive={positive} width={50} height={22} />
      </div>
    </div>
  );
}

// ── DEAD CODE — legacy DetailPanel (replaced by AssetDetailDrawer) ──────────
// TODO: Remove after confirming no other consumer exists
// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({ symbol, data, onClose }) {
  const asset = STATIC_ASSETS_MAP[symbol];
  if (!asset || !data) return null;

  const [activeRange, setActiveRange] = useState("1D");
  const chartCache    = useRef({});
  const activeRangeRef = useRef("1D");
  const [chartState, setChartState] = useState({ status: "loading", data: null, error: "" });

  const displayTicker = asset.display || symbol;
  const catInfo       = STATIC_CATEGORIES[asset.cat];
  const showVolume    = asset.cat !== "fx";

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Load chart for the selected range
  const loadChart = useCallback(async (range) => {
    activeRangeRef.current = range;
    const tf = TIMEFRAMES.find((t) => t.key === range);
    if (!tf) return;
    const cacheKey = `${symbol}:${range}`;
    if (chartCache.current[cacheKey]) {
      if (activeRangeRef.current === range) {
        setChartState({ status: "ok", data: chartCache.current[cacheKey], error: "" });
      }
      return;
    }
    setChartState({ status: "loading", data: null, error: "" });
    try {
      const result = await fetchChartData(symbol, tf.range, tf.interval);
      chartCache.current[cacheKey] = result;
      if (activeRangeRef.current === range) {
        setChartState({ status: "ok", data: result, error: "" });
      }
    } catch (err) {
      if (activeRangeRef.current === range) {
        setChartState({ status: "error", data: null, error: err.message });
      }
    }
  }, [symbol]);

  useEffect(() => { loadChart(activeRange); }, [activeRange, loadChart]);

  // Enrichment data from Finnhub + FMP (loaded on-demand when panel opens)
  // Skip for B3 assets — Finnhub/FMP have unreliable B3 coverage
  const isEquity = isEquityCat(asset.cat) && !asset.isB3;
  const [enrichment, setEnrichment] = useState({});
  useEffect(() => {
    if (!isEquity) return;
    let cancelled = false;
    (async () => {
      const results = {};
      const jobs = [];
      if (hasFmpKey()) {
        jobs.push(fmpProfile(symbol).then(d => { if (d && !cancelled) results.fmpProfile = d; }));
        jobs.push(fmpRatios(symbol).then(d => { if (d && !cancelled) results.fmpRatios = d; }));
      }
      if (hasFinnhubKey()) {
        jobs.push(finnhubRecommendation(symbol).then(d => { if (d && !cancelled) results.recommendation = d; }));
        jobs.push(finnhubNews(symbol).then(d => { if (d && !cancelled) results.news = d; }));
      }
      await Promise.allSettled(jobs);
      if (!cancelled) setEnrichment(results);
    })();
    return () => { cancelled = true; };
  }, [symbol, isEquity]);

  // Displayed change: chart-derived when available, else live snapshot
  const chartOk      = chartState.status === "ok" && chartState.data;
  const displayPct   = chartOk ? chartState.data.changePct   : data.changePct;
  const displayDelta = chartOk ? chartState.data.change       : data.change;
  const positive     = (displayPct ?? 0) >= 0;
  const color        = positive ? "#00E676" : "#FF5252";
  const sign         = positive ? "+" : "";
  const periodLabel  = activeRange === "1D" ? "today" : `past ${activeRange.toLowerCase()}`;
  const activeTf     = TIMEFRAMES.find((t) => t.key === activeRange);

  function MetricBox({ label, value, valueColor }) {
    return (
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 12px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: valueColor || "var(--c-text)" }}>{value}</div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--c-overlay)", zIndex: 300 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)",
        background: "var(--c-panel)", borderLeft: "1px solid var(--c-border)",
        zIndex: 301, overflowY: "auto",
        animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1) both",
      }}>
        {/* Sticky header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "20px 20px 16px", borderBottom: "1px solid var(--c-border)",
          position: "sticky", top: 0, background: "var(--c-panel)", zIndex: 1,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.5px" }}>
                {displayTicker}
              </div>
              <ExchangeBadge exchange={asset.exchange} style={{ fontSize: 9, padding: "2px 7px" }} />
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--c-text-2)" }}>{asset.name}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: catInfo.color, background: catInfo.color + "14", border: `1px solid ${catInfo.color}28`, borderRadius: 10, padding: "2px 8px" }}>
                {catInfo.icon} {catInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, cursor: "pointer", color: "var(--c-text-2)", fontSize: 16, padding: "6px 10px", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FF5252"; e.currentTarget.style.color = "#FF5252"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.color = "var(--c-text-2)"; }}>
            ✕
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Price + change hero */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-0.5px" }}>
              {formatPrice(symbol, data.price)}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color }}>
                {positive ? "▲" : "▼"} {sign}{displayPct != null ? displayPct.toFixed(2) : '—'}%
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: color + "99", marginTop: 2 }}>
                {sign}{displayDelta != null ? displayDelta.toFixed(asset.cat === "fx" ? 4 : 2) : '—'} {periodLabel}
              </div>
            </div>
          </div>

          {/* Tab bar + chart */}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--c-border)" }}>
              {TIMEFRAMES.map((tf) => {
                const active = activeRange === tf.key;
                return (
                  <button key={tf.key} onClick={() => setActiveRange(tf.key)}
                    style={{
                      flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      fontWeight: active ? 700 : 400,
                      color: active ? "#00E676" : "var(--c-text-3)",
                      background: "transparent", border: "none",
                      borderBottom: `2px solid ${active ? "#00E676" : "transparent"}`,
                      padding: "8px 4px 6px", cursor: "pointer", transition: "all 0.15s ease",
                    }}>
                    {tf.key}
                  </button>
                );
              })}
            </div>

            {/* Chart area */}
            <div style={{ padding: "12px 12px 8px", minHeight: 140 }}>
              {chartState.status === "loading" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E676", animation: "pulse 1.2s ease-in-out infinite" }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>LOADING</span>
                </div>
              )}
              {chartState.status === "error" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#FF5252" }}>⚠ {chartState.error}</span>
                </div>
              )}
              {chartState.status === "ok" && chartState.data && activeTf && (
                <HistoryChart points={chartState.data.points} positive={positive} xFmt={activeTf.xFmt} />
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <MetricBox label="PREV CLOSE" value={formatPrice(symbol, data.prevClose)} />
            {showVolume && <MetricBox label="VOLUME" value={formatVolume(data.volume)} />}
            <MetricBox label="DAY HIGH" value={formatPrice(symbol, data.high)} valueColor="#00E676" />
            <MetricBox label="DAY LOW"  value={formatPrice(symbol, data.low)}  valueColor="#FF5252" />
            {data.marketCap        && <MetricBox label="MARKET CAP" value={formatMarketCap(data.marketCap)} />}
            {data.fiftyTwoWeekHigh && <MetricBox label="52W HIGH" value={formatPrice(symbol, data.fiftyTwoWeekHigh)} valueColor="#00E676" />}
            {data.fiftyTwoWeekLow  && <MetricBox label="52W LOW"  value={formatPrice(symbol, data.fiftyTwoWeekLow)}  valueColor="#FF5252" />}
          </div>

          {/* Exchange info row */}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--c-text-2)" }}>Listed on</span>
            <ExchangeBadge exchange={asset.exchange} style={{ fontSize: 10, padding: "3px 8px" }} />
          </div>

          {/* Fundamentals from FMP */}
          {enrichment.fmpProfile && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px" }}>FUNDAMENTALS</span>
                <SourceBadge source="fmp" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {enrichment.fmpProfile.pe != null && <MetricBox label="P/E RATIO" value={enrichment.fmpProfile.pe.toFixed(1)} />}
                {enrichment.fmpProfile.eps != null && <MetricBox label="EPS" value={"$" + enrichment.fmpProfile.eps.toFixed(2)} />}
                {enrichment.fmpRatios?.profitMargin != null && <MetricBox label="PROFIT MARGIN" value={(enrichment.fmpRatios.profitMargin * 100).toFixed(1) + "%"} />}
                {enrichment.fmpRatios?.debtEquity != null && <MetricBox label="DEBT/EQUITY" value={enrichment.fmpRatios.debtEquity.toFixed(2)} />}
                {enrichment.fmpRatios?.roe != null && <MetricBox label="ROE" value={(enrichment.fmpRatios.roe * 100).toFixed(1) + "%"} />}
                {enrichment.fmpProfile.beta != null && <MetricBox label="BETA" value={enrichment.fmpProfile.beta.toFixed(2)} />}
              </div>
            </div>
          )}

          {/* Analyst recommendation from Finnhub */}
          {enrichment.recommendation && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px" }}>ANALYST CONSENSUS</span>
                <SourceBadge source="finnhub" />
              </div>
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  <span style={{ color: "#00E676" }}>Buy {enrichment.recommendation.buy || 0}</span>
                  <span style={{ color: "#FFD740" }}>Hold {enrichment.recommendation.hold || 0}</span>
                  <span style={{ color: "#FF5252" }}>Sell {enrichment.recommendation.sell || 0}</span>
                </div>
                <div style={{ display: "flex", gap: 2, marginTop: 6, height: 4, borderRadius: 2, overflow: "hidden" }}>
                  {(() => {
                    const r = enrichment.recommendation;
                    const total = (r.strongBuy || 0) + (r.buy || 0) + (r.hold || 0) + (r.sell || 0) + (r.strongSell || 0) || 1;
                    const buyPct = (((r.strongBuy || 0) + (r.buy || 0)) / total) * 100;
                    const holdPct = ((r.hold || 0) / total) * 100;
                    const sellPct = (((r.sell || 0) + (r.strongSell || 0)) / total) * 100;
                    return (<>
                      <div style={{ width: `${buyPct}%`, background: "#00E676", borderRadius: "2px 0 0 2px" }} />
                      <div style={{ width: `${holdPct}%`, background: "#FFD740" }} />
                      <div style={{ width: `${sellPct}%`, background: "#FF5252", borderRadius: "0 2px 2px 0" }} />
                    </>);
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* News from Finnhub */}
          {enrichment.news && enrichment.news.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px" }}>RECENT NEWS</span>
                <SourceBadge source="finnhub" />
              </div>
              {enrichment.news.map((n, i) => (
                <div key={i} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "8px 12px", marginBottom: 4 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--c-text)", lineHeight: 1.4 }}>{n.headline}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", marginTop: 4 }}>
                    {n.source} · {new Date(n.datetime * 1000).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function GlobalMarketsTerminal() {
  const navigate                          = useNavigate();
  const { user, logout }                  = useAuth();
  const { prefs }                         = usePreferences();
  const { items: watchlistItems, loading: watchlistLoading, unpin, isPinned } = useWatchlist();
  const { setTickerItems }                = useTicker();
  const { selectedAsset, setSelectedAsset: rawSetSelectedAsset } = useSelectedAsset();
  const handleSelectAsset = useCallback((sym) => {
    if (!user && sym) {
      const asset = STATIC_ASSETS_MAP[sym];
      trackEvent('guest_asset_open', {
        symbol: sym,
        name: asset?.name || sym,
        group: asset?.cat || '',
      });
    }
    rawSetSelectedAsset(sym);
  }, [user, rawSetSelectedAsset]);
  const [marketData,      setMarketData]      = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [, setLastUpdate]                       = useState(null);
  const [activeFilter,    setActiveFilter]    = useState("all");
  const [sortMode,        setSortMode]        = useState("default");
  const [viewMode,        setViewMode]        = useState("cards");
  const [cardDensity,     setCardDensity]     = useState("compact");
  const [groupSort,       setGroupSort]       = useState("alpha");   // "alpha" | "return"
  const [groupDir,        setGroupDir]        = useState("asc");     // "asc" | "desc"
  const [activeExchanges, setActiveExchanges] = useState(new Set());
  const [macroData,       setMacroData]       = useState({});
  const [batchProfiles,   setBatchProfiles]   = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("collapsedGroups")) || {}; }
    catch { return {}; }
  });
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [flatExpand, setFlatExpand] = useState(false);
  const prevDataRef          = useRef(null);
  const intervalRef          = useRef(null);
  const mountedRef           = useRef(true);
  const assetsRef            = useRef(STATIC_ASSETS_MAP);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Guest analytics ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      trackEvent('guest_terminal_entry', { surface: 'global' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Taxonomy from TaxonomyContext (falls back to static data) ────────────────
  const { globalTaxonomy, groups: ctxGroups, subgroups: ctxSubgroups, loading: taxLoading } = useTaxonomy() ?? {};

  const CATEGORIES = useMemo(() => {
    if (globalTaxonomy?.length) {
      const map = {};
      for (const group of globalTaxonomy) {
        for (const sg of (group.subgroups || [])) {
          map[sg.id] = { label: sg.display_name, icon: sg.icon, color: sg.color, groupId: group.id };
        }
      }
      return map;
    }
    return STATIC_CATEGORIES;
  }, [globalTaxonomy]);

  const ASSETS = useMemo(() => {
    if (globalTaxonomy?.length) {
      const map = {};
      for (const group of globalTaxonomy) {
        for (const sg of (group.subgroups || [])) {
          for (const a of (sg.assets || [])) {
            map[a.symbol] = {
              name:     a.name,
              cat:      a.subgroup_id,
              sector:   a.sector || null,
              exchange: a.exchange || 'NASDAQ',
              type:     a.type,
              ...(a.meta ? (typeof a.meta === 'string' ? JSON.parse(a.meta) : a.meta) : {}),
            };
          }
        }
      }
      return map;
    }
    return STATIC_ASSETS_MAP;
  }, [globalTaxonomy]);

  // Keep ref in sync so loadData always uses latest ASSETS without re-creating the callback
  assetsRef.current = ASSETS;

  const assetsInCategory = useCallback((catKey) => {
    return Object.keys(ASSETS).filter(s => {
      const a = ASSETS[s];
      return a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
    });
  }, [ASSETS]);

  const toggleGroup = (catKey) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [catKey]: !prev[catKey] };
      sessionStorage.setItem("collapsedGroups", JSON.stringify(next));
      return next;
    });
  };
  const collapseAll = () => {
    setFlatExpand(false);
    setExpandedCards(new Set());
    const next = {};
    Object.keys(CATEGORIES).forEach(k => next[k] = true);
    setCollapsedGroups(next);
    sessionStorage.setItem("collapsedGroups", JSON.stringify(next));
  };
  const expandAll = () => {
    setFlatExpand(true);
    setCollapsedGroups({});
    setExpandedCards(new Set());
    sessionStorage.setItem("collapsedGroups", JSON.stringify({}));
  };
  const toggleCard = (catKey) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(catKey) ? next.delete(catKey) : next.add(catKey);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    // Fetch Yahoo data + CoinGecko crypto in parallel, using dynamic ASSETS from taxonomy
    const currentAssets = assetsRef.current;
    try {
      const [result, cryptoData] = await Promise.all([
        fetchMarketData(prevDataRef.current, currentAssets),
        fetchCryptoData(currentAssets),
      ]);
      if (!mountedRef.current) return;
      const merged = { ...(result.data || {}), ...cryptoData };
      if (Object.keys(merged).length > 0) {
        prevDataRef.current = merged;
        setMarketData(merged);
      } else if (prevDataRef.current && Object.keys(prevDataRef.current).length > 0) {
        setMarketData(prevDataRef.current);
      } else {
        setMarketData(null);
      }
      setLastUpdate(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[GMT] loadData error:', err);
      if (prevDataRef.current) setMarketData(prevDataRef.current);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refreshInterval = (prefs.refreshInterval || 30) * 1000;

  useEffect(() => {
    if (taxLoading) return;
    loadData();
    intervalRef.current = setInterval(loadData, refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [taxLoading, loadData, refreshInterval]);

  // Load FRED macro context data for group banners (once, after initial load)
  useEffect(() => {
    if (!hasFredKey() || !marketData) return;
    let cancelled = false;
    (async () => {
      const keys = [...new Set(Object.values(GROUP_MACRO).map(m => m.fredKey))];
      const results = {};
      for (const k of keys) {
        const r = await fredSeries(k);
        if (r && !cancelled) results[k] = r;
      }
      if (!cancelled) setMacroData(results);
    })();
    return () => { cancelled = true; };
  }, [!!marketData]);

  // Load FMP batch profiles for dividend screening (once, after initial load)
  useEffect(() => {
    if (!hasFmpKey() || !marketData) return;
    if (isExhausted('fmp')) {
      console.log('[GMT] FMP quota exhausted — skipping batchProfile');
      return;
    }
    let cancelled = false;
    (async () => {
      const equitySyms = Object.keys(ASSETS).filter(s => isEquityCat(ASSETS[s].cat));
      const profiles = await fmpBatchProfile(equitySyms);
      if (profiles && !cancelled) setBatchProfiles(profiles);
    })();
    return () => { cancelled = true; };
  }, [!!marketData]);

  // Removed from GlobalMarketsTerminal — the BrasilMacroBanner condition was
  // always false after migration 002 deleted the old "brazil" group.

  const toggleExchange = useCallback((exch) => {
    setActiveExchanges(prev => {
      const next = new Set(prev);
      next.has(exch) ? next.delete(exch) : next.add(exch);
      // Persist when user settles on a single exchange as the active filter
      return next;
    });
  }, []);

  const resetExchanges = useCallback(() => setActiveExchanges(new Set()), []);

  // All unique exchanges derived from ASSETS
  const allExchanges = [...new Set(Object.values(ASSETS).map(a => a.exchange))];

  // Compute dynamic dividends set from FMP batch profiles
  const dividendSymbols = batchProfiles
    ? Object.entries(batchProfiles).filter(([, p]) => p.dividendYield >= 3).map(([sym]) => sym)
    : [];

  // Combined filter predicate (handles cross-listing + dividends)
  const passes = useCallback((sym) => {
    const a = ASSETS[sym];
    if (!a) return false;
    let catMatch;
    if (activeFilter === "all") {
      catMatch = true;
    } else if (activeFilter === "dividends") {
      catMatch = dividendSymbols.includes(sym);
    } else {
      catMatch = a.cat === activeFilter || (a.alsoIn && a.alsoIn.includes(activeFilter));
    }
    return catMatch && (activeExchanges.size === 0 || activeExchanges.has(a.exchange));
  }, [activeFilter, activeExchanges, dividendSymbols]);

  // Sentiment over currently visible set
  const allPcts = marketData
    ? Object.keys(ASSETS)
        .filter(s => marketData[s] && passes(s))
        .map(s => marketData[s]?.changePct)
        .filter(n => typeof n === 'number' && !isNaN(n))
    : [];
  const avgPct        = allPcts.length > 0 ? allPcts.reduce((a, b) => a + b, 0) / allPcts.length : 0;
  const rising        = allPcts.filter(p => p > 0).length;
  const falling       = allPcts.filter(p => p < 0).length;
  const sentiment     = avgPct > 0.3 ? "BULLISH" : avgPct < -0.3 ? "BEARISH" : "MIXED";
  const sentimentColor = sentiment === "BULLISH" ? "#00E676" : sentiment === "BEARISH" ? "#FF5252" : "#FFD740";

  // Top movers from visible set
  const topMovers = marketData
    ? Object.entries(marketData).filter(([s]) => passes(s))
        .sort((a, b) => Math.abs(b[1].changePct) - Math.abs(a[1].changePct)).slice(0, 6)
    : [];

  // Flat sorted list (gainers / losers)
  const flatSymbols = sortMode !== "default" && activeFilter === "all" && marketData
    ? Object.keys(ASSETS)
        .filter(s => marketData[s] && passes(s))
        .sort((a, b) => sortMode === "gainers"
          ? (marketData[b].changePct ?? 0) - (marketData[a].changePct ?? 0)
          : (marketData[a].changePct ?? 0) - (marketData[b].changePct ?? 0))
    : null;

  // Category sections (filtered, hiding empty cats)
  const visibleCats = (activeFilter === "all" ? Object.keys(CATEGORIES) : [activeFilter])
    .filter(catKey => {
      if (catKey === "dividends") return dividendSymbols.some(s => marketData?.[s]);
      return Object.keys(ASSETS).some(s => {
        const a = ASSETS[s];
        const inCat = a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
        return inCat && passes(s) && marketData?.[s];
      });
    });

  // Helper: get symbols belonging to a group (used for sorting + rendering)
  const getGroupSymbols = useCallback((catKey) => {
    if (catKey === "dividends") return dividendSymbols.filter(s => marketData?.[s]);
    return Object.keys(ASSETS).filter(s => {
      const a = ASSETS[s];
      const inCat = a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
      return inCat && passes(s) && marketData?.[s];
    });
  }, [passes, marketData, dividendSymbols]);

  // Helper: compute avg daily % change for a group
  const getGroupAvgPct = useCallback((catKey) => {
    const syms = getGroupSymbols(catKey);
    if (!syms.length) return null;
    const pcts = syms
      .map(s => marketData?.[s]?.changePct)
      .filter(n => typeof n === 'number' && isFinite(n));
    return pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  }, [getGroupSymbols, marketData]);

  // Sort visibleCats by groupSort + groupDir
  const sortedCats = useMemo(() => {
    const arr = [...visibleCats];
    if (groupSort === "alpha") {
      arr.sort((a, b) => {
        const nameA = CATEGORIES[a]?.label || a;
        const nameB = CATEGORIES[b]?.label || b;
        return groupDir === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    } else {
      // sort by return (avg daily % change)
      arr.sort((a, b) => {
        const pctA = getGroupAvgPct(a);
        const pctB = getGroupAvgPct(b);
        // null (unavailable) goes to end
        if (pctA == null && pctB == null) return 0;
        if (pctA == null) return 1;
        if (pctB == null) return -1;
        return groupDir === "desc" ? pctB - pctA : pctA - pctB;
      });
    }
    return arr;
  }, [visibleCats, groupSort, groupDir, getGroupAvgPct]);

  // Check if all visible groups are collapsed → triggers card grid mode
  const allCollapsed = useMemo(() => {
    return visibleCats.length > 0 && visibleCats.every(k => collapsedGroups[k]);
  }, [visibleCats, collapsedGroups]);

  // Compute group stats for collapsed card grid
  const getGroupStats = useCallback((catKey) => {
    const syms = getGroupSymbols(catKey);
    const pcts = syms.map(s => marketData?.[s]?.changePct ?? 0);
    const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    // Sum market caps for total value
    const totalMcap = syms.reduce((sum, s) => sum + (marketData?.[s]?.marketCap ?? 0), 0);
    return { avgPct, totalMcap, count: syms.length };
  }, [getGroupSymbols, marketData]);

  const filterButtons = Object.entries(CATEGORIES).map(([key, cat]) => ({
    key, label: cat.label,
  }));
  filterButtons.unshift({ key: "all", label: "All Markets" });

  const tickerItems = useMemo(() => {
    if (!marketData) return [];
    return Object.entries(marketData)
      .filter(([, d]) => d?.price != null)
      .slice(0, 24)
      .map(([sym, d]) => ({
        ticker: ASSETS[sym]?.display || sym,
        price:  d.price,
        change: d.changePct ?? 0,
      }));
  }, [marketData, ASSETS]);

  useEffect(() => {
    setTickerItems(tickerItems);
  }, [tickerItems, setTickerItems]);

  // ── Group Summary Card ───────────────────────────────────────────────────
  // Reusable in both allCollapsed grid (layout="grid") and individual collapse (layout="row").
  // Closes over getGroupSymbols, marketData, ASSETS from component scope.
  function GroupSummaryCard({ catKey, cat, layout, onExpand, density = "compact" }) {
    const syms = getGroupSymbols(catKey);
    const pcts = syms
      .map(s => marketData?.[s]?.changePct)
      .filter(n => typeof n === 'number' && !isNaN(n));
    const avg = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const totalMcap = syms.reduce((sum, s) => sum + (marketData?.[s]?.marketCap ?? 0), 0);
    const count = syms.length;

    const accentColor = avg > 0 ? "#00d4aa" : avg < 0 ? "#ff6b6b" : "#2a4a6a";
    const pctColor    = avg > 0 ? "#00d4aa" : avg < 0 ? "#ff6b6b" : "#3d6080";
    const pctLabel    = avg > 0 ? `▲ +${avg.toFixed(2)}%` : avg < 0 ? `▼ ${avg.toFixed(2)}%` : "— 0.00%";
    const barWidth    = Math.min(Math.abs(avg) / 5 * 100, 100);

    const fmtMcap = (mc) => {
      if (!mc) return "—";
      const p = ASSETS[syms?.[0]]?.isB3 ? "R$ " : "$";
      if (mc >= 1e12) return p + (mc / 1e12).toFixed(2) + "T";
      if (mc >= 1e9)  return p + (mc / 1e9).toFixed(1) + "B";
      if (mc >= 1e6)  return p + (mc / 1e6).toFixed(1) + "M";
      return p + mc.toLocaleString();
    };

    const byAbs = [...syms]
      .filter(s => typeof marketData?.[s]?.changePct === 'number' && !isNaN(marketData[s].changePct))
      .sort((a, b) => Math.abs(marketData[b].changePct) - Math.abs(marketData[a].changePct));
    const topGainer = byAbs.find(s => marketData[s].changePct > 0) || null;
    const topLoser  = byAbs.find(s => marketData[s].changePct < 0) || null;

    const movers = (topGainer || topLoser) ? (
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {topGainer && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, padding: "1px 4px", borderRadius: 1, background: "#0a2018", color: "#00d4aa", border: "0.5px solid #1d5c3a" }}>
            {ASSETS[topGainer]?.display || topGainer} +{marketData[topGainer].changePct.toFixed(2)}%
          </span>
        )}
        {topLoser && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, padding: "1px 4px", borderRadius: 1, background: "#1e0a0a", color: "#ff6b6b", border: "0.5px solid #5c1d1d" }}>
            {ASSETS[topLoser]?.display || topLoser} {marketData[topLoser].changePct.toFixed(2)}%
          </span>
        )}
      </div>
    ) : null;

    const cardBase = {
      position: "relative", overflow: "hidden",
      background: "#0b1623", border: "0.5px solid #1a2f4a", borderRadius: 4,
      cursor: "pointer", transition: "border-color 120ms ease, background 120ms ease",
    };
    const onEnter = e => { e.currentTarget.style.borderColor = "#2a4a6a"; e.currentTarget.style.background = "#0d1929"; };
    const onLeave = e => { e.currentTarget.style.borderColor = "#1a2f4a"; e.currentTarget.style.background = "#0b1623"; };
    const accentBar = <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2.5, background: accentColor, borderRadius: "4px 0 0 4px" }} />;
    const progressBar = (
      <div style={{ background: "#1a2f4a", borderRadius: 1, height: 2, width: "100%" }}>
        <div style={{ height: 2, borderRadius: 1, width: `${barWidth}%`, background: accentColor, transition: "width 0.3s ease" }} />
      </div>
    );

    if (layout === "row") {
      // Horizontal full-width bar (individual collapsed group)
      return (
        <div onClick={onExpand} style={{ ...cardBase, display: "flex", alignItems: "center", gap: 16, padding: "12px 16px 14px 16px" }}
          onMouseEnter={onEnter} onMouseLeave={onLeave}>
          {accentBar}
          {/* progress bar pinned to bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1a2f4a" }}>
            <div style={{ height: 2, width: `${barWidth}%`, background: accentColor, borderRadius: 1 }} />
          </div>
          {/* icon */}
          <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{cat.icon}</span>
          {/* name */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#c8d8e8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {cat.label.toUpperCase()}
          </span>
          {/* ASSETS */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>ASSETS</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{count}</span>
          </div>
          {/* MKT CAP */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>MKT CAP</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{fmtMcap(totalMcap)}</span>
          </div>
          {/* movers */}
          {movers && <div style={{ flexShrink: 0 }}>{movers}</div>}
          {/* return */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: pctColor, flexShrink: 0 }}>{pctLabel}</span>
          {/* expand hint — always visible in row mode */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#1a3050", letterSpacing: "0.06em", flexShrink: 0 }}>EXPAND ▾</span>
        </div>
      );
    }

    // Grid card (allCollapsed mode)
    const dc = DENSITY_CONFIG[density] || DENSITY_CONFIG.compact;
    return (
      <div className="gmt-group-card" onClick={onExpand} style={{ ...cardBase, padding: dc.cardPadding, transition: "all 0.2s ease, border-color 120ms ease, background 120ms ease" }}
        onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {accentBar}
        {/* Row 1: icon + return */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: dc.iconSize, lineHeight: 1 }}>{cat.icon}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.pctSize, fontWeight: 700, color: pctColor }}>{pctLabel}</span>
        </div>
        {/* Row 2: name */}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.nameSize, fontWeight: 600, letterSpacing: "0.06em", color: "#c8d8e8", marginTop: 10, marginBottom: 10 }}>
          {cat.label.toUpperCase()}
        </div>
        {/* Row 3: stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetCountSize - 1, letterSpacing: "0.08em", color: "#2a4a6a" }}>ASSETS</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetCountSize, color: "#4a7fa5" }}>{count}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.mcapSize - 1, letterSpacing: "0.08em", color: "#2a4a6a" }}>MKT CAP</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.mcapSize, color: "#4a7fa5" }}>{fmtMcap(totalMcap)}</span>
          </div>
        </div>
        {/* Row 4: movers */}
        {movers && <div style={{ marginTop: 8 }}>{movers}</div>}
        {/* Row 5: progress bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ background: "#1a2f4a", borderRadius: 1, height: dc.barHeight, width: "100%" }}>
            <div style={{ height: dc.barHeight, borderRadius: 1, width: `${barWidth}%`, background: accentColor, transition: "width 0.3s ease" }} />
          </div>
        </div>
        {/* hover expand hint */}
        <span className="gmt-expand-hint" style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#1a3050", letterSpacing: "0.06em", opacity: 0, transition: "opacity 150ms ease", pointerEvents: "none" }}>EXPAND ▾</span>
      </div>
    );
  }

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}
    >
      <style>{`

        @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanline    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes slideUp     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn      { from{opacity:0} to{opacity:1} }
        @keyframes slideInRight{ from{transform:translateX(100%)} to{transform:translateX(0)} }

        .scanline-overlay { position:fixed;top:0;left:0;right:0;height:60px;background:linear-gradient(180deg,transparent,rgba(0,230,118,0.015),transparent);animation:scanline 8s linear infinite;pointer-events:none;z-index:0; }
        .section-animate  { animation:slideUp 0.5s ease both; }
        .gmt-group-card:hover .gmt-expand-hint { opacity: 1 !important; }
        .fade-in          { animation:fadeIn 0.4s ease both; }
        ::-webkit-scrollbar       { width:6px; }
        ::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08);border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.14); }
        * { box-sizing:border-box;margin:0;padding:0; }
      `}</style>

      <div className="scanline-overlay" />
      <div style={{ position:"fixed",top:"-20%",left:"-10%",width:"50%",height:"50%",background:"radial-gradient(ellipse,rgba(0,230,118,0.03) 0%,transparent 70%)",pointerEvents:"none" }} />
      <div style={{ position:"fixed",bottom:"-20%",right:"-10%",width:"50%",height:"50%",background:"radial-gradient(ellipse,rgba(124,77,255,0.025) 0%,transparent 70%)",pointerEvents:"none" }} />

      <AssetDetailDrawer
        symbol={selectedAsset}
        onClose={() => handleSelectAsset(null)}
        onSymbolChange={(sym) => handleSelectAsset(sym)}
      />

      {/* ── COMMAND BAR ── */}
      <CommandBar
        sentiment={sentiment}
        risingCount={rising}
        fallingCount={falling}
        avgChange={avgPct}
        topMovers={topMovers.map(([symbol, d]) => ({ symbol, changePct: d.changePct ?? 0 }))}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortMode={groupSort}
        sortDir={groupDir}
        onSortChange={(mode, dir) => { setGroupSort(mode); setGroupDir(dir); }}
        activeExchanges={activeExchanges}
        allExchanges={allExchanges}
        onExchangeToggle={toggleExchange}
        onExchangeReset={resetExchanges}
        viewMode={viewMode === "cards" ? "grid" : "list"}
        onViewChange={(mode) => setViewMode(mode === "grid" ? "cards" : "list")}
        onDensityChange={setCardDensity}
        cardDensity={cardDensity}
        onCollapseAll={collapseAll}
        onExpandAll={expandAll}
        flatExpand={flatExpand}
        onRefresh={loadData}
        groups={ctxGroups}
        subgroups={ctxSubgroups}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "0 20px 40px" }}>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 0", gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00E676", animation: "pulse 1.2s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--c-text-2)" }}>Connecting to market feeds...</span>
          </div>
        )}

        {/* ── OUT OF AIR ── */}
        {!loading && !marketData && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 20, textAlign: "center" }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📡</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: "var(--c-text-2)", letterSpacing: "2px" }}>SYSTEM OUT OF AIR</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--c-text-3)", letterSpacing: "1px", maxWidth: 360, lineHeight: 1.8 }}>
              No market data available.<br />All feeds are unreachable.
            </div>
            <button onClick={loadData}
              style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "var(--c-text-2)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6, padding: "8px 20px", cursor: "pointer", letterSpacing: "1px", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.target.style.borderColor = "#00E676"; e.target.style.color = "#00E676"; }}
              onMouseLeave={(e) => { e.target.style.borderColor = "var(--c-border)"; e.target.style.color = "var(--c-text-2)"; }}>
              RETRY
            </button>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        {!loading && marketData && (
          <div className="fade-in">

            {/* ── LIST VIEW — flat sortable table, mutually exclusive with card views ── */}
            {viewMode === "list" && (
              <AssetListView
                marketData={marketData}
                assets={ASSETS}
                passes={passes}
                subgroups={ctxSubgroups}
                groups={ctxGroups}
                onAssetClick={handleSelectAsset}
              />
            )}

            {/* ── CARD VIEWS (flatSymbols / flatExpand / collapsed / normal expanded) ── */}
            {viewMode !== "list" && (flatSymbols ? (
              <div style={{ marginTop: 16 }}>
                {viewMode === "list" && <ListColumnHeader />}
                {viewMode === "cards" ? (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${(DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGridMin}px, 1fr))`, gap: (DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGap, transition: "all 0.2s ease" }}>
                    {flatSymbols.map(sym => <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => handleSelectAsset(sym)} density={cardDensity} />)}
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                    {flatSymbols.map((sym, idx) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={idx + 1} onClick={() => handleSelectAsset(sym)} />)}
                  </div>
                )}
              </div>
            ) : flatExpand ? (
              /* ── FLAT EXPAND MODE — one continuous grid, no group headers ── */
              (() => {
                const seen = new Set();
                const flatItems = sortedCats.flatMap(catKey => {
                  const cat = CATEGORIES[catKey];
                  let syms = getGroupSymbols(catKey)
                    .filter(s => passes(s) && marketData[s] && !seen.has(s) && seen.add(s));
                  if (groupSort === 'return') {
                    syms = syms.slice().sort((a, b) => {
                      const pA = marketData?.[a]?.changePct;
                      const pB = marketData?.[b]?.changePct;
                      if (pA == null && pB == null) return 0;
                      if (pA == null) return 1;
                      if (pB == null) return -1;
                      return groupDir === 'desc' ? pB - pA : pA - pB;
                    });
                  } else {
                    syms = syms.slice().sort((a, b) => {
                      const nA = ASSETS[a]?.display || ASSETS[a]?.name || a;
                      const nB = ASSETS[b]?.display || ASSETS[b]?.name || b;
                      return groupDir === 'asc'
                        ? nA.localeCompare(nB, undefined, { sensitivity: 'base' })
                        : nB.localeCompare(nA, undefined, { sensitivity: 'base' });
                    });
                  }
                  return syms.map(s => ({ sym: s, groupLabel: cat.label }));
                });
                return (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${(DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGridMin}px, 1fr))`, gap: (DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGap, transition: "all 0.2s ease" }}>
                      {flatItems.map(({ sym, groupLabel }) => (
                        <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => handleSelectAsset(sym)} groupLabel={groupLabel} density={cardDensity} />
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : allCollapsed && viewMode === "list" ? (
              /* ── COLLAPSED LIST MODE ── */
              <div style={{ marginTop: 8, border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                {sortedCats.map((catKey) => {
                  const cat = CATEGORIES[catKey];
                  const stats = getGroupStats(catKey);
                  if (stats.count === 0) return null;
                  const isOpen = expandedCards.has(catKey);
                  const pctColor = stats.avgPct > 0 ? "#00E676" : stats.avgPct < 0 ? "#FF5252" : "var(--c-text-3)";
                  const pctSign = stats.avgPct > 0 ? "+" : stats.avgPct < 0 ? "−" : "";
                  const pctArrow = stats.avgPct > 0 ? "↑" : stats.avgPct < 0 ? "↓" : "";
                  const borderAccent = stats.avgPct >= 0 ? "#00E676" : "#FF5252";

                  // Gather symbols for the expanded inline view (same logic as collapsed card mode)
                  let symbols = null;
                  if (isOpen) {
                    if (catKey === "dividends") {
                      symbols = dividendSymbols.filter(s => marketData[s]);
                    } else {
                      symbols = Object.keys(ASSETS).filter(s => {
                        const a = ASSETS[s];
                        const inCat = a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
                        return inCat && marketData[s];
                      });
                    }
                    if (activeExchanges.size > 0) {
                      symbols = symbols.filter(s => activeExchanges.has(ASSETS[s]?.exchange));
                    }
                    if (sortMode !== "default") {
                      symbols = [...symbols].sort((a, b) =>
                        sortMode === "gainers"
                          ? (marketData[b]?.changePct ?? 0) - (marketData[a]?.changePct ?? 0)
                          : (marketData[a]?.changePct ?? 0) - (marketData[b]?.changePct ?? 0)
                      );
                    }
                    if (groupSort === 'return') {
                      symbols = symbols.slice().sort((a, b) => {
                        const pA = marketData?.[a]?.changePct;
                        const pB = marketData?.[b]?.changePct;
                        if (pA == null && pB == null) return 0;
                        if (pA == null) return 1;
                        if (pB == null) return -1;
                        return groupDir === 'desc' ? pB - pA : pA - pB;
                      });
                    } else if (groupSort === 'alpha') {
                      symbols = symbols.slice().sort((a, b) => {
                        const nA = ASSETS[a]?.display || ASSETS[a]?.name || a;
                        const nB = ASSETS[b]?.display || ASSETS[b]?.name || b;
                        return groupDir === 'asc'
                          ? nA.localeCompare(nB, undefined, { sensitivity: 'base' })
                          : nB.localeCompare(nA, undefined, { sensitivity: 'base' });
                      });
                    }
                  }

                  return (
                    <div key={catKey} style={{ borderBottom: "1px solid var(--c-border)" }}>
                      {/* Row header — always visible, click to expand/collapse */}
                      <div
                        onClick={() => toggleCard(catKey)}
                        style={{
                          display: "flex", alignItems: "center",
                          height: 40, padding: "0 16px",
                          borderLeft: `3px solid ${isOpen ? "#3b82f6" : borderAccent}`,
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          userSelect: "none",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--c-text)", flex: 1 }}>
                          {cat.icon} {cat.label}
                        </span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13, fontWeight: 700,
                          color: pctColor,
                          marginRight: 12,
                        }}>
                          {pctArrow} {pctSign}{Math.abs(stats.avgPct).toFixed(2)}%
                        </span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 16, lineHeight: 1,
                          color: isOpen ? "#3b82f6" : "var(--c-text-3)",
                          transition: "transform 0.25s ease, color 0.15s ease",
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                          display: "inline-block",
                        }}>›</span>
                      </div>

                      {/* Expanded inline content — slides in below the row header */}
                      <div style={{
                        overflow: "hidden",
                        maxHeight: isOpen ? 4000 : 0,
                        opacity: isOpen ? 1 : 0,
                        transition: "max-height 0.25s ease, opacity 0.2s ease",
                      }}>
                        <div style={{ borderTop: "1px solid var(--c-border)", padding: "12px 0" }}>
                          <MacroBanner macroData={macroData} catKey={catKey} />
                                                    {catKey === "dividends" && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 10,
                              background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)",
                              borderRadius: 6, padding: "8px 14px", marginBottom: 10, marginLeft: 3, marginRight: 3,
                            }}>
                              <SourceBadge source="fmp" />
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
                                Assets with dividend yield &gt; 3% (via FMP profile data)
                              </span>
                            </div>
                          )}
                          {symbols && (
                            <>
                              <ListColumnHeader />
                              <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                                {symbols.map((sym, i) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={i + 1} onClick={() => handleSelectAsset(sym)} />)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : allCollapsed ? (
              /* ── COLLAPSED CARD GRID MODE ── */
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${(DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).gridMin}px, 1fr))`, gap: (DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).gap, padding: "12px 0", transition: "all 0.2s ease" }}>
                {sortedCats.map((catKey) => {
                  const cat = CATEGORIES[catKey];
                  const stats = getGroupStats(catKey);
                  if (stats.count === 0) return null;
                  const isOpen = expandedCards.has(catKey);

                  if (!isOpen) {
                    return <GroupSummaryCard key={catKey} catKey={catKey} cat={cat} layout="grid" onExpand={() => toggleCard(catKey)} density={cardDensity} />;
                  }

                  // Expanded full-width slot
                  let symbols;
                  if (catKey === "dividends") {
                    symbols = dividendSymbols.filter(s => marketData[s]);
                  } else {
                    symbols = Object.keys(ASSETS).filter(s => {
                      const a = ASSETS[s];
                      const inCat = a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
                      return inCat && marketData[s];
                    });
                  }
                  if (activeExchanges.size > 0) {
                    symbols = symbols.filter(s => activeExchanges.has(ASSETS[s]?.exchange));
                  }
                  if (sortMode !== "default") {
                    symbols = [...symbols].sort((a, b) =>
                      sortMode === "gainers"
                        ? (marketData[b]?.changePct ?? 0) - (marketData[a]?.changePct ?? 0)
                        : (marketData[a]?.changePct ?? 0) - (marketData[b]?.changePct ?? 0)
                    );
                  }

                  return (
                    <div key={catKey} className="section-animate" style={{ gridColumn: "1 / -1", background: "rgba(0,200,255,0.03)", border: "0.5px solid #00BCD444", borderRadius: 4, padding: "14px 16px", position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "absolute", top: 10, left: 12, right: 12 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500, letterSpacing: "0.10em", color: "#2a4a6a", textTransform: "uppercase", userSelect: "none" }}>
                          {cat.icon} {cat.label}
                        </span>
                        <button
                          onClick={() => toggleCard(catKey)}
                          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, lineHeight: 1, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", transition: "all 0.15s ease" }}
                          onMouseEnter={e => { e.target.style.color = "#ff6b6b"; e.target.style.borderColor = "#ff6b6b"; }}
                          onMouseLeave={e => { e.target.style.color = "var(--c-text-3)"; e.target.style.borderColor = "var(--c-border)"; }}
                        >✕</button>
                      </div>
                      <div style={{ paddingTop: 38 }}>
                        <MacroBanner macroData={macroData} catKey={catKey} />
                                                {catKey === "dividends" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 6, padding: "8px 14px", marginBottom: 10 }}>
                            <SourceBadge source="fmp" />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
                              Assets with dividend yield &gt; 3% (via FMP profile data)
                            </span>
                          </div>
                        )}
                        {viewMode === "list" && <ListColumnHeader />}
                        {viewMode === "cards" ? (
                          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${(DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGridMin}px, 1fr))`, gap: (DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGap, transition: "all 0.2s ease" }}>
                            {symbols.map(sym => <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => handleSelectAsset(sym)} density={cardDensity} />)}
                          </div>
                        ) : (
                          <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                            {symbols.map((sym, i) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={i + 1} onClick={() => handleSelectAsset(sym)} />)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── NORMAL EXPANDED GROUP VIEW ── */
              <div style={{ marginTop: 8 }}>
                {sortedCats.map((catKey, idx) => {
                  const cat = CATEGORIES[catKey];
                  // Gather symbols: primary cat + cross-listed + dividends special case
                  let symbols;
                  if (catKey === "dividends") {
                    symbols = dividendSymbols.filter(s => marketData[s]);
                  } else {
                    symbols = Object.keys(ASSETS).filter(s => {
                      const a = ASSETS[s];
                      const inCat = a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
                      return inCat && marketData[s];
                    });
                  }
                  // Apply exchange filter
                  if (activeExchanges.size > 0) {
                    symbols = symbols.filter(s => activeExchanges.has(ASSETS[s]?.exchange));
                  }
                  if (sortMode !== "default") {
                    symbols = [...symbols].sort((a, b) =>
                      sortMode === "gainers"
                        ? (marketData[b]?.changePct ?? 0) - (marketData[a]?.changePct ?? 0)
                        : (marketData[a]?.changePct ?? 0) - (marketData[b]?.changePct ?? 0)
                    );
                  }
                  if (groupSort === 'return') {
                    symbols = symbols.slice().sort((a, b) => {
                      const pA = marketData?.[a]?.changePct;
                      const pB = marketData?.[b]?.changePct;
                      if (pA == null && pB == null) return 0;
                      if (pA == null) return 1;
                      if (pB == null) return -1;
                      return groupDir === 'desc' ? pB - pA : pA - pB;
                    });
                  } else if (groupSort === 'alpha') {
                    symbols = symbols.slice().sort((a, b) => {
                      const nA = ASSETS[a]?.display || ASSETS[a]?.name || a;
                      const nB = ASSETS[b]?.display || ASSETS[b]?.name || b;
                      return groupDir === 'asc'
                        ? nA.localeCompare(nB, undefined, { sensitivity: 'base' })
                        : nB.localeCompare(nA, undefined, { sensitivity: 'base' });
                    });
                  }
                  const catPcts = symbols.map(s => marketData[s]?.changePct ?? 0);
                  const catAvg  = catPcts.length ? catPcts.reduce((a, b) => a + b, 0) / catPcts.length : 0;
                  const catColor = catAvg >= 0 ? "#00E676" : "#FF5252";

                  if (symbols.length === 0) return null;

                  return (
                    <div key={catKey} className="section-animate" style={{ marginBottom: collapsedGroups[catKey] ? 8 : 24, animationDelay: `${idx * 0.08}s` }}>
                      {collapsedGroups[catKey] ? (
                        <GroupSummaryCard catKey={catKey} cat={cat} layout="row" onExpand={() => toggleGroup(catKey)} />
                      ) : (
                        <>
                          <div
                            onClick={() => toggleGroup(catKey)}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "6px 8px", borderRadius: 6, cursor: "pointer", userSelect: "none", minHeight: 44, transition: "background 0.15s ease" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "var(--c-text-3)", display: "inline-block" }}>▼</span>
                              <span style={{ fontSize: 16 }}>{cat.icon}</span>
                              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.3px", color: "var(--c-text)" }}>{cat.label}</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>({symbols.length})</span>
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: catColor }}>
                              {catAvg >= 0 ? "+" : ""}{catAvg.toFixed(2)}%
                            </div>
                          </div>
                          <MacroBanner macroData={macroData} catKey={catKey} />
                                                    {catKey === "dividends" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 6, padding: "8px 14px", marginBottom: 10 }}>
                              <SourceBadge source="fmp" />
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
                                Assets with dividend yield &gt; 3% (via FMP profile data)
                              </span>
                            </div>
                          )}
                          {viewMode === "list" && <ListColumnHeader />}
                          {viewMode === "cards" ? (
                            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${(DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGridMin}px, 1fr))`, gap: (DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact).assetGap, transition: "all 0.2s ease" }}>
                              {symbols.map(sym => <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => handleSelectAsset(sym)} density={cardDensity} />)}
                            </div>
                          ) : (
                            <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                              {symbols.map((sym, i) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={i + 1} onClick={() => handleSelectAsset(sym)} />)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Footer */}
            <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 14, marginTop: 10, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>MULTI-SOURCE: YAHOO · FINNHUB · FRED · FMP · COINGECKO</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>{Object.keys(ASSETS).length} ASSETS · {Object.keys(CATEGORIES).length} GROUPS · 5 SOURCES</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
