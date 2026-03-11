import React, { useState, useMemo, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import MarketHeatmap from "./components/MarketHeatmap";
import { finnhubQuote, hasFinnhubKey } from "./dataServices.js";

/* ─────────────────────────────────────────────────────────────────────────────
 * MarketHeatmapPage — Interactive wrapper around MarketHeatmap
 *
 * Renders as a fixed full-screen overlay (z-index 50) so it sits cleanly
 * on top of GlobalMarketsTerminal's scrollable layout.  The hamburger menu
 * (z-index 200+) still appears above this page.
 *
 * Props:
 *   onNavigate — (view: string) => void  passed from App.jsx / GlobalMarketsTerminal
 * ───────────────────────────────────────────────────────────────────────────── */

// ─── Color Palette (mirrors MarketHeatmap's theme) ───────────────────────────
const C = {
  bg:            "#040810",
  surface:       "#0A1020",
  surfaceHover:  "#101830",
  border:        "#1A2744",
  accent:        "#00C8FF",
  textPrimary:   "#E8ECF2",
  textSecondary: "#8899AA",
  textMuted:     "#556677",
  green:         "#00FF9D",
  greenDark:     "#009950",
  red:           "#FF2D55",
  redDark:       "#991833",
  neutral:       "#334455",
};

// ─── Base Dataset (mirrors MarketHeatmap MOCK_DATA + marketCap field) ─────────
const BASE_STOCKS = [
  // Technology
  { symbol: "AAPL",  name: "Apple Inc.",           sector: "Technology",     price: 227.48, change:   3.41, changePercent:  1.52, volume:  58_230_000, marketCap: 3_400_000_000_000 },
  { symbol: "MSFT",  name: "Microsoft Corp.",       sector: "Technology",     price: 442.15, change:  -2.87, changePercent: -0.65, volume:  22_140_000, marketCap: 3_300_000_000_000 },
  { symbol: "NVDA",  name: "NVIDIA Corp.",          sector: "Technology",     price: 138.72, change:   5.93, changePercent:  4.47, volume: 312_500_000, marketCap: 3_400_000_000_000 },
  { symbol: "GOOGL", name: "Alphabet Inc.",         sector: "Technology",     price: 176.34, change:   1.22, changePercent:  0.70, volume:  24_800_000, marketCap: 2_200_000_000_000 },
  { symbol: "META",  name: "Meta Platforms",        sector: "Technology",     price: 612.50, change:  -8.15, changePercent: -1.31, volume:  17_600_000, marketCap: 1_570_000_000_000 },
  { symbol: "AVGO",  name: "Broadcom Inc.",         sector: "Technology",     price: 228.30, change:   4.10, changePercent:  1.83, volume:  32_100_000, marketCap: 1_050_000_000_000 },
  { symbol: "CRM",   name: "Salesforce Inc.",       sector: "Technology",     price: 272.88, change:  -1.05, changePercent: -0.38, volume:   6_430_000, marketCap:   265_000_000_000 },
  { symbol: "ORCL",  name: "Oracle Corp.",          sector: "Technology",     price: 178.45, change:   2.30, changePercent:  1.31, volume:   9_870_000, marketCap:   490_000_000_000 },
  // Healthcare
  { symbol: "UNH",   name: "UnitedHealth Group",   sector: "Healthcare",     price: 502.90, change:  -4.20, changePercent: -0.83, volume:   4_120_000, marketCap:   465_000_000_000 },
  { symbol: "JNJ",   name: "Johnson & Johnson",    sector: "Healthcare",     price: 156.72, change:   0.88, changePercent:  0.56, volume:   7_340_000, marketCap:   403_000_000_000 },
  { symbol: "LLY",   name: "Eli Lilly & Co.",      sector: "Healthcare",     price: 832.15, change:  12.40, changePercent:  1.51, volume:   3_920_000, marketCap:   790_000_000_000 },
  { symbol: "PFE",   name: "Pfizer Inc.",           sector: "Healthcare",     price:  26.34, change:  -0.42, changePercent: -1.57, volume:  31_200_000, marketCap:   148_000_000_000 },
  { symbol: "ABBV",  name: "AbbVie Inc.",           sector: "Healthcare",     price: 188.55, change:   1.15, changePercent:  0.61, volume:   5_600_000, marketCap:   333_000_000_000 },
  // Financials
  { symbol: "JPM",   name: "JPMorgan Chase",       sector: "Financials",     price: 248.30, change:   3.15, changePercent:  1.28, volume:   9_800_000, marketCap:   723_000_000_000 },
  { symbol: "V",     name: "Visa Inc.",             sector: "Financials",     price: 305.22, change:  -0.78, changePercent: -0.26, volume:   6_100_000, marketCap:   645_000_000_000 },
  { symbol: "BAC",   name: "Bank of America",      sector: "Financials",     price:  43.88, change:   0.52, changePercent:  1.20, volume:  35_400_000, marketCap:   347_000_000_000 },
  { symbol: "GS",    name: "Goldman Sachs",         sector: "Financials",     price: 578.40, change:   7.20, changePercent:  1.26, volume:   2_300_000, marketCap:   196_000_000_000 },
  { symbol: "MA",    name: "Mastercard Inc.",       sector: "Financials",     price: 518.66, change:  -2.30, changePercent: -0.44, volume:   3_100_000, marketCap:   493_000_000_000 },
  // Energy
  { symbol: "XOM",   name: "Exxon Mobil",          sector: "Energy",         price: 108.55, change:  -1.92, changePercent: -1.74, volume:  15_800_000, marketCap:   466_000_000_000 },
  { symbol: "CVX",   name: "Chevron Corp.",         sector: "Energy",         price: 152.30, change:  -2.45, changePercent: -1.58, volume:   8_200_000, marketCap:   292_000_000_000 },
  { symbol: "COP",   name: "ConocoPhillips",        sector: "Energy",         price: 103.15, change:  -1.88, changePercent: -1.79, volume:   6_700_000, marketCap:   131_000_000_000 },
  { symbol: "SLB",   name: "Schlumberger Ltd.",     sector: "Energy",         price:  42.78, change:  -0.95, changePercent: -2.17, volume:  12_100_000, marketCap:    61_000_000_000 },
  // Consumer
  { symbol: "AMZN",  name: "Amazon.com Inc.",       sector: "Consumer",       price: 205.74, change:   2.88, changePercent:  1.42, volume:  48_300_000, marketCap: 2_200_000_000_000 },
  { symbol: "TSLA",  name: "Tesla Inc.",            sector: "Consumer",       price: 248.50, change:  -6.30, changePercent: -2.47, volume:  98_700_000, marketCap:   798_000_000_000 },
  { symbol: "WMT",   name: "Walmart Inc.",          sector: "Consumer",       price:  92.40, change:   0.65, changePercent:  0.71, volume:   8_500_000, marketCap:   745_000_000_000 },
  { symbol: "HD",    name: "Home Depot",            sector: "Consumer",       price: 388.22, change:  -3.10, changePercent: -0.79, volume:   4_200_000, marketCap:   387_000_000_000 },
  { symbol: "COST",  name: "Costco Wholesale",      sector: "Consumer",       price: 922.18, change:   5.40, changePercent:  0.59, volume:   2_100_000, marketCap:   409_000_000_000 },
  // Industrials
  { symbol: "CAT",   name: "Caterpillar Inc.",      sector: "Industrials",    price: 358.44, change:   4.60, changePercent:  1.30, volume:   3_400_000, marketCap:   190_000_000_000 },
  { symbol: "BA",    name: "Boeing Co.",            sector: "Industrials",    price: 178.30, change:  -3.50, changePercent: -1.93, volume:   7_800_000, marketCap:   116_000_000_000 },
  { symbol: "UPS",   name: "United Parcel Service", sector: "Industrials",    price: 128.90, change:   1.10, changePercent:  0.86, volume:   4_100_000, marketCap:   111_000_000_000 },
  { symbol: "GE",    name: "GE Aerospace",          sector: "Industrials",    price: 192.55, change:   2.80, changePercent:  1.47, volume:   5_900_000, marketCap:   211_000_000_000 },
  // Communications
  { symbol: "DIS",   name: "Walt Disney Co.",       sector: "Communications", price: 112.34, change:   1.45, changePercent:  1.31, volume:   9_200_000, marketCap:   205_000_000_000 },
  { symbol: "NFLX",  name: "Netflix Inc.",          sector: "Communications", price: 908.72, change:  11.30, changePercent:  1.26, volume:   4_300_000, marketCap:   393_000_000_000 },
  { symbol: "CMCSA", name: "Comcast Corp.",         sector: "Communications", price:  38.22, change:  -0.28, changePercent: -0.73, volume:  18_500_000, marketCap:   165_000_000_000 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtLarge(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

function fmtPrice(p) {
  if (!p && p !== 0) return "—";
  return "$" + Number(p).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(p) {
  if (p === undefined || p === null) return "—";
  return (p >= 0 ? "+" : "") + Number(p).toFixed(2) + "%";
}

function changeColor(pct) {
  if (!pct || pct === 0) return C.neutral;
  return pct > 0 ? C.green : C.red;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const slideInRight = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

const slideInUp = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

/* Full-screen fixed root — sits above GlobalMarketsTerminal (z:1) but
   below the hamburger menu panel (z:200). Users can still open the menu
   to navigate away. */
const PageRoot = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: hidden;
  background: ${C.bg};
  font-family: "IBM Plex Mono", monospace;
`;

/* ── Floating overlay layer (events pass through to children) ── */
const FloatLayer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;

  & > * {
    pointer-events: all;
  }
`;

/* ── Back button ── */
const BackBtn = styled.button`
  position: absolute;
  top: 12px;
  left: 248px; /* just after the heatmap's 240px sector sidebar */
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 5px;
  color: ${C.textSecondary};
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${C.accent};
    color: ${C.accent};
  }
`;

/* ── Controls toggle ── */
const CtrlToggle = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => (p.$open ? C.accent + "22" : C.surface)};
  border: 1px solid ${(p) => (p.$open ? C.accent + "88" : C.border)};
  border-radius: 6px;
  color: ${(p) => (p.$open ? C.accent : C.textSecondary)};
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 10;

  &:hover {
    border-color: ${C.accent}88;
    color: ${C.accent};
  }
`;

/* ── Controls panel ── */
const CtrlPanel = styled.div`
  position: absolute;
  top: 52px;
  right: 10px;
  width: 272px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 8px;
  padding: 0 0 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
  animation: ${slideInRight} 0.2s ease-out;

  &::-webkit-scrollbar       { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
`;

const PanelHeader = styled.div`
  padding: 12px 14px;
  border-bottom: 1px solid ${C.border};
  font-family: "Barlow Condensed", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: ${C.accent};
  text-transform: uppercase;
`;

const PanelSection = styled.div`
  padding: 10px 14px 0;
`;

const Label = styled.div`
  font-size: 10px;
  color: ${C.textMuted};
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 7px 10px;
  background: ${C.bg};
  border: 1px solid ${C.border};
  border-radius: 4px;
  color: ${C.textPrimary};
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;

  &::placeholder { color: ${C.textMuted}; }
  &:focus { border-color: ${C.accent}66; }
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const ToggleBtn = styled.button`
  padding: 4px 10px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  background: ${(p) => (p.$active ? C.accent + "22" : "transparent")};
  color: ${(p) => (p.$active ? C.accent : C.textSecondary)};
  border: 1px solid ${(p) => (p.$active ? C.accent + "66" : C.border)};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: ${C.accent};
    border-color: ${C.accent}44;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${C.border};
  margin: 12px 0 0;
`;

const DataRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const DataBadge = styled.span`
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: ${(p) =>
    p.$status === "live"    ? C.green + "22" :
    p.$status === "partial" ? "#FF9100" + "22" :
    p.$status === "loading" ? C.accent + "22" :
    C.neutral + "44"};
  color: ${(p) =>
    p.$status === "live"    ? C.green :
    p.$status === "partial" ? "#FF9100" :
    p.$status === "loading" ? C.accent :
    C.textMuted};
  border: 1px solid ${(p) =>
    p.$status === "live"    ? C.green + "44" :
    p.$status === "partial" ? "#FF9100" + "44" :
    p.$status === "loading" ? C.accent + "44" :
    C.border};
`;

const RefreshBtn = styled.button`
  padding: 3px 10px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 10px;
  background: transparent;
  border: 1px solid ${C.border};
  border-radius: 4px;
  color: ${C.textSecondary};
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover:not(:disabled) { border-color: ${C.accent}66; color: ${C.accent}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SubLabel = styled.div`
  font-size: 10px;
  color: ${C.textMuted};
  margin-top: 4px;
`;

/* ── Stats bar (bottom strip) ── */
const StatsBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 0;
  background: ${C.surface}EE;
  border-top: 1px solid ${C.border};
  backdrop-filter: blur(8px);
  padding: 0 16px;
  gap: 24px;
  animation: ${slideInUp} 0.3s ease-out;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const StatLabel = styled.span`
  font-size: 10px;
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatVal = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.$c || C.textPrimary};
`;

/* Legend */
const LegendWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
`;

const LegendGradient = styled.div`
  width: 80px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #991833, #FF2D55, #334455, #009950, #00FF9D
  );
`;

const LegendLbl = styled.span`
  font-size: 10px;
  color: ${C.textMuted};
`;

/* ── Detail panel ── */
const DetailPanel = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 38px;
  width: 300px;
  background: ${C.surface};
  border-left: 1px solid ${C.border};
  overflow-y: auto;
  animation: ${slideInRight} 0.2s ease-out;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar       { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
`;

const DetailSymbol = styled.div`
  font-family: "Barlow Condensed", sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${C.textPrimary};
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  color: ${C.textMuted};
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: color 0.15s ease;
  &:hover { color: ${C.textPrimary}; }
`;

const DetailBody = styled.div`
  padding: 14px 16px;
  flex: 1;
`;

const DetailName = styled.div`
  font-size: 12px;
  color: ${C.textSecondary};
  margin-bottom: 14px;
  line-height: 1.4;
`;

const DetailTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid ${C.border}66;

  &:last-child { border-bottom: none; }
`;

const DKey = styled.span`
  font-size: 11px;
  color: ${C.textMuted};
`;

const DVal = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.$c || C.textPrimary};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid ${C.border};
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  flex: 1;
  padding: 7px 0;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: ${(p) => (p.$primary ? C.accent + "22" : "transparent")};
  color: ${(p) => (p.$primary ? C.accent : C.textSecondary)};
  border: 1px solid ${(p) => (p.$primary ? C.accent + "66" : C.border)};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${(p) => (p.$primary ? C.accent : C.accent + "44")};
    color: ${C.accent};
  }
`;

/* ── Compare bar ── */
const CompareBar = styled.div`
  position: absolute;
  bottom: 38px;
  left: 240px;
  right: ${(p) => (p.$detailOpen ? "300px" : "0")};
  background: ${C.surface}EE;
  border-top: 1px solid ${C.border};
  border-left: 1px solid ${C.border};
  backdrop-filter: blur(8px);
  padding: 10px 16px;
  animation: ${slideInUp} 0.2s ease-out;
`;

const CompareTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 10px;
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ClearBtn = styled.button`
  background: transparent;
  border: none;
  color: ${C.textMuted};
  font-size: 10px;
  cursor: pointer;
  font-family: "IBM Plex Mono", monospace;
  letter-spacing: 0.5px;
  &:hover { color: ${C.red}; }
`;

const CompareGrid = styled.div`
  display: flex;
  gap: 8px;
`;

const CompareCard = styled.div`
  position: relative;
  padding: 8px 28px 8px 10px;
  background: ${C.bg};
  border: 1px solid ${C.border};
  border-radius: 5px;
  min-width: 100px;
`;

const CCSym = styled.div`
  font-family: "Barlow Condensed", sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: ${C.textPrimary};
`;

const CCPct = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.$c};
`;

const CCPrice = styled.div`
  font-size: 10px;
  color: ${C.textMuted};
  margin-top: 2px;
`;

const CCRemove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: ${C.textMuted};
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  &:hover { color: ${C.red}; }
`;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketHeatmapPage({ onNavigate }) {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [stocks, setStocks]           = useState(BASE_STOCKS);
  const [dataStatus, setDataStatus]   = useState("mock");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Control state ───────────────────────────────────────────────────────────
  const [sizeMetric,    setSizeMetric]    = useState("volume");   // "volume" | "marketCap"
  const [search,        setSearch]        = useState("");
  const [topN,          setTopN]          = useState(null);        // null | 5 | 10 | 20
  const [topDir,        setTopDir]        = useState("gainers");  // "gainers" | "losers"
  const [ctrlOpen,      setCtrlOpen]      = useState(false);

  // ── Detail / compare state ──────────────────────────────────────────────────
  const [selectedStock, setSelectedStock] = useState(null);
  const [pinnedStocks,  setPinnedStocks]  = useState([]);

  // ── Derived heatmap data ─────────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    let data = [...stocks];

    // 1. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    // 2. Top-N gainers or losers
    if (topN) {
      const sorted = [...data].sort((a, b) =>
        topDir === "gainers"
          ? b.changePercent - a.changePercent
          : a.changePercent - b.changePercent
      );
      data = sorted.slice(0, topN);
    }

    // 3. Size metric: replace volume with marketCap so treemap sizes cells by mktcap
    if (sizeMetric === "marketCap") {
      data = data.map((s) => {
        const base = BASE_STOCKS.find((b) => b.symbol === s.symbol);
        return { ...s, volume: base?.marketCap || s.volume };
      });
    }

    return data;
  }, [stocks, search, topN, topDir, sizeMetric]);

  // ── Summary statistics ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const n = heatmapData.length;
    if (!n) return { total: 0, gainers: 0, losers: 0, avgChange: 0, totalMCap: 0 };
    const gainers   = heatmapData.filter((s) => s.changePercent > 0).length;
    const losers    = heatmapData.filter((s) => s.changePercent < 0).length;
    const avgChange = heatmapData.reduce((sum, s) => sum + s.changePercent, 0) / n;
    // Always use BASE_STOCKS for marketCap (even when sizeMetric = marketCap remap)
    const totalMCap = BASE_STOCKS
      .filter((b) => heatmapData.some((h) => h.symbol === b.symbol))
      .reduce((sum, b) => sum + (b.marketCap || 0), 0);
    return { total: n, gainers, losers, avgChange, totalMCap };
  }, [heatmapData]);

  // ── Callbacks ────────────────────────────────────────────────────────────────
  const handleStockClick = useCallback((stock) => {
    setSelectedStock(stock);
  }, []);

  const handlePin = useCallback((stock) => {
    setPinnedStocks((prev) => {
      const already = prev.some((s) => s.symbol === stock.symbol);
      if (already) return prev.filter((s) => s.symbol !== stock.symbol);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, stock];
    });
  }, []);

  const handleUnpin = useCallback((symbol) => {
    setPinnedStocks((prev) => prev.filter((s) => s.symbol !== symbol));
  }, []);

  // ── Live data refresh via Finnhub ─────────────────────────────────────────
  const loadLiveData = useCallback(async () => {
    setDataStatus("loading");
    const symbols = BASE_STOCKS.map((s) => s.symbol);

    // Fire all requests; the Finnhub rate-limit queue in dataServices.js
    // processes them at ≤1/sec, so expect ~36 seconds for the full batch.
    const results = await Promise.allSettled(symbols.map((sym) => finnhubQuote(sym)));

    const updated = BASE_STOCKS.map((stock, i) => {
      const r = results[i];
      if (r.status === "fulfilled" && r.value?.c) {
        return {
          ...stock,
          price:         r.value.c,
          change:        r.value.d  ?? stock.change,
          changePercent: r.value.dp ?? stock.changePercent,
        };
      }
      return stock;
    });

    const liveCount = results.filter((r) => r.value?.c).length;
    setStocks(updated);
    setDataStatus(
      liveCount === 0               ? "mock"    :
      liveCount < symbols.length    ? "partial" : "live"
    );
    setLastUpdated(new Date());
  }, []);

  // ── Look up base stock (has marketCap) for detail panel ──────────────────
  const selectedBase = selectedStock
    ? BASE_STOCKS.find((b) => b.symbol === selectedStock.symbol)
    : null;

  const isPinned = selectedStock
    ? pinnedStocks.some((s) => s.symbol === selectedStock.symbol)
    : false;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageRoot>
      {/* MarketHeatmap fills the full fixed root. It renders its own Sector
          sidebar (240px) + Toolbar + Treemap. We layer our controls on top. */}
      <MarketHeatmap
        data={heatmapData}
        dataSource="generic"
        onStockClick={handleStockClick}
      />

      {/* ── Floating overlay ────────────────────────────────────────────── */}
      <FloatLayer>

        {/* Back button — positioned just right of the heatmap's sector sidebar */}
        {onNavigate && (
          <BackBtn onClick={() => onNavigate("dashboard")}>
            ← Dashboard
          </BackBtn>
        )}

        {/* Controls toggle button — top-right corner */}
        <CtrlToggle $open={ctrlOpen} onClick={() => setCtrlOpen((o) => !o)}>
          {ctrlOpen ? "✕" : "⚙"}
        </CtrlToggle>

        {/* ── Controls panel ────────────────────────────────────────────── */}
        {ctrlOpen && (
          <CtrlPanel>
            <PanelHeader>Controls</PanelHeader>

            {/* Search */}
            <PanelSection>
              <Label>Search ticker or name</Label>
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. AAPL, Apple..."
                autoFocus
              />
            </PanelSection>

            <Divider />

            {/* Cell size metric */}
            <PanelSection>
              <Label>Cell size driven by</Label>
              <BtnGroup>
                {[
                  { key: "volume",    label: "Volume" },
                  { key: "marketCap", label: "Mkt Cap" },
                ].map(({ key, label }) => (
                  <ToggleBtn
                    key={key}
                    $active={sizeMetric === key}
                    onClick={() => setSizeMetric(key)}
                  >
                    {label}
                  </ToggleBtn>
                ))}
              </BtnGroup>
            </PanelSection>

            <Divider />

            {/* Top-N highlight */}
            <PanelSection>
              <Label>Highlight top performers</Label>
              <BtnGroup>
                <ToggleBtn $active={!topN} onClick={() => setTopN(null)}>All</ToggleBtn>
                {[5, 10, 20].map((n) => (
                  <ToggleBtn
                    key={n}
                    $active={topN === n}
                    onClick={() => setTopN(n)}
                  >
                    Top {n}
                  </ToggleBtn>
                ))}
              </BtnGroup>

              {topN && (
                <BtnGroup style={{ marginTop: 6 }}>
                  <ToggleBtn
                    $active={topDir === "gainers"}
                    onClick={() => setTopDir("gainers")}
                  >
                    Gainers
                  </ToggleBtn>
                  <ToggleBtn
                    $active={topDir === "losers"}
                    onClick={() => setTopDir("losers")}
                  >
                    Losers
                  </ToggleBtn>
                </BtnGroup>
              )}
            </PanelSection>

            <Divider />

            {/* Live data */}
            <PanelSection>
              <Label>Data source</Label>
              <DataRow>
                <DataBadge $status={dataStatus}>
                  {dataStatus === "loading" ? "Loading…" :
                   dataStatus === "live"    ? "LIVE"     :
                   dataStatus === "partial" ? "PARTIAL"  : "MOCK"}
                </DataBadge>
                {hasFinnhubKey() && (
                  <RefreshBtn
                    onClick={loadLiveData}
                    disabled={dataStatus === "loading"}
                  >
                    Refresh
                  </RefreshBtn>
                )}
              </DataRow>
              {lastUpdated && (
                <SubLabel>Updated {lastUpdated.toLocaleTimeString()}</SubLabel>
              )}
              {!hasFinnhubKey() && (
                <SubLabel>Set VITE_FINNHUB_KEY for live data</SubLabel>
              )}
              {dataStatus === "loading" && (
                <SubLabel>Fetching ~36 quotes (rate-limited, ~36s)…</SubLabel>
              )}
            </PanelSection>
          </CtrlPanel>
        )}

        {/* ── Stats bar (bottom of screen) ──────────────────────────────── */}
        <StatsBar>
          <StatItem>
            <StatLabel>Assets</StatLabel>
            <StatVal>{stats.total}</StatVal>
          </StatItem>
          <StatItem>
            <StatLabel>Gainers</StatLabel>
            <StatVal $c={C.green}>▲ {stats.gainers}</StatVal>
          </StatItem>
          <StatItem>
            <StatLabel>Losers</StatLabel>
            <StatVal $c={C.red}>▼ {stats.losers}</StatVal>
          </StatItem>
          <StatItem>
            <StatLabel>Avg Δ</StatLabel>
            <StatVal $c={changeColor(stats.avgChange)}>
              {fmtPct(stats.avgChange)}
            </StatVal>
          </StatItem>
          <StatItem>
            <StatLabel>Total Mkt Cap</StatLabel>
            <StatVal>{fmtLarge(stats.totalMCap)}</StatVal>
          </StatItem>

          <LegendWrap>
            <LegendLbl>−5%</LegendLbl>
            <LegendGradient title="Color = 1-day % change (±5% scale)" />
            <LegendLbl>+5%</LegendLbl>
            <LegendLbl style={{ marginLeft: 8, fontSize: 9 }}>
              SIZE = {sizeMetric === "marketCap" ? "Market Cap" : "Volume"}
            </LegendLbl>
          </LegendWrap>
        </StatsBar>

        {/* ── Compare bar (above stats bar, shows pinned stocks) ─────────── */}
        {pinnedStocks.length > 0 && (
          <CompareBar $detailOpen={!!selectedStock}>
            <CompareTitle>
              <span>Compare ({pinnedStocks.length}/3)</span>
              <ClearBtn onClick={() => setPinnedStocks([])}>Clear all</ClearBtn>
            </CompareTitle>
            <CompareGrid>
              {pinnedStocks.map((s) => (
                <CompareCard key={s.symbol}>
                  <CCSym>{s.symbol}</CCSym>
                  <CCPct $c={changeColor(s.changePercent)}>
                    {fmtPct(s.changePercent)}
                  </CCPct>
                  <CCPrice>{fmtPrice(s.price)}</CCPrice>
                  <CCRemove onClick={() => handleUnpin(s.symbol)}>✕</CCRemove>
                </CompareCard>
              ))}
            </CompareGrid>
          </CompareBar>
        )}

        {/* ── Detail panel (right side, slides in on cell click) ─────────── */}
        {selectedStock && (
          <DetailPanel>
            <DetailHeader>
              <DetailSymbol>{selectedStock.symbol}</DetailSymbol>
              <CloseBtn onClick={() => setSelectedStock(null)}>✕</CloseBtn>
            </DetailHeader>

            <DetailBody>
              <DetailName>{selectedStock.name}</DetailName>

              <DetailTable>
                <DRow>
                  <DKey>Sector</DKey>
                  <DVal>{selectedStock.sector}</DVal>
                </DRow>
                <DRow>
                  <DKey>Price</DKey>
                  <DVal>{fmtPrice(selectedStock.price)}</DVal>
                </DRow>
                <DRow>
                  <DKey>Change ($)</DKey>
                  <DVal $c={changeColor(selectedStock.changePercent)}>
                    {selectedStock.change >= 0 ? "+" : ""}
                    {fmtPrice(selectedStock.change)}
                  </DVal>
                </DRow>
                <DRow>
                  <DKey>Change (%)</DKey>
                  <DVal $c={changeColor(selectedStock.changePercent)}>
                    {fmtPct(selectedStock.changePercent)}
                  </DVal>
                </DRow>
                <DRow>
                  <DKey>Volume</DKey>
                  <DVal>{fmtLarge(selectedStock.volume)}</DVal>
                </DRow>
                {selectedBase?.marketCap && (
                  <DRow>
                    <DKey>Market Cap</DKey>
                    <DVal>{fmtLarge(selectedBase.marketCap)}</DVal>
                  </DRow>
                )}
                {dataStatus !== "mock" && lastUpdated && (
                  <DRow>
                    <DKey>Updated</DKey>
                    <DVal style={{ fontSize: 10 }}>
                      {lastUpdated.toLocaleTimeString()}
                    </DVal>
                  </DRow>
                )}
              </DetailTable>
            </DetailBody>

            <ActionRow>
              <ActionBtn
                $primary={!isPinned}
                onClick={() => handlePin(selectedStock)}
                disabled={!isPinned && pinnedStocks.length >= 3}
                title={!isPinned && pinnedStocks.length >= 3 ? "Max 3 pinned" : ""}
              >
                {isPinned ? "Unpin" : "Compare"}
              </ActionBtn>
              <ActionBtn onClick={() => setSelectedStock(null)}>
                Close
              </ActionBtn>
            </ActionRow>
          </DetailPanel>
        )}
      </FloatLayer>
    </PageRoot>
  );
}
