import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  hasFinnhubKey, finnhubNews, finnhubRecommendation,
  hasFmpKey, fmpProfile, fmpRatios, fmpBatchProfile,
  hasFredKey, fredSeries, fredAllMacro, getFredSeriesConfig,
  hasAlphaVantageKey, alphaVantageRSI, alphaVantageMACD,
  coingeckoPrices,
  bcbMacro, awesomeFx,
  getSourceStatus,
  fetchYahooMarketData,
  fetchB3MarketData,
  fetchYahooChartData,
} from "./dataServices.js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 30000;

const CATEGORIES = {
  tech:       { label: "Big Tech",              icon: "⚡", color: "#00BCD4" },
  energy:     { label: "Big Oil & Energy",      icon: "🛢", color: "#FF9100" },
  financials: { label: "Financials & Banks",    icon: "🏦", color: "#4CAF50" },
  healthcare: { label: "Healthcare & Pharma",   icon: "💊", color: "#E91E63" },
  semis:      { label: "Semiconductors",        icon: "🔬", color: "#26C6DA" },
  consumer:   { label: "Consumer & Retail",     icon: "🛒", color: "#FF7043" },
  defense:    { label: "Defense & Aerospace",   icon: "🛡", color: "#607D8B" },
  ev:         { label: "EVs & Clean Energy",    icon: "🔋", color: "#66BB6A" },
  reits:      { label: "REITs & Real Estate",   icon: "🏢", color: "#AB47BC" },
  dividends:  { label: "Dividends & Income",    icon: "💰", color: "#FFC107" },
  emerging:   { label: "Emerging Markets",      icon: "🌍", color: "#26A69A" },
  crypto:     { label: "Crypto Assets",         icon: "🪙", color: "#F9A825" },
  indices:    { label: "Global Indices",        icon: "🌐", color: "#7C4DFF" },
  fx:         { label: "Major Currencies",      icon: "💱", color: "#FFD740" },
  brasil:     { label: "Brasil — B3",           icon: "🇧🇷", color: "#009C3B" },
};

