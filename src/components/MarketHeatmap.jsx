import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";

/* ─────────────────────────────────────────────────────────────────────────────
 * MarketHeatmap — Full-page treemap visualization
 *
 * Props:
 *   data        — Array of stock objects (uses mock data if omitted)
 *   dataSource  — "polygon" | "alphaVantage" | "finnhub" | "generic" (default)
 *   onStockClick — (stock) => void  callback when a cell is clicked
 *
 * Usage:
 *   import MarketHeatmap from "./components/MarketHeatmap";
 *
 *   // With default mock data
 *   <MarketHeatmap />
 *
 *   // With live data + click handler
 *   <MarketHeatmap
 *     data={stockArray}
 *     dataSource="finnhub"
 *     onStockClick={(stock) => console.log(stock)}
 *   />
 * ───────────────────────────────────────────────────────────────────────────── */

// ─── Theme Constants ─────────────────────────────────────────────────────────
const COLORS = {
  bg: "#040810",
  surface: "#0A1020",
  surfaceHover: "#101830",
  border: "#1A2744",
  accent: "#00C8FF",
  textPrimary: "#E8ECF2",
  textSecondary: "#8899AA",
  textMuted: "#556677",
  greenBright: "#00FF9D",
  greenDark: "#009950",
  redBright: "#FF2D55",
  redDark: "#991833",
  neutral: "#334455",
};

// ─── Google Fonts ────────────────────────────────────────────────────────────
const FONT_LINK_ID = "heatmap-google-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap";
  document.head.appendChild(link);
}

// ─── Data Adapter ────────────────────────────────────────────────────────────

/**
 * Normalizes a raw stock object from various sources into a common shape.
 *   { symbol, name, sector, price, change, changePercent, volume }
 */
