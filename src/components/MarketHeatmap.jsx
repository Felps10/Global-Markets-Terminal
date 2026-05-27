import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

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

// ── Scoped styles for animations and scrollbar ────────────────────────────────
function ScopedStyles() {
  return (
    <style>{`
      @keyframes mh-fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes mh-pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(0, 200, 255, 0); }
        50%      { box-shadow: 0 0 12px 2px rgba(0, 200, 255, 0.3); }
      }
      @keyframes mh-cellFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes mh-tooltipFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }
      .mh-wrapper { animation: mh-fadeIn 0.4s ease-out; }
      .mh-cell {
        animation: mh-cellFadeIn 0.3s ease-out both;
      }
      .mh-cell:hover {
        filter: brightness(1.25);
        border-color: ${COLORS.accent}88;
        z-index: 10;
      }
      .mh-tooltip { animation: mh-tooltipFadeIn 0.12s ease-out; }
      /* @media handled via CSS */
      @media (max-width: 768px) {
        .mh-sidebar { width: 180px !important; min-width: 180px !important; }
      }
    `}</style>
  );
}

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

  // Hover states
  const [hoveredSector, setHoveredSector] = useState(null);

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
    <div className="mh-wrapper" style={{
      display: "flex", height: "100vh", width: "100%",
      background: COLORS.bg, fontFamily: '"IBM Plex Mono", monospace',
      color: COLORS.textPrimary,
    }}>
      <ScopedStyles />
      {/* ─── Sector Sidebar ─────────────────────────── */}
      <aside className="mh-sidebar" style={{
        width: 240, minWidth: 240, background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <h2 style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700,
          fontSize: 14, textTransform: "uppercase", letterSpacing: "2px",
          color: COLORS.accent, padding: "20px 16px 12px", margin: 0,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>Sectors</h2>
        {/* All Sectors button */}
        <button
          onClick={() => setActiveSector(null)}
          onMouseEnter={() => setHoveredSector("__all__")}
          onMouseLeave={() => setHoveredSector(null)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "10px 16px",
            background: activeSector === null ? COLORS.surfaceHover : hoveredSector === "__all__" ? COLORS.surfaceHover : "transparent",
            border: "none",
            borderLeft: `3px solid ${activeSector === null ? COLORS.accent : "transparent"}`,
            color: activeSector === null ? COLORS.textPrimary : hoveredSector === "__all__" ? COLORS.textPrimary : COLORS.textSecondary,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
            cursor: "pointer", transition: "all 0.15s ease",
          }}
        >
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>All Sectors</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10, flexShrink: 0, marginLeft: 8 }}>
            <span style={{ color: COLORS.textMuted }}>{stocks.length}</span>
          </span>
        </button>
        {sectors.map((sec) => {
          const isActive = activeSector === sec.name;
          const isHovered = hoveredSector === sec.name;
          return (
            <button
              key={sec.name}
              onClick={() => toggleSector(sec.name)}
              onMouseEnter={() => setHoveredSector(sec.name)}
              onMouseLeave={() => setHoveredSector(null)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 16px",
                background: isActive ? COLORS.surfaceHover : isHovered ? COLORS.surfaceHover : "transparent",
                border: "none",
                borderLeft: `3px solid ${isActive ? COLORS.accent : "transparent"}`,
                color: isActive ? COLORS.textPrimary : isHovered ? COLORS.textPrimary : COLORS.textSecondary,
                fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
                cursor: "pointer", transition: "all 0.15s ease",
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sec.name}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10, flexShrink: 0, marginLeft: 8 }}>
                <span style={{ color: changeColor(sec.avgPct), fontWeight: 600 }}>
                  {sec.avgPct >= 0 ? "+" : ""}
                  {sec.avgPct.toFixed(1)}%
                </span>
                <span style={{ color: COLORS.textMuted }}>{formatVolume(sec.totalVol)}</span>
              </span>
            </button>
          );
        })}
      </aside>

      {/* ─── Main Content ─────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.surface, flexShrink: 0,
        }}>
          <h1 style={{
            fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700,
            fontSize: 20, letterSpacing: "1px", color: COLORS.textPrimary, margin: 0,
          }}>
            MARKET HEATMAP
            {activeSector && (
              <span style={{ color: COLORS.accent, fontWeight: 500, fontSize: 14, marginLeft: 12 }}>
                / {activeSector}
              </span>
            )}
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {SORT_OPTIONS.map((opt) => (
              <SortBtnComp
                key={opt.key}
                active={sort === opt.key}
                onClick={() => setSort(opt.key)}
              >
                {opt.label}
              </SortBtnComp>
            ))}
          </div>
        </div>

        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", padding: 4 }}>
          {cells.map((cell, idx) => {
            const bg = changeColor(cell.changePercent);
            const fonts = cellFontSize(cell._w, cell._h);
            return (
              <div
                key={cell.symbol}
                className="mh-cell"
                style={{
                  position: "absolute",
                  boxSizing: "border-box",
                  border: `1px solid ${COLORS.bg}`,
                  borderRadius: 3,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "filter 0.15s ease, border-color 0.15s ease",
                  animationDelay: `${idx * 15}ms`,
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
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", padding: 4,
                }}>
                  {fonts.sym > 0 && (
                    <span style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700, color: "#fff",
                      textShadow: "0 1px 3px rgba(0, 0, 0, 0.6)",
                      lineHeight: 1.1, fontSize: fonts.sym,
                    }}>
                      {cell.symbol}
                    </span>
                  )}
                  {fonts.pct > 0 && (
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontWeight: 600, color: "rgba(255, 255, 255, 0.9)",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                      fontSize: fonts.pct,
                    }}>
                      {cell.changePercent >= 0 ? "+" : ""}
                      {cell.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ─── Tooltip ─────────────────────────────── */}
      {tooltip && (
        <div className="mh-tooltip" style={{
          position: "fixed", pointerEvents: "none", zIndex: 1000,
          background: COLORS.surface,
          border: `1px solid ${COLORS.accent}44`,
          borderRadius: 6, padding: "12px 16px",
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
          minWidth: 200,
          left: tooltip.x + 16, top: tooltip.y + 16,
        }}>
          {[
            { label: "Symbol", value: tooltip.stock.symbol, color: COLORS.accent },
            { label: "Name", value: tooltip.stock.name },
            { label: "Sector", value: tooltip.stock.sector },
            { label: "Price", value: `$${tooltip.stock.price.toFixed(2)}` },
            { label: "Change", value: `${tooltip.stock.changePercent >= 0 ? "+" : ""}${tooltip.stock.changePercent.toFixed(2)}%`, color: changeColor(tooltip.stock.changePercent) },
            { label: "Volume", value: formatVolume(tooltip.stock.volume) },
          ].map((row, i) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", gap: 16,
              marginTop: i > 0 ? 4 : 0,
            }}>
              <span style={{ color: COLORS.textMuted }}>{row.label}</span>
              <span style={{ color: row.color || COLORS.textPrimary, fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sort button with hover ──────────────────────────────────────────────────
function SortBtnComp({ active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 10px",
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        background: active ? COLORS.accent + "22" : "transparent",
        color: active ? COLORS.accent : hovered ? COLORS.accent : COLORS.textSecondary,
        border: `1px solid ${active ? COLORS.accent + "44" : hovered ? COLORS.accent + "44" : COLORS.border}`,
        borderRadius: 4,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}