const EXCHANGE_COLORS = {
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

const ASSETS = {
  // ── Big Tech ──
  AAPL:  { name: "Apple",            cat: "tech",    exchange: "NASDAQ" },
  MSFT:  { name: "Microsoft",        cat: "tech",    exchange: "NASDAQ" },
  GOOGL: { name: "Alphabet",         cat: "tech",    exchange: "NASDAQ" },
  AMZN:  { name: "Amazon",           cat: "tech",    exchange: "NASDAQ", alsoIn: ["consumer"] },
  NVDA:  { name: "NVIDIA",           cat: "tech",    exchange: "NASDAQ", alsoIn: ["semis"] },
  META:  { name: "Meta Platforms",   cat: "tech",    exchange: "NASDAQ" },
  TSLA:  { name: "Tesla",            cat: "tech",    exchange: "NASDAQ", alsoIn: ["ev"] },
  ORCL:  { name: "Oracle",           cat: "tech",    exchange: "NYSE"   },
  // ── Big Oil & Energy ──
  XOM:   { name: "ExxonMobil",       cat: "energy",  exchange: "NYSE" },
  CVX:   { name: "Chevron",          cat: "energy",  exchange: "NYSE" },
  SHEL:  { name: "Shell",            cat: "energy",  exchange: "NYSE" },
  TTE:   { name: "TotalEnergies",    cat: "energy",  exchange: "NYSE" },
  COP:   { name: "ConocoPhillips",   cat: "energy",  exchange: "NYSE" },
  BP:    { name: "BP",               cat: "energy",  exchange: "NYSE" },
  ENB:   { name: "Enbridge",         cat: "energy",  exchange: "NYSE" },
  SLB:   { name: "Schlumberger",     cat: "energy",  exchange: "NYSE" },
  // ── Financials & Banks ──
  JPM:   { name: "JPMorgan Chase",   cat: "financials", exchange: "NYSE" },
  GS:    { name: "Goldman Sachs",    cat: "financials", exchange: "NYSE" },
  BAC:   { name: "Bank of America",  cat: "financials", exchange: "NYSE" },
  WFC:   { name: "Wells Fargo",      cat: "financials", exchange: "NYSE" },
  MS:    { name: "Morgan Stanley",   cat: "financials", exchange: "NYSE" },
  V:     { name: "Visa",             cat: "financials", exchange: "NYSE" },
  MA:    { name: "Mastercard",       cat: "financials", exchange: "NYSE" },
  BLK:   { name: "BlackRock",        cat: "financials", exchange: "NYSE" },
  // ── Healthcare & Pharma ──
  JNJ:   { name: "Johnson & Johnson",cat: "healthcare", exchange: "NYSE" },
  PFE:   { name: "Pfizer",           cat: "healthcare", exchange: "NYSE" },
  UNH:   { name: "UnitedHealth",     cat: "healthcare", exchange: "NYSE" },
  LLY:   { name: "Eli Lilly",        cat: "healthcare", exchange: "NYSE" },
  ABT:   { name: "Abbott Labs",      cat: "healthcare", exchange: "NYSE" },
  MRNA:  { name: "Moderna",          cat: "healthcare", exchange: "NASDAQ" },
  // ── Semiconductors ──
  AMD:   { name: "AMD",              cat: "semis",   exchange: "NASDAQ" },
  INTC:  { name: "Intel",            cat: "semis",   exchange: "NASDAQ" },
  TSM:   { name: "TSMC",             cat: "semis",   exchange: "NYSE" },
  QCOM:  { name: "Qualcomm",         cat: "semis",   exchange: "NASDAQ" },
  AVGO:  { name: "Broadcom",         cat: "semis",   exchange: "NASDAQ" },
  ASML:  { name: "ASML",             cat: "semis",   exchange: "NASDAQ" },
  // ── Consumer & Retail ──
  WMT:   { name: "Walmart",          cat: "consumer", exchange: "NYSE" },
  TGT:   { name: "Target",           cat: "consumer", exchange: "NYSE" },
  COST:  { name: "Costco",           cat: "consumer", exchange: "NASDAQ" },
  NKE:   { name: "Nike",             cat: "consumer", exchange: "NYSE" },
  LVMUY: { name: "LVMH",             cat: "consumer", exchange: "NYSE" },
  // ── Defense & Aerospace ──
  LMT:   { name: "Lockheed Martin",  cat: "defense",  exchange: "NYSE" },
  RTX:   { name: "Raytheon",         cat: "defense",  exchange: "NYSE" },
  NOC:   { name: "Northrop Grumman", cat: "defense",  exchange: "NYSE" },
  BA:    { name: "Boeing",           cat: "defense",  exchange: "NYSE" },
  GD:    { name: "General Dynamics", cat: "defense",  exchange: "NYSE" },
  // ── EVs & Clean Energy ──
  RIVN:  { name: "Rivian",           cat: "ev",       exchange: "NASDAQ" },
  BYDDY: { name: "BYD",              cat: "ev",       exchange: "NYSE" },
  NEE:   { name: "NextEra Energy",   cat: "ev",       exchange: "NYSE" },
  ENPH:  { name: "Enphase Energy",   cat: "ev",       exchange: "NASDAQ" },
  FSLR:  { name: "First Solar",      cat: "ev",       exchange: "NASDAQ" },
  // ── REITs & Real Estate ──
  PLD:   { name: "Prologis",         cat: "reits",    exchange: "NYSE" },
  AMT:   { name: "American Tower",   cat: "reits",    exchange: "NYSE" },
  EQIX:  { name: "Equinix",          cat: "reits",    exchange: "NASDAQ" },
  SPG:   { name: "Simon Property",   cat: "reits",    exchange: "NYSE" },
  // ── Emerging Markets (ETFs) ──
  EWZ:   { name: "Brazil ETF",       cat: "emerging", exchange: "NYSE" },
  INDA:  { name: "India ETF",        cat: "emerging", exchange: "NASDAQ" },
  MCHI:  { name: "China ETF",        cat: "emerging", exchange: "NASDAQ" },
  EWY:   { name: "South Korea ETF",  cat: "emerging", exchange: "NYSE" },
  // ── Crypto (CoinGecko only) ──
  BTC:   { name: "Bitcoin",   display: "BTC", cat: "crypto", exchange: "CRYPTO", cgId: "bitcoin",  isCrypto: true },
  ETH:   { name: "Ethereum",  display: "ETH", cat: "crypto", exchange: "CRYPTO", cgId: "ethereum", isCrypto: true },
  SOL:   { name: "Solana",    display: "SOL", cat: "crypto", exchange: "CRYPTO", cgId: "solana",   isCrypto: true },
  // ── Global Indices ──
  "^GSPC":    { name: "S&P 500",      display: "SPX",     cat: "indices", exchange: "INDEX" },
  "^DJI":     { name: "Dow Jones",    display: "DJIA",    cat: "indices", exchange: "INDEX" },
  "^IXIC":    { name: "NASDAQ Comp.", display: "IXIC",    cat: "indices", exchange: "INDEX" },
  "^FTSE":    { name: "FTSE 100",     display: "FTSE",    cat: "indices", exchange: "LSE"   },
  "^GDAXI":   { name: "DAX",          display: "DAX",     cat: "indices", exchange: "XETRA" },
  "^N225":    { name: "Nikkei 225",   display: "N225",    cat: "indices", exchange: "TSE"   },
  "^HSI":     { name: "Hang Seng",    display: "HSI",     cat: "indices", exchange: "HKEX"  },
  "^BVSP":    { name: "Ibovespa",     display: "IBOV",    cat: "indices", exchange: "B3"    },
  // ── Major Currencies ──
  "EURUSD=X": { name: "Euro / US Dollar",              display: "EUR/USD", cat: "fx", exchange: "FOREX" },
  "GBPUSD=X": { name: "British Pound / US Dollar",     display: "GBP/USD", cat: "fx", exchange: "FOREX" },
  "USDJPY=X": { name: "US Dollar / Japanese Yen",      display: "USD/JPY", cat: "fx", exchange: "FOREX" },
  "USDCNY=X": { name: "US Dollar / Chinese Yuan",      display: "USD/CNY", cat: "fx", exchange: "FOREX" },
  "USDCHF=X": { name: "US Dollar / Swiss Franc",       display: "USD/CHF", cat: "fx", exchange: "FOREX" },
  "USDBRL=X": { name: "US Dollar / Brazilian Real",    display: "USD/BRL", cat: "fx", exchange: "FOREX" },
  "AUDUSD=X": { name: "Australian Dollar / US Dollar", display: "AUD/USD", cat: "fx", exchange: "FOREX" },
  "USDCAD=X": { name: "US Dollar / Canadian Dollar",   display: "USD/CAD", cat: "fx", exchange: "FOREX" },
  // ── Brasil — B3 (via BRAPI) ──
  PETR4:  { name: "Petrobras PN",             cat: "brasil", exchange: "B3", isB3: true },
  PETR3:  { name: "Petrobras ON",             cat: "brasil", exchange: "B3", isB3: true },
  VALE3:  { name: "Vale",                     cat: "brasil", exchange: "B3", isB3: true },
  ITUB4:  { name: "Itaú Unibanco",            cat: "brasil", exchange: "B3", isB3: true },
  BBDC4:  { name: "Bradesco",                 cat: "brasil", exchange: "B3", isB3: true },
  BBAS3:  { name: "Banco do Brasil",          cat: "brasil", exchange: "B3", isB3: true },
  SANB11: { name: "Santander Brasil",         cat: "brasil", exchange: "B3", isB3: true },
  MGLU3:  { name: "Magazine Luiza",           cat: "brasil", exchange: "B3", isB3: true },
  RENT3:  { name: "Localiza",                 cat: "brasil", exchange: "B3", isB3: true },
  LREN3:  { name: "Lojas Renner",             cat: "brasil", exchange: "B3", isB3: true },
  VIVT3:  { name: "Vivo / Telefônica Brasil", cat: "brasil", exchange: "B3", isB3: true },
  ELET3:  { name: "Eletrobras",               cat: "brasil", exchange: "B3", isB3: true },
  SBSP3:  { name: "Sabesp",                   cat: "brasil", exchange: "B3", isB3: true },
  CSNA3:  { name: "CSN",                      cat: "brasil", exchange: "B3", isB3: true },
  GGBR4:  { name: "Gerdau",                   cat: "brasil", exchange: "B3", isB3: true },
  SLCE3:  { name: "SLC Agrícola",             cat: "brasil", exchange: "B3", isB3: true },
  AGRO3:  { name: "BrasilAgro",               cat: "brasil", exchange: "B3", isB3: true },
};

// Macro context banners: which FRED series to show for each group
const GROUP_MACRO = {
  financials: { fredKey: "fedRate",           label: "Fed Funds Rate" },
  consumer:   { fredKey: "consumerSentiment", label: "Consumer Sentiment" },
  ev:         { fredKey: "treasury10y",       label: "10Y Treasury Yield" },
  reits:      { fredKey: "mortgage30y",       label: "30-Year Mortgage Rate" },
};

// Cross-listing: find all assets that belong to a given category (primary or alsoIn)
function assetsInCategory(catKey) {
  return Object.keys(ASSETS).filter(s => {
    const a = ASSETS[s];
    return a.cat === catKey || (a.alsoIn && a.alsoIn.includes(catKey));
  });
}

// All equity symbols (for FMP batch, Finnhub fallback, etc.)
const EQUITY_CATS = new Set(["tech", "energy", "financials", "healthcare", "semis", "consumer", "defense", "ev", "reits", "emerging"]);
function isEquityCat(cat) { return EQUITY_CATS.has(cat); }

const VOLATILITY = {
  tech: 0.018, energy: 0.014, financials: 0.012, healthcare: 0.014,
  semis: 0.020, consumer: 0.010, defense: 0.010, ev: 0.025,
  reits: 0.012, emerging: 0.016, crypto: 0.035, indices: 0.01, fx: 0.004,
  brasil: 0.018,
};

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
function formatVolume(v) {
  if (!v && v !== 0) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
}

function formatMarketCap(mc) {
  if (!mc) return "—";
  if (mc >= 1e12) return "$" + (mc / 1e12).toFixed(2) + "T";
  if (mc >= 1e9)  return "$" + (mc / 1e9).toFixed(1) + "B";
  if (mc >= 1e6)  return "$" + (mc / 1e6).toFixed(1) + "M";
  return "$" + mc.toLocaleString();
}

function formatPrice(symbol, price) {
  if (price == null) return "—";
  const asset = ASSETS[symbol];
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
  const arr = [basePrice];
  for (let i = 1; i < points; i++) {
    const prev = arr[i - 1];
    arr.push(prev + prev * vol * (Math.random() - 0.48));
  }
  return arr;
}

async function fetchMarketData(prevData) {
  // Exclude crypto (CoinGecko) and B3 (BRAPI) — they use dedicated sources
  const yahooSymbols = Object.keys(ASSETS).filter(s => !ASSETS[s].isCrypto && !ASSETS[s].isB3);
  return fetchYahooMarketData(yahooSymbols, prevData, { assets: ASSETS, volatility: VOLATILITY, isEquityCat });
}

// Fetch crypto data from CoinGecko and merge into the same data shape
async function fetchCryptoData() {
  const cryptoAssets = Object.entries(ASSETS).filter(([, a]) => a.isCrypto);
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

// Fetch B3 data from BRAPI, with Yahoo .SA suffix fallback
async function fetchB3Data() {
  const b3Assets = Object.entries(ASSETS).filter(([, a]) => a.isB3);
  return fetchB3MarketData(b3Assets, { assets: ASSETS, volatility: VOLATILITY });
}

async function fetchChartData(symbol, range, interval) {
  return fetchYahooChartData(symbol, range, interval, { assets: ASSETS });
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ data, positive, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pad   = 2;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
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

// ─── BRASIL MACRO BANNER ──────────────────────────────────────────────────────
function BrasilMacroBanner({ brasilMacro }) {
  if (!brasilMacro) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,156,59,0.08)", border: "1px solid rgba(0,156,59,0.2)",
        borderRadius: 6, padding: "8px 14px", marginBottom: 10,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#009C3B", animation: "pulse 1.2s ease-in-out infinite" }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>Loading Brazilian macro data...</span>
      </div>
    );
  }
  const na = "N/A";
  const items = [
    { label: "SELIC",   value: brasilMacro.selic != null ? brasilMacro.selic + "%" : na, color: "#009C3B", src: "bcb" },
    { label: "IPCA",    value: brasilMacro.ipca != null ? brasilMacro.ipca + "%" : na,   color: "#003087", src: "bcb" },
    { label: "CDI",     value: brasilMacro.cdi != null ? brasilMacro.cdi + "%" : na,     color: "#7C4DFF", src: "bcb" },
    { label: "USD/BRL", value: brasilMacro.usdBrl != null ? "R$ " + Number(brasilMacro.usdBrl).toFixed(2) : na, color: "#FF6B00", src: "awesomeapi",
      pct: brasilMacro.usdBrlPct },
  ];
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
      background: "rgba(0,156,59,0.08)", border: "1px solid rgba(0,156,59,0.2)",
      borderRadius: 6, padding: "8px 14px", marginBottom: 10,
    }}>
      <SourceBadge source="bcb" />
      <SourceBadge source="awesomeapi" />
      {items.map(it => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>{it.label}:</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: it.value === na ? "var(--c-text-3)" : it.color }}>{it.value}</span>
          {it.pct != null && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: it.pct >= 0 ? "#00E676" : "#FF5252" }}>
              {it.pct >= 0 ? "+" : ""}{it.pct.toFixed(2)}%
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── CROSS-LIST BADGE ────────────────────────────────────────────────────────
function CrossListBadge({ symbol }) {
  const asset = ASSETS[symbol];
  if (!asset?.alsoIn || asset.alsoIn.length === 0) return null;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 700,
      letterSpacing: "0.5px", color: "#78909C",
      background: "rgba(120,144,156,0.12)", border: "1px solid rgba(120,144,156,0.25)",
      borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap",
    }}>
      +{asset.alsoIn.map(c => CATEGORIES[c]?.label?.split(" ")[0] || c).join(",")}
    </span>
  );
}