export function normalizeStock(raw, source = "generic") {
  switch (source) {
    case "polygon":
      return {
        symbol: raw.ticker || raw.T || "",
        name: raw.name || raw.ticker || raw.T || "",
        sector: raw.sector || "Other",
        price: raw.close ?? raw.c ?? raw.lastTrade?.p ?? 0,
        change: raw.todaysChange ?? raw.change ?? 0,
        changePercent: raw.todaysChangePerc ?? raw.changePercent ?? 0,
        volume: raw.volume ?? raw.v ?? raw.day?.v ?? 0,
      };
    case "alphaVantage":
      return {
        symbol: raw["01. symbol"] || raw.symbol || "",
        name: raw.name || raw["01. symbol"] || raw.symbol || "",
        sector: raw.sector || "Other",
        price: parseFloat(raw["05. price"] || raw.price || 0),
        change: parseFloat(raw["09. change"] || raw.change || 0),
        changePercent: parseFloat(
          (raw["10. change percent"] || raw.changePercent || "0").replace(
            "%",
            ""
          )
        ),
        volume: parseInt(raw["06. volume"] || raw.volume || 0, 10),
      };
    case "finnhub":
      return {
        symbol: raw.symbol || raw.s || "",
        name: raw.name || raw.description || raw.symbol || "",
        sector: raw.sector || raw.finnhubIndustry || "Other",
        price: raw.c ?? raw.price ?? 0,
        change: raw.d ?? raw.change ?? 0,
        changePercent: raw.dp ?? raw.changePercent ?? 0,
        volume: raw.v ?? raw.volume ?? 0,
      };
    default:
      return {
        symbol: raw.symbol || raw.ticker || "",
        name: raw.name || raw.companyName || raw.symbol || "",
        sector: raw.sector || raw.industry || "Other",
        price: raw.price ?? raw.close ?? raw.c ?? 0,
        change: raw.change ?? raw.d ?? 0,
        changePercent: raw.changePercent ?? raw.dp ?? raw.changesPercentage ?? 0,
        volume: raw.volume ?? raw.v ?? 0,
      };
  }
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_DATA = [
  // Technology
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 227.48, change: 3.41, changePercent: 1.52, volume: 58_230_000 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 442.15, change: -2.87, changePercent: -0.65, volume: 22_140_000 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 138.72, change: 5.93, changePercent: 4.47, volume: 312_500_000 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", price: 176.34, change: 1.22, changePercent: 0.70, volume: 24_800_000 },
  { symbol: "META", name: "Meta Platforms", sector: "Technology", price: 612.50, change: -8.15, changePercent: -1.31, volume: 17_600_000 },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology", price: 228.30, change: 4.10, changePercent: 1.83, volume: 32_100_000 },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology", price: 272.88, change: -1.05, changePercent: -0.38, volume: 6_430_000 },
  { symbol: "ORCL", name: "Oracle Corp.", sector: "Technology", price: 178.45, change: 2.30, changePercent: 1.31, volume: 9_870_000 },
  // Healthcare
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", price: 502.90, change: -4.20, changePercent: -0.83, volume: 4_120_000 },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", price: 156.72, change: 0.88, changePercent: 0.56, volume: 7_340_000 },
  { symbol: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare", price: 832.15, change: 12.40, changePercent: 1.51, volume: 3_920_000 },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", price: 26.34, change: -0.42, changePercent: -1.57, volume: 31_200_000 },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare", price: 188.55, change: 1.15, changePercent: 0.61, volume: 5_600_000 },
  // Financials
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", price: 248.30, change: 3.15, changePercent: 1.28, volume: 9_800_000 },
  { symbol: "V", name: "Visa Inc.", sector: "Financials", price: 305.22, change: -0.78, changePercent: -0.26, volume: 6_100_000 },
  { symbol: "BAC", name: "Bank of America", sector: "Financials", price: 43.88, change: 0.52, changePercent: 1.20, volume: 35_400_000 },
  { symbol: "GS", name: "Goldman Sachs", sector: "Financials", price: 578.40, change: 7.20, changePercent: 1.26, volume: 2_300_000 },
  { symbol: "MA", name: "Mastercard Inc.", sector: "Financials", price: 518.66, change: -2.30, changePercent: -0.44, volume: 3_100_000 },
  // Energy
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 108.55, change: -1.92, changePercent: -1.74, volume: 15_800_000 },
  { symbol: "CVX", name: "Chevron Corp.", sector: "Energy", price: 152.30, change: -2.45, changePercent: -1.58, volume: 8_200_000 },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy", price: 103.15, change: -1.88, changePercent: -1.79, volume: 6_700_000 },
  { symbol: "SLB", name: "Schlumberger Ltd.", sector: "Energy", price: 42.78, change: -0.95, changePercent: -2.17, volume: 12_100_000 },
  // Consumer
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer", price: 205.74, change: 2.88, changePercent: 1.42, volume: 48_300_000 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer", price: 248.50, change: -6.30, changePercent: -2.47, volume: 98_700_000 },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer", price: 92.40, change: 0.65, changePercent: 0.71, volume: 8_500_000 },
  { symbol: "HD", name: "Home Depot", sector: "Consumer", price: 388.22, change: -3.10, changePercent: -0.79, volume: 4_200_000 },
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer", price: 922.18, change: 5.40, changePercent: 0.59, volume: 2_100_000 },
  // Industrials
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials", price: 358.44, change: 4.60, changePercent: 1.30, volume: 3_400_000 },
  { symbol: "BA", name: "Boeing Co.", sector: "Industrials", price: 178.30, change: -3.50, changePercent: -1.93, volume: 7_800_000 },
  { symbol: "UPS", name: "United Parcel Service", sector: "Industrials", price: 128.90, change: 1.10, changePercent: 0.86, volume: 4_100_000 },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials", price: 192.55, change: 2.80, changePercent: 1.47, volume: 5_900_000 },
  // Communications
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Communications", price: 112.34, change: 1.45, changePercent: 1.31, volume: 9_200_000 },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communications", price: 908.72, change: 11.30, changePercent: 1.26, volume: 4_300_000 },
  { symbol: "CMCSA", name: "Comcast Corp.", sector: "Communications", price: 38.22, change: -0.28, changePercent: -0.73, volume: 18_500_000 },
];

// ─── Treemap Layout (squarified) ─────────────────────────────────────────────

function squarify(items, x, y, w, h) {
  if (!items.length || w <= 0 || h <= 0) return [];

  const totalValue = items.reduce((s, i) => s + i._vol, 0);
  if (totalValue <= 0) return [];

  const rects = [];
  let remaining = [...items];
  let cx = x, cy = y, cw = w, ch = h;

  while (remaining.length > 0) {
    const remTotal = remaining.reduce((s, i) => s + i._vol, 0);
    const isVertical = cw >= ch;
    const side = isVertical ? ch : cw;

    let row = [remaining[0]];
    let rowSum = remaining[0]._vol;

    const worstRatio = (rowItems, rowTotal, sideLen) => {
      const area = (rowTotal / remTotal) * cw * ch;
      const rowLen = area / sideLen;
      let worst = 0;
      for (const item of rowItems) {
        const itemArea = (item._vol / remTotal) * cw * ch;
        const itemLen = itemArea / rowLen;
        const ratio = Math.max(rowLen / itemLen, itemLen / rowLen);
        if (ratio > worst) worst = ratio;
      }
      return worst;
    };

    let i = 1;
    while (i < remaining.length) {
      const candidate = remaining[i];
      const newRow = [...row, candidate];
      const newSum = rowSum + candidate._vol;
      if (worstRatio(newRow, newSum, side) <= worstRatio(row, rowSum, side)) {
        row = newRow;
        rowSum = newSum;
        i++;
      } else {
        break;
      }
    }

    // Lay out row
    const rowFraction = rowSum / remTotal;
    const rowThickness = isVertical ? cw * rowFraction : ch * rowFraction;
    let offset = 0;

    for (const item of row) {
      const itemFraction = item._vol / rowSum;
      const itemLength = side * itemFraction;

      const rx = isVertical ? cx : cx + offset;
      const ry = isVertical ? cy + offset : cy;
      const rw = isVertical ? rowThickness : itemLength;
      const rh = isVertical ? itemLength : rowThickness;

      rects.push({ ...item, _x: rx, _y: ry, _w: rw, _h: rh });
      offset += itemLength;
    }

    // Reduce remaining area
    if (isVertical) {
      cx += rowThickness;
      cw -= rowThickness;
    } else {
      cy += rowThickness;
      ch -= rowThickness;
    }

    remaining = remaining.slice(row.length);
  }

  return rects;
}

// ─── Color Helpers ───────────────────────────────────────────────────────────

function changeColor(pct) {
  if (pct === 0) return COLORS.neutral;
  const maxPct = 5;
  const t = Math.min(Math.abs(pct) / maxPct, 1);
  if (pct > 0) return lerpColor(COLORS.greenDark, COLORS.greenBright, t);
  return lerpColor(COLORS.redDark, COLORS.redBright, t);
}

function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16),
    ag = parseInt(a.slice(3, 5), 16),
    ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16),
    bg = parseInt(b.slice(3, 5), 16),
    bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
}

function formatVolume(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return String(v);
}

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 200, 255, 0); }
  50%      { box-shadow: 0 0 12px 2px rgba(0, 200, 255, 0.3); }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  background: ${COLORS.bg};
  font-family: "IBM Plex Mono", monospace;
  color: ${COLORS.textPrimary};
  animation: ${fadeIn} 0.4s ease-out;
`;

const Sidebar = styled.aside`
  width: 240px;
  min-width: 240px;
  background: ${COLORS.surface};
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 180px;
    min-width: 180px;
  }
`;

const SidebarTitle = styled.h2`
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: ${COLORS.accent};
  padding: 20px 16px 12px;
  margin: 0;
  border-bottom: 1px solid ${COLORS.border};
`;

const SectorItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: ${(p) => (p.$active ? COLORS.surfaceHover : "transparent")};
  border: none;
  border-left: 3px solid ${(p) => (p.$active ? COLORS.accent : "transparent")};
  color: ${(p) => (p.$active ? COLORS.textPrimary : COLORS.textSecondary)};
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${COLORS.surfaceHover};
    color: ${COLORS.textPrimary};
  }
`;

const SectorName = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SectorStats = styled.span`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 10px;
  flex-shrink: 0;
  margin-left: 8px;
`;

const SectorPct = styled.span`
  color: ${(p) => p.$color};
  font-weight: 600;
`;

const SectorVol = styled.span`
  color: ${COLORS.textMuted};
`;

const MainArea = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid ${COLORS.border};
  background: ${COLORS.surface};
  flex-shrink: 0;
`;

const ToolbarTitle = styled.h1`
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 1px;
  color: ${COLORS.textPrimary};
  margin: 0;