// ─── ASSET CARD ───────────────────────────────────────────────────────────────
function AssetCard({ symbol, data, onClick }) {
  const [hovered, setHovered] = useState(false);
  const asset = ASSETS[symbol];
  if (!asset || !data) return null;

  const positive     = data.changePct >= 0;
  const color        = positive ? "#00E676" : "#FF5252";
  const arrow        = positive ? "▲" : "▼";
  const sign         = positive ? "+" : "";
  const displayTicker = asset.display || symbol;
  const heatWidth    = Math.min(Math.abs(data.changePct) / 4, 1) * 100;
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
        borderRadius: 8, padding: "12px 14px 8px",
        transition: "all 0.25s ease", position: "relative",
        overflow: "hidden", cursor: "pointer",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.5px" }}>
            {displayTicker}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "var(--c-text-2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {asset.name}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
            <ExchangeBadge exchange={asset.exchange} />
            {asset.isCrypto && <SourceBadge source="coingecko" />}
            {asset.isB3 && <SourceBadge source="brapi" />}
            <CrossListBadge symbol={symbol} />
          </div>
        </div>
        <Sparkline data={data.sparkline} positive={positive} />
      </div>

      {/* Price row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: showVolume ? 6 : 2, marginTop: 6 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
          {formatPrice(symbol, data.price)}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color }}>
            {arrow} {sign}{data.changePct.toFixed(2)}%
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: color + "99", marginTop: 1 }}>
            {sign}{data.change.toFixed(asset.cat === "fx" ? 4 : 2)}
          </div>
        </div>
      </div>

      {/* Volume / H-L */}
      {showVolume && (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginBottom: 6 }}>
          <span>Vol {formatVolume(data.volume)}</span>
          <span>H {formatPrice(symbol, data.high)} · L {formatPrice(symbol, data.low)}</span>
        </div>
      )}

      {/* Heat bar */}
      <div style={{ height: 3, background: "var(--c-border)", borderRadius: 2, overflow: "hidden", marginTop: showVolume ? 0 : 6 }}>
        <div style={{ height: "100%", width: `${heatWidth}%`, background: `linear-gradient(90deg,${color}66,${color})`, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── LIST COLUMN HEADER ───────────────────────────────────────────────────────
function ListColumnHeader() {
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
function AssetRow({ symbol, data, rank, onClick }) {
  const [hovered, setHovered] = useState(false);
  const asset = ASSETS[symbol];
  if (!asset || !data) return null;

  const positive     = data.changePct >= 0;
  const color        = positive ? "#00E676" : "#FF5252";
  const sign         = positive ? "+" : "";
  const displayTicker = asset.display || symbol;
  const catInfo      = CATEGORIES[asset.cat];

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
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color }}>{positive ? "▲" : "▼"} {sign}{data.changePct.toFixed(2)}%</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: color + "80", marginTop: 1 }}>{sign}{data.change.toFixed(asset.cat === "fx" ? 4 : 2)}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", textAlign: "right" }}>{asset.cat !== "fx" ? formatVolume(data.volume) : "—"}</div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Sparkline data={data.sparkline} positive={positive} width={60} height={22} />
      </div>
    </div>
  );
}