`;

const SortControls = styled.div`
  display: flex;
  gap: 4px;
`;

const SortBtn = styled.button`
  padding: 4px 10px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  background: ${(p) => (p.$active ? COLORS.accent + "22" : "transparent")};
  color: ${(p) => (p.$active ? COLORS.accent : COLORS.textSecondary)};
  border: 1px solid ${(p) => (p.$active ? COLORS.accent + "44" : COLORS.border)};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: ${COLORS.accent};
    border-color: ${COLORS.accent}44;
  }
`;

const TreemapContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: 4px;
`;

const cellFadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Cell = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1px solid ${COLORS.bg};
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  transition: filter 0.15s ease, border-color 0.15s ease;
  animation: ${cellFadeIn} 0.3s ease-out both;
  animation-delay: ${(p) => p.$delay || "0s"};

  &:hover {
    filter: brightness(1.25);
    border-color: ${COLORS.accent}88;
    z-index: 10;
    ${pulseGlow}
  }
`;

const CellContent = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
`;

const CellSymbol = styled.span`
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  line-height: 1.1;
`;

const CellPct = styled.span`
  font-family: "IBM Plex Mono", monospace;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const Tooltip = styled.div`
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.accent}44;
  border-radius: 6px;
  padding: 12px 16px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  min-width: 200px;
  animation: ${fadeIn} 0.12s ease-out;
`;

const TtRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;

  & + & {
    margin-top: 4px;
  }
`;

const TtLabel = styled.span`
  color: ${COLORS.textMuted};
`;

const TtValue = styled.span`
  color: ${(p) => p.$color || COLORS.textPrimary};
  font-weight: 500;
`;

// ─── Component ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "volume", label: "Volume" },
  { key: "change", label: "% Change" },
  { key: "alpha", label: "A → Z" },
];

export default function MarketHeatmap({
  data,
  dataSource = "generic",
  onStockClick,
}) {
  useEffect(() => ensureFonts(), []);

  const [sort, setSort] = useState("volume");
  const [activeSector, setActiveSector] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Normalize incoming data
  const stocks = useMemo(() => {
    const raw = data || MOCK_DATA;
    return raw.map((r) => (data ? normalizeStock(r, dataSource) : r));
  }, [data, dataSource]);

  // Compute sectors
  const sectors = useMemo(() => {
    const map = {};
    for (const s of stocks) {
      if (!map[s.sector]) map[s.sector] = { stocks: [], totalVol: 0, totalPct: 0 };
      map[s.sector].stocks.push(s);
      map[s.sector].totalVol += s.volume;
      map[s.sector].totalPct += s.changePercent;
    }
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        count: d.stocks.length,
        totalVol: d.totalVol,
        avgPct: d.totalPct / d.stocks.length,
      }))
      .sort((a, b) => b.totalVol - a.totalVol);
  }, [stocks]);

  // Filter + sort
  const filtered = useMemo(() => {
    let arr = activeSector
      ? stocks.filter((s) => s.sector === activeSector)
      : [...stocks];

    switch (sort) {
      case "volume":
        arr.sort((a, b) => b.volume - a.volume);
        break;
      case "change":
        arr.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
        break;
      case "alpha":
        arr.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
    }
    return arr;
  }, [stocks, activeSector, sort]);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute treemap layout
  const cells = useMemo(() => {
    if (dims.w === 0 || dims.h === 0) return [];
    const items = filtered.map((s) => ({ ...s, _vol: Math.max(s.volume, 1) }));
    return squarify(items, 0, 0, dims.w, dims.h);
  }, [filtered, dims]);

  const handleMouseMove = useCallback((e, stock) => {
    setTooltip({ stock, x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleClick = useCallback(
    (stock) => {
      if (onStockClick) onStockClick(stock);
    },
    [onStockClick]
  );

  const toggleSector = (name) => {
    setActiveSector((prev) => (prev === name ? null : name));
  };

  // Determine font sizes based on cell dimensions
  const cellFontSize = (w, h) => {
    const min = Math.min(w, h);
    if (min < 30) return { sym: 0, pct: 0 };
    if (min < 45) return { sym: 10, pct: 0 };
    if (min < 60) return { sym: 11, pct: 9 };
    if (min < 90) return { sym: 14, pct: 11 };
    return { sym: 18, pct: 13 };
  };

  return (
    <Wrapper>
      {/* ─── Sector Sidebar ─────────────────────────── */}
      <Sidebar>
        <SidebarTitle>Sectors</SidebarTitle>
        <SectorItem
          $active={activeSector === null}
          onClick={() => setActiveSector(null)}
        >
          <SectorName>All Sectors</SectorName>
          <SectorStats>
            <SectorVol>{stocks.length}</SectorVol>
          </SectorStats>
        </SectorItem>
        {sectors.map((sec) => (
          <SectorItem
            key={sec.name}
            $active={activeSector === sec.name}
            onClick={() => toggleSector(sec.name)}
          >
            <SectorName>{sec.name}</SectorName>
            <SectorStats>
              <SectorPct $color={changeColor(sec.avgPct)}>
                {sec.avgPct >= 0 ? "+" : ""}
                {sec.avgPct.toFixed(1)}%
              </SectorPct>
              <SectorVol>{formatVolume(sec.totalVol)}</SectorVol>
            </SectorStats>
          </SectorItem>
        ))}
      </Sidebar>

      {/* ─── Main Content ─────────────────────────── */}
      <MainArea>
        <Toolbar>
          <ToolbarTitle>
            MARKET HEATMAP
            {activeSector && (
              <span style={{ color: COLORS.accent, fontWeight: 500, fontSize: 14, marginLeft: 12 }}>
                / {activeSector}
              </span>
            )}
          </ToolbarTitle>
          <SortControls>
            {SORT_OPTIONS.map((opt) => (
              <SortBtn
                key={opt.key}
                $active={sort === opt.key}
                onClick={() => setSort(opt.key)}
              >
                {opt.label}
              </SortBtn>
            ))}
          </SortControls>
        </Toolbar>

        <TreemapContainer ref={containerRef}>
          {cells.map((cell, idx) => {
            const bg = changeColor(cell.changePercent);
            const fonts = cellFontSize(cell._w, cell._h);
            return (
              <Cell
                key={cell.symbol}
                $delay={`${idx * 15}ms`}
                style={{
                  left: cell._x,
                  top: cell._y,
                  width: cell._w,
                  height: cell._h,
                  background: bg,
                }}
                onMouseMove={(e) => handleMouseMove(e, cell)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(cell)}
              >
                <CellContent>
                  {fonts.sym > 0 && (
                    <CellSymbol style={{ fontSize: fonts.sym }}>
                      {cell.symbol}
                    </CellSymbol>
                  )}
                  {fonts.pct > 0 && (
                    <CellPct style={{ fontSize: fonts.pct }}>
                      {cell.changePercent >= 0 ? "+" : ""}
                      {cell.changePercent.toFixed(2)}%
                    </CellPct>
                  )}
                </CellContent>
              </Cell>
            );
          })}
        </TreemapContainer>
      </MainArea>

      {/* ─── Tooltip ─────────────────────────────── */}
      {tooltip && (
        <Tooltip
          style={{
            left: tooltip.x + 16,
            top: tooltip.y + 16,
          }}
        >
          <TtRow>
            <TtLabel>Symbol</TtLabel>
            <TtValue $color={COLORS.accent}>{tooltip.stock.symbol}</TtValue>
          </TtRow>
          <TtRow>
            <TtLabel>Name</TtLabel>
            <TtValue>{tooltip.stock.name}</TtValue>
          </TtRow>
          <TtRow>
            <TtLabel>Sector</TtLabel>
            <TtValue>{tooltip.stock.sector}</TtValue>
          </TtRow>
          <TtRow>
            <TtLabel>Price</TtLabel>
            <TtValue>${tooltip.stock.price.toFixed(2)}</TtValue>
          </TtRow>
          <TtRow>
            <TtLabel>Change</TtLabel>
            <TtValue $color={changeColor(tooltip.stock.changePercent)}>
              {tooltip.stock.changePercent >= 0 ? "+" : ""}
              {tooltip.stock.changePercent.toFixed(2)}%
            </TtValue>
          </TtRow>
          <TtRow>
            <TtLabel>Volume</TtLabel>
            <TtValue>{formatVolume(tooltip.stock.volume)}</TtValue>
          </TtRow>
        </Tooltip>
      )}
    </Wrapper>
  );
}