// ─── HAMBURGER MENU ───────────────────────────────────────────────────────────
function HamburgerMenu({ open, onClose, activeFilter, onFilterChange, activeExchanges, onExchangeToggle, onResetExchanges, theme, onThemeToggle, lastUpdate, allExchanges, currentView, onNavigate }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const navItems = [
    { key: "all",        label: "All Markets",      icon: "🌍" },
    { key: "tech",       label: "Big Tech",         icon: "⚡" },
    { key: "energy",     label: "Big Oil",          icon: "🛢" },
    { key: "financials", label: "Financials",       icon: "🏦" },
    { key: "healthcare", label: "Healthcare",       icon: "💊" },
    { key: "semis",      label: "Semiconductors",   icon: "🔬" },
    { key: "consumer",   label: "Consumer",         icon: "🛒" },
    { key: "defense",    label: "Defense",          icon: "🛡" },
    { key: "ev",         label: "EVs & Clean",      icon: "🔋" },
    { key: "reits",      label: "REITs",            icon: "🏢" },
    { key: "dividends",  label: "Dividends",        icon: "💰" },
    { key: "emerging",   label: "Emerging",         icon: "🌍" },
    { key: "crypto",     label: "Crypto",           icon: "🪙" },
    { key: "indices",    label: "Indices",          icon: "🌐" },
    { key: "fx",         label: "FX",               icon: "💱" },
    { key: "brasil",     label: "Brasil — B3",      icon: "🇧🇷" },
  ];

  const SectionLabel = ({ children }) => (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 10 }}>
      {children}
    </div>
  );

  const Divider = () => <div style={{ height: 1, background: "var(--c-border)", margin: "4px 18px" }} />;

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--c-overlay)", zIndex: 200 }} />}

      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 288,
        background: "var(--c-panel)", borderRight: "1px solid var(--c-border)",
        zIndex: 201, overflowY: "auto", display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 18px 16px", borderBottom: "1px solid var(--c-border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#00E676", letterSpacing: "1.5px" }}>MENU</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--c-text-2)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>✕</button>
        </div>

        {/* Pages — first section */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>PAGES</SectionLabel>
          {[
            { key: "dashboard", label: "Dashboard",     icon: "📊" },
            { key: "heatmap",   label: "Market Heatmap", icon: "🔥" },
            { key: "news",      label: "Market News",   icon: "📰" },
            { key: "catalog",   label: "Data Catalog",  icon: "📋" },
          ].map(pg => {
            const active = currentView === pg.key;
            return (
              <button key={pg.key} onClick={() => { onNavigate(pg.key); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 700 : 400,
                  color: active ? "#00E676" : "var(--c-text-2)", background: active ? "rgba(0,230,118,0.06)" : "transparent",
                  border: "none", borderLeft: `2px solid ${active ? "#00E676" : "transparent"}`,
                  padding: "8px 12px", cursor: "pointer", transition: "all 0.15s ease",
                  borderRadius: "0 6px 6px 0", marginBottom: 2,
                }}>
                <span style={{ fontSize: 14 }}>{pg.icon}</span>{pg.label}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* Asset Groups */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>ASSET GROUPS</SectionLabel>
          {navItems.map(btn => {
            const active = activeFilter === btn.key;
            return (
              <button key={btn.key} onClick={() => { onFilterChange(btn.key); onNavigate("dashboard"); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: active ? 700 : 400,
                  color: active ? "#00E676" : "var(--c-text-2)", background: active ? "rgba(0,230,118,0.06)" : "transparent",
                  border: "none", borderLeft: `2px solid ${active ? "#00E676" : "transparent"}`,
                  padding: "6px 12px", cursor: "pointer", transition: "all 0.15s ease",
                  borderRadius: "0 6px 6px 0", marginBottom: 1,
                }}>
                <span style={{ fontSize: 13 }}>{btn.icon}</span>{btn.label}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* Exchange filter */}
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionLabel>EXCHANGE FILTER</SectionLabel>
            {activeExchanges.size > 0 && (
              <button onClick={onResetExchanges} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#FF5252", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.5px", marginTop: -8 }}>
                CLEAR ALL
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allExchanges.map(exch => {
              const active = activeExchanges.has(exch);
              const c = EXCHANGE_COLORS[exch] || "#9E9E9E";
              return (
                <button key={exch} onClick={() => onExchangeToggle(exch)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                    color: active ? c : "var(--c-text-3)", background: active ? c + "18" : "transparent",
                    border: `1px solid ${active ? c + "50" : "var(--c-border)"}`,
                    borderRadius: 4, padding: "4px 10px", cursor: "pointer",
                    letterSpacing: "0.5px", transition: "all 0.15s ease",
                  }}>
                  {exch}
                </button>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* Watchlist placeholder */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>WATCHLIST</SectionLabel>
          <div style={{ border: "1px dashed var(--c-border)", borderRadius: 6, padding: "16px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.25 }}>★</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>COMING SOON</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--c-text-3)", marginTop: 4 }}>Pin your favourite assets here</div>
          </div>
        </div>

        <Divider />

        {/* Theme toggle */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>APPEARANCE</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--c-text-2)" }}>
              {theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}
            </span>
            <button onClick={onThemeToggle}
              style={{
                width: 44, height: 24, borderRadius: 12, position: "relative", padding: 0, cursor: "pointer",
                background: theme === "dark" ? "rgba(0,230,118,0.2)" : "rgba(99,102,241,0.2)",
                border: `1px solid ${theme === "dark" ? "#00E67640" : "rgba(99,102,241,0.4)"}`,
                transition: "all 0.25s ease",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", position: "absolute", top: 3,
                left: theme === "dark" ? 23 : 3,
                background: theme === "dark" ? "#00E676" : "#6366f1",
                transition: "left 0.25s ease",
              }} />
            </button>
          </div>
        </div>

        <Divider />

        {/* About */}
        <div style={{ padding: "16px 18px 24px", marginTop: "auto" }}>
          <SectionLabel>ABOUT</SectionLabel>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.7 }}>
            Global Markets Terminal
            <br />
            <span style={{ color: "var(--c-text-3)", fontSize: 11 }}>Multi-source financial data</span>
          </div>
          {lastUpdate && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginTop: 8, letterSpacing: "0.5px" }}>
              Last update: {lastUpdate.toLocaleTimeString("en-US", { hour12: false })}
            </div>
          )}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginTop: 4, letterSpacing: "0.5px" }}>
            {Object.keys(ASSETS).length} assets · {Object.keys(CATEGORIES).length} groups · 9 sources
          </div>
        </div>
      </div>
    </>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({ symbol, data, onClose }) {
  const asset = ASSETS[symbol];
  if (!asset || !data) return null;

  const [activeRange, setActiveRange] = useState("1D");
  const chartCache    = useRef({});
  const activeRangeRef = useRef("1D");
  const [chartState, setChartState] = useState({ status: "loading", data: null, error: "" });

  const displayTicker = asset.display || symbol;
  const catInfo       = CATEGORIES[asset.cat];
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
  const positive     = displayPct >= 0;
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
                {positive ? "▲" : "▼"} {sign}{displayPct.toFixed(2)}%
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: color + "99", marginTop: 2 }}>
                {sign}{displayDelta.toFixed(asset.cat === "fx" ? 4 : 2)} {periodLabel}
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
export default function GlobalMarketsTerminal({ currentView = "dashboard", onNavigate, catalogPage, newsPage, heatmapPage }) {
  const [marketData,      setMarketData]      = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [lastUpdate,      setLastUpdate]       = useState(null);
  const [activeFilter,    setActiveFilter]    = useState("all");
  const [sortMode,        setSortMode]        = useState("default");
  const [viewMode,        setViewMode]        = useState("cards");
  const [groupSort,       setGroupSort]       = useState("alpha");   // "alpha" | "return"
  const [groupDir,        setGroupDir]        = useState("asc");     // "asc" | "desc"
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [theme,           setTheme]           = useState("dark");
  const [activeExchanges, setActiveExchanges] = useState(new Set());
  const [selectedAsset,   setSelectedAsset]   = useState(null);
  const [macroData,       setMacroData]       = useState({});
  const [batchProfiles,   setBatchProfiles]   = useState(null);
  const [brasilMacro,     setBrasilMacro]     = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("collapsedGroups")) || {}; }
    catch { return {}; }
  });
  const [expandedCards, setExpandedCards] = useState(new Set());
  const prevDataRef  = useRef(null);
  const intervalRef  = useRef(null);

  const toggleGroup = (catKey) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [catKey]: !prev[catKey] };
      sessionStorage.setItem("collapsedGroups", JSON.stringify(next));
      return next;
    });
  };
  const collapseAll = () => {
    const next = {};
    Object.keys(CATEGORIES).forEach(k => next[k] = true);
    setCollapsedGroups(next);
    sessionStorage.setItem("collapsedGroups", JSON.stringify(next));
  };
  const expandAll = () => {
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
    // Fetch Yahoo data + CoinGecko crypto + BRAPI B3 in parallel
    const [result, cryptoData, b3Data] = await Promise.all([
      fetchMarketData(prevDataRef.current),
      fetchCryptoData(),
      fetchB3Data(),
    ]);
    const merged = { ...(result.data || {}), ...cryptoData, ...b3Data };
    if (Object.keys(merged).length > 0) prevDataRef.current = merged;
    setMarketData(Object.keys(merged).length > 0 ? merged : null);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

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
    let cancelled = false;
    (async () => {
      const equitySyms = Object.keys(ASSETS).filter(s => isEquityCat(ASSETS[s].cat));
      const profiles = await fmpBatchProfile(equitySyms);
      if (profiles && !cancelled) setBatchProfiles(profiles);
    })();
    return () => { cancelled = true; };
  }, [!!marketData]);

  // Load BCB + AwesomeAPI macro data for Brasil group banner (once, after initial load)
  useEffect(() => {
    if (!marketData) return;
    let cancelled = false;
    (async () => {
      const [bcbData, fxData] = await Promise.all([bcbMacro(), awesomeFx()]);
      if (cancelled) return;
      const merged = { ...(bcbData || {}), ...(fxData || {}) };
      setBrasilMacro(Object.keys(merged).length > 0 ? merged : {});
    })();
    return () => { cancelled = true; };
  }, [!!marketData]);

  const toggleExchange = useCallback((exch) => {
    setActiveExchanges(prev => {
      const next = new Set(prev);
      next.has(exch) ? next.delete(exch) : next.add(exch);
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
    ? Object.keys(ASSETS).filter(s => marketData[s] && passes(s)).map(s => marketData[s].changePct)
    : [];
  const avgPct        = allPcts.length ? allPcts.reduce((a, b) => a + b, 0) / allPcts.length : 0;
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
    const pcts = syms.map(s => marketData?.[s]?.changePct ?? 0);
    return pcts.reduce((a, b) => a + b, 0) / pcts.length;
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

  return (
    <div
      data-theme={theme}
      style={{ minHeight: "100vh", background: "var(--c-bg-root)", color: "var(--c-text)", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        [data-theme="dark"] {
          --c-bg-root:      linear-gradient(180deg, #0a0a0f 0%, #0d0f18 100%);
          --c-surface:      rgba(255,255,255,0.02);
          --c-border:       rgba(255,255,255,0.06);
          --c-border-faint: rgba(255,255,255,0.04);
          --c-text:         rgba(255,255,255,0.95);
          --c-text-2:       rgba(255,255,255,0.35);
          --c-text-3:       rgba(255,255,255,0.2);
          --c-panel:        #0e1016;
          --c-overlay:      rgba(0,0,0,0.7);
        }
        [data-theme="light"] {
          --c-bg-root:      linear-gradient(180deg, #f2f4fb 0%, #e8eaf6 100%);
          --c-surface:      rgba(255,255,255,0.7);
          --c-border:       rgba(0,0,0,0.09);
          --c-border-faint: rgba(0,0,0,0.05);
          --c-text:         rgba(10,10,18,0.9);
          --c-text-2:       rgba(10,10,18,0.48);
          --c-text-3:       rgba(10,10,18,0.3);
          --c-panel:        #eef0f9;
          --c-overlay:      rgba(0,0,0,0.35);
        }

        @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanline    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes slideUp     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn      { from{opacity:0} to{opacity:1} }
        @keyframes slideInRight{ from{transform:translateX(100%)} to{transform:translateX(0)} }

        .scanline-overlay { position:fixed;top:0;left:0;right:0;height:60px;background:linear-gradient(180deg,transparent,rgba(0,230,118,0.015),transparent);animation:scanline 8s linear infinite;pointer-events:none;z-index:0; }
        .section-animate  { animation:slideUp 0.5s ease both; }
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

      {/* ── SLIDE-IN PANELS ── */}
      <HamburgerMenu
        open={menuOpen} onClose={() => setMenuOpen(false)}
        activeFilter={activeFilter} onFilterChange={setActiveFilter}
        activeExchanges={activeExchanges} onExchangeToggle={toggleExchange} onResetExchanges={resetExchanges}
        theme={theme} onThemeToggle={() => setTheme(t => t === "dark" ? "light" : "dark")}
        lastUpdate={lastUpdate} allExchanges={allExchanges}
        currentView={currentView} onNavigate={onNavigate}
      />
      {selectedAsset && marketData?.[selectedAsset] && (
        <DetailPanel symbol={selectedAsset} data={marketData[selectedAsset]} onClose={() => setSelectedAsset(null)} />
      )}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "0 20px 40px" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px", borderBottom: "1px solid var(--c-border)", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              title="Menu"
              style={{ background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6, cursor: "pointer", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4, transition: "border-color 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00E676"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border)"; }}
            >
              <div style={{ width: 18, height: 2, background: "var(--c-text-2)", borderRadius: 1 }} />
              <div style={{ width: 18, height: 2, background: "var(--c-text-2)", borderRadius: 1 }} />
              <div style={{ width: 13, height: 2, background: "var(--c-text-2)", borderRadius: 1 }} />
            </button>

            <div style={{ width: 6, height: 48, borderRadius: 3, background: "linear-gradient(180deg, #00E676, #00BCD4)" }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, color: "var(--c-text)" }}>Global Markets Terminal</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)", marginTop: 4, letterSpacing: "1.5px" }}>
                EQUITIES · CRYPTO · INDICES · FX · B3 — LIVE MARKET DATA
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00E676", animation: "pulse 2s ease-in-out infinite", boxShadow: "0 0 8px #00E67666" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#00E676", fontWeight: 600, letterSpacing: "1px" }}>LIVE</span>
              {lastUpdate && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
                  {lastUpdate.toLocaleTimeString("en-US", { hour12: false })}
                </span>
              )}
            </div>
            <button onClick={loadData}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "var(--c-text-2)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", letterSpacing: "0.5px", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.target.style.borderColor = "#00E676"; e.target.style.color = "#00E676"; }}
              onMouseLeave={(e) => { e.target.style.borderColor = "var(--c-border)"; e.target.style.color = "var(--c-text-2)"; }}>
              REFRESH
            </button>
          </div>
        </div>

        {/* ── CATALOG VIEW ── */}
        {currentView === "catalog" && catalogPage}

        {/* ── NEWS VIEW ── */}
        {currentView === "news" && newsPage}

        {/* ── HEATMAP VIEW ── (renders as fixed full-screen overlay) */}
        {currentView === "heatmap" && heatmapPage}

        {/* ── LOADING ── */}
        {currentView === "dashboard" && loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 0", gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00E676", animation: "pulse 1.2s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--c-text-2)" }}>Connecting to market feeds...</span>
          </div>
        )}

        {/* ── OUT OF AIR ── */}
        {currentView === "dashboard" && !loading && !marketData && (
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
        {currentView === "dashboard" && !loading && marketData && (
          <div className="fade-in">

            {/* Sentiment bar */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, padding: "14px 0", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sentimentColor, animation: "pulse 2.5s ease-in-out infinite", boxShadow: `0 0 8px ${sentimentColor}66` }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: sentimentColor, letterSpacing: "1px" }}>{sentiment}</span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--c-text-2)", display: "flex", gap: 14 }}>
                <span style={{ color: "#00E676" }}>▲ {rising} rising</span>
                <span style={{ color: "#FF5252" }}>▼ {falling} falling</span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: sentimentColor }}>
                AVG {avgPct >= 0 ? "+" : ""}{avgPct.toFixed(2)}%
              </div>
            </div>

            {/* Top movers */}
            <div style={{ padding: "14px 0", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 8 }}>TOP MOVERS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topMovers.map(([sym, d]) => {
                  const pos = d.changePct >= 0;
                  const col = pos ? "#00E676" : "#FF5252";
                  const dispSym = ASSETS[sym]?.display || sym;
                  return (
                    <div key={sym} onClick={() => setSelectedAsset(sym)}
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: col, background: col + "10", border: `1px solid ${col}30`, borderRadius: 20, padding: "4px 12px", whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.15s ease" }}>
                      {dispSym} {pos ? "+" : ""}{d.changePct.toFixed(2)}%
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── TOOLBAR ── */}
            <div style={{ padding: "12px 0", borderBottom: "1px solid var(--c-border)" }}>
              {/* Row 1: category filter + sort + view */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {filterButtons.map(btn => {
                    const active = activeFilter === btn.key;
                    return (
                      <button key={btn.key} onClick={() => setActiveFilter(btn.key)}
                        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: active ? "#00E676" : "var(--c-text-2)", background: active ? "rgba(0,230,118,0.08)" : "var(--c-surface)", border: `1px solid ${active ? "#00E67640" : "var(--c-border)"}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer", transition: "all 0.2s ease" }}>
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {[{ key: "default", label: "Default", accent: null }, { key: "gainers", label: "▲ Gainers", accent: "#00E676" }, { key: "losers", label: "▼ Losers", accent: "#FF5252" }].map(s => {
                    const active = sortMode === s.key;
                    const ac = s.accent;
                    return (
                      <button key={s.key} onClick={() => setSortMode(s.key)}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: active ? (ac || "var(--c-text)") : "var(--c-text-3)", background: active ? (ac ? ac + "14" : "var(--c-surface)") : "transparent", border: `1px solid ${active ? (ac ? ac + "44" : "var(--c-border)") : "var(--c-border)"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", transition: "all 0.2s ease", letterSpacing: "0.3px" }}>
                        {s.label}
                      </button>
                    );
                  })}
                  <div style={{ width: 1, height: 20, background: "var(--c-border)", margin: "0 2px" }} />
                  {[{ key: "cards", label: "⊞", title: "Card view" }, { key: "list", label: "☰", title: "List view" }].map(v => {
                    const active = viewMode === v.key;
                    return (
                      <button key={v.key} onClick={() => setViewMode(v.key)} title={v.title}
                        style={{ fontSize: 15, lineHeight: 1, color: active ? "#00E676" : "var(--c-text-3)", background: active ? "rgba(0,230,118,0.1)" : "transparent", border: `1px solid ${active ? "#00E67640" : "var(--c-border)"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", transition: "all 0.2s ease" }}>
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: exchange filter */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginRight: 2 }}>EXCHANGE:</span>
                {allExchanges.map(exch => {
                  const active = activeExchanges.has(exch);
                  const c = EXCHANGE_COLORS[exch] || "#9E9E9E";
                  return (
                    <button key={exch} onClick={() => toggleExchange(exch)}
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: active ? c : "var(--c-text-3)", background: active ? c + "18" : "transparent", border: `1px solid ${active ? c + "50" : "var(--c-border)"}`, borderRadius: 4, padding: "3px 9px", cursor: "pointer", letterSpacing: "0.5px", transition: "all 0.15s ease" }}>
                      {exch}
                    </button>
                  );
                })}
                {activeExchanges.size > 0 && (
                  <button onClick={resetExchanges}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#FF5252", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.5px", marginLeft: 2 }}>
                    ✕ CLEAR
                  </button>
                )}
              </div>
            </div>

            {/* ── GROUP SORT BAR + COLLAPSE / EXPAND ALL ── */}
            {!flatSymbols && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", userSelect: "none" }}>SORT BY</span>
                  {[
                    { key: "alpha",  label: "A\u2013Z",   defaultDir: "asc"  },
                    { key: "return", label: "RETURN", defaultDir: "desc" },
                  ].map(opt => {
                    const active = groupSort === opt.key;
                    const arrow = active ? (groupDir === "asc" ? " \u2191" : " \u2193") : "";
                    return (
                      <button key={opt.key}
                        onClick={() => {
                          if (active) {
                            setGroupDir(d => d === "asc" ? "desc" : "asc");
                          } else {
                            setGroupSort(opt.key);
                            setGroupDir(opt.defaultDir);
                          }
                        }}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                          color: active ? "#00E676" : "var(--c-text-3)",
                          background: active ? "rgba(0,230,118,0.10)" : "transparent",
                          border: `1px solid ${active ? "#00E67644" : "var(--c-border)"}`,
                          borderRadius: 14, padding: "4px 12px", cursor: "pointer",
                          letterSpacing: "0.3px", transition: "all 0.15s ease",
                        }}>
                        {opt.label}{arrow}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={collapseAll}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.5px", transition: "all 0.15s ease" }}>
                    ▲ Collapse all
                  </button>
                  <button onClick={expandAll}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.5px", transition: "all 0.15s ease" }}>
                    ▼ Expand all
                  </button>
                </div>
              </div>
            )}

            {/* ── CONTENT ── */}
            {flatSymbols ? (
              <div style={{ marginTop: 16 }}>
                {viewMode === "list" && <ListColumnHeader />}
                {viewMode === "cards" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {flatSymbols.map(sym => <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => setSelectedAsset(sym)} />)}
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                    {flatSymbols.map((sym, idx) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={idx + 1} onClick={() => setSelectedAsset(sym)} />)}
                  </div>
                )}
              </div>
            ) : allCollapsed ? (
              /* ── COLLAPSED CARD GRID MODE ── */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 8 }}>
                {sortedCats.map((catKey) => {
                  const cat = CATEGORIES[catKey];
                  const stats = getGroupStats(catKey);
                  if (stats.count === 0) return null;
                  const isOpen = expandedCards.has(catKey);
                  const pctColor = stats.avgPct > 0 ? "#00E676" : stats.avgPct < 0 ? "#FF5252" : "var(--c-text-3)";
                  const pctArrow = stats.avgPct > 0 ? "↑" : stats.avgPct < 0 ? "↓" : "";
                  const borderAccent = stats.avgPct >= 0 ? "#00E676" : "#FF5252";

                  // Gather symbols for expanded view
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
                  }

                  return (
                    <div
                      key={catKey}
                      className="section-animate"
                      style={{
                        gridColumn: isOpen ? "1 / -1" : undefined,
                        background: isOpen ? "rgba(0,200,255,0.03)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isOpen ? "#00BCD444" : "var(--c-border)"}`,
                        borderLeft: `3px solid ${isOpen ? "#00BCD4" : borderAccent}`,
                        borderRadius: 2,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                      onClick={() => !isOpen && toggleCard(catKey)}
                      onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; } }}
                      onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "var(--c-border)"; } }}
                    >
                      {/* Close button for expanded state */}
                      {isOpen && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCard(catKey); }}
                          style={{
                            position: "absolute", top: 10, right: 12,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 14, lineHeight: 1,
                            color: "var(--c-text-3)", background: "transparent",
                            border: "1px solid var(--c-border)", borderRadius: 4,
                            padding: "2px 8px", cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={e => { e.target.style.color = "#FF5252"; e.target.style.borderColor = "#FF5252"; }}
                          onMouseLeave={e => { e.target.style.color = "var(--c-text-3)"; e.target.style.borderColor = "var(--c-border)"; }}
                        >✕</button>
                      )}

                      {/* Card header / summary */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isOpen ? 14 : 10 }}>
                        <span style={{ fontSize: 16 }}>{cat.icon}</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.3px" }}>
                          {cat.label}
                        </span>
                      </div>

                      {/* Daily return */}
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: pctColor, marginBottom: 6 }}>
                        {pctArrow}{stats.avgPct >= 0 ? "+" : ""}{stats.avgPct.toFixed(2)}%
                      </div>

                      {/* Total value */}
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)", marginBottom: 4 }}>
                        {stats.totalMcap > 0 ? formatMarketCap(stats.totalMcap) : "—"}
                      </div>

                      {/* Stock count */}
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginBottom: isOpen ? 12 : 6 }}>
                        {stats.count} {stats.count === 1 ? "stock" : "stocks"}
                      </div>

                      {/* Expand hint when collapsed */}
                      {!isOpen && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px", opacity: 0.6 }}>
                          VIEW GROUP ›
                        </div>
                      )}

                      {/* Expanded content: full list view */}
                      {isOpen && symbols && (
                        <div style={{
                          borderTop: "1px solid var(--c-border)", paddingTop: 12,
                          overflow: "hidden",
                          maxHeight: 4000,
                          transition: "max-height 0.25s ease",
                        }}>
                          <MacroBanner macroData={macroData} catKey={catKey} />
                          {catKey === "brasil" && <BrasilMacroBanner brasilMacro={brasilMacro} />}
                          {catKey === "dividends" && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 10,
                              background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)",
                              borderRadius: 6, padding: "8px 14px", marginBottom: 10,
                            }}>
                              <SourceBadge source="fmp" />
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
                                Assets with dividend yield &gt; 3% (via FMP profile data)
                              </span>
                            </div>
                          )}
                          {viewMode === "list" && <ListColumnHeader />}
                          {viewMode === "cards" ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                              {symbols.map(sym => <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => setSelectedAsset(sym)} />)}
                            </div>
                          ) : (
                            <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                              {symbols.map((sym, i) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={i + 1} onClick={() => setSelectedAsset(sym)} />)}
                            </div>
                          )}
                        </div>
                      )}
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
                  const catPcts = symbols.map(s => marketData[s]?.changePct ?? 0);
                  const catAvg  = catPcts.length ? catPcts.reduce((a, b) => a + b, 0) / catPcts.length : 0;
                  const catColor = catAvg >= 0 ? "#00E676" : "#FF5252";

                  if (symbols.length === 0) return null;

                  return (
                    <div key={catKey} className="section-animate" style={{ marginBottom: 24, animationDelay: `${idx * 0.08}s` }}>
                      <div
                        onClick={() => toggleGroup(catKey)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: collapsedGroups[catKey] ? 0 : 10, padding: "6px 8px", borderRadius: 6, cursor: "pointer", userSelect: "none", minHeight: 44, transition: "background 0.15s ease" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "var(--c-text-3)", transition: "transform 0.2s ease", transform: collapsedGroups[catKey] ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
                          <span style={{ fontSize: 16 }}>{cat.icon}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.3px", color: "var(--c-text)" }}>{cat.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>({symbols.length})</span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: catColor }}>
                          {catAvg >= 0 ? "+" : ""}{catAvg.toFixed(2)}%
                        </div>
                      </div>
                      <div style={{ overflow: "hidden", maxHeight: collapsedGroups[catKey] ? 0 : 2000, opacity: collapsedGroups[catKey] ? 0 : 1, transition: "max-height 0.3s ease, opacity 0.2s ease" }}>
                        <MacroBanner macroData={macroData} catKey={catKey} />
                        {catKey === "brasil" && <BrasilMacroBanner brasilMacro={brasilMacro} />}
                        {/* Dividend yield info for dividends group */}
                        {catKey === "dividends" && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)",
                            borderRadius: 6, padding: "8px 14px", marginBottom: 10,
                          }}>
                            <SourceBadge source="fmp" />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
                              Assets with dividend yield &gt; 3% (via FMP profile data)
                            </span>
                          </div>
                        )}
                        {viewMode === "list" && <ListColumnHeader />}
                        {viewMode === "cards" ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                            {symbols.map(sym => <AssetCard key={sym} symbol={sym} data={marketData[sym]} onClick={() => setSelectedAsset(sym)} />)}
                          </div>
                        ) : (
                          <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                            {symbols.map((sym, i) => <AssetRow key={sym} symbol={sym} data={marketData[sym]} rank={i + 1} onClick={() => setSelectedAsset(sym)} />)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 14, marginTop: 10, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>MULTI-SOURCE: YAHOO · FINNHUB · FRED · FMP · COINGECKO · BRAPI · BCB · AWESOMEAPI</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>{Object.keys(ASSETS).length} ASSETS · {Object.keys(CATEGORIES).length} GROUPS · 9 SOURCES</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
