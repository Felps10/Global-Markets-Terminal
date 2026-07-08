import React, { useState, useMemo, useCallback, useEffect } from "react";
import MarketsPageLayout from "./components/MarketsPageLayout.jsx";
import MarketHeatmap from "./components/MarketHeatmap";
import { fmpBatchQuote, hasFmpKey } from "./dataServices.js";

/* ─────────────────────────────────────────────────────────────────────────────
 * MarketHeatmapPage — Interactive wrapper around MarketHeatmap
 *
 * Renders as a fixed full-screen overlay (z-index 50) so it sits cleanly
 * on top of GlobalMarketsTerminal's scrollable layout.  The hamburger menu
 * (z-index 200+) still appears above this page.
 *
 * Standalone route at /markets/heatmap — uses react-router navigate for navigation.
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

// ─── Scoped styles for animations and scrollbar ─────────────────────────────
function ScopedStyles() {
  return (
    <style>{`
      @keyframes mhp-slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes mhp-slideInUp {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      @keyframes mhp-fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .mhp-ctrl-panel { animation: mhp-slideInRight 0.2s ease-out; }
      .mhp-ctrl-panel::-webkit-scrollbar { width: 4px; }
      .mhp-ctrl-panel::-webkit-scrollbar-track { background: transparent; }
      .mhp-ctrl-panel::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      .mhp-stats-bar { animation: mhp-slideInUp 0.3s ease-out; }
      .mhp-detail-panel { animation: mhp-slideInRight 0.2s ease-out; }
      .mhp-detail-panel::-webkit-scrollbar { width: 4px; }
      .mhp-detail-panel::-webkit-scrollbar-track { background: transparent; }
      .mhp-detail-panel::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      .mhp-compare-bar { animation: mhp-slideInUp 0.2s ease-out; }
      .mhp-search-input::placeholder { color: ${C.textMuted}; }
      .mhp-search-input:focus { border-color: ${C.accent}66; }
    `}</style>
  );
}

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

// ─── Toggle button with hover ───────────────────────────────────────────────
function ToggleBtnComp({ active, onClick, children, style: extraStyle }) {
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
        background: active ? C.accent + "22" : "transparent",
        color: active ? C.accent : hovered ? C.accent : C.textSecondary,
        border: `1px solid ${active ? C.accent + "66" : hovered ? C.accent + "44" : C.border}`,
        borderRadius: 4,
        cursor: "pointer",
        transition: "all 0.15s ease",
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

// ─── Action button with hover ───────────────────────────────────────────────
function ActionBtnComp({ primary, onClick, disabled, title, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: "7px 0",
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.5px",
        background: primary ? C.accent + "22" : "transparent",
        color: primary ? C.accent : hovered ? C.accent : C.textSecondary,
        border: `1px solid ${primary ? (hovered ? C.accent : C.accent + "66") : (hovered ? C.accent + "44" : C.border)}`,
        borderRadius: 4,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketHeatmapPage() {
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

  // ── Hover states ────────────────────────────────────────────────────────────
  const [hoveredBtn, setHoveredBtn] = useState(null);

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

    // 3. Size metric: size cells by marketCap instead of volume. Prefer the LIVE marketCap
    //    (from the batch-quote) so this mode is real too; fall back to the static base only
    //    when a live value is missing.
    if (sizeMetric === "marketCap") {
      data = data.map((s) => {
        const base = BASE_STOCKS.find((b) => b.symbol === s.symbol);
        return { ...s, volume: s.marketCap ?? base?.marketCap ?? s.volume };
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

  // ── Live data via ONE FMP batch-quote (real tile COLOR + SIZE) ────────────
  // batch-quote carries volume (→ tile size) AND changePercent (→ color) for all symbols in a
  // single call, unlike the old per-symbol Finnhub /quote loop that never returned volume.
  const loadLiveData = useCallback(async () => {
    setDataStatus("loading");
    const symbols = BASE_STOCKS.map((s) => s.symbol);

    const quotes = await fmpBatchQuote(symbols);
    if (!quotes) { setDataStatus("mock"); return; } // no key / rate-limited / error → keep mock

    const updated = BASE_STOCKS.map((stock) => {
      const q = quotes[stock.symbol];
      if (q && Number.isFinite(q.price)) {
        return {
          ...stock,
          price:         q.price,
          change:        q.change        ?? stock.change,
          changePercent: q.changePercent ?? stock.changePercent, // tile color
          volume:        q.volume        ?? stock.volume,         // tile size
          marketCap:     q.marketCap     ?? stock.marketCap,
        };
      }
      return stock;
    });

    const liveCount = symbols.filter((sym) => Number.isFinite(quotes[sym]?.price)).length;
    setStocks(updated);
    setDataStatus(
      liveCount === 0               ? "mock"    :
      liveCount < symbols.length    ? "partial" : "live"
    );
    setLastUpdated(new Date());
  }, []);

  // Auto-load once on mount when an FMP key is present → the treemap is live by default (one
  // cheap batch-quote, so no reason to gate it behind a manual click like the old Finnhub path).
  useEffect(() => {
    if (hasFmpKey()) loadLiveData();
  }, [loadLiveData]);

  // ── Look up base stock (has marketCap) for detail panel ──────────────────
  const selectedBase = selectedStock
    ? BASE_STOCKS.find((b) => b.symbol === selectedStock.symbol)
    : null;

  const isPinned = selectedStock
    ? pinnedStocks.some((s) => s.symbol === selectedStock.symbol)
    : false;

  // ── Data badge style helper ────────────────────────────────────────────────
  function dataBadgeStyle(status) {
    const colorMap = {
      live:    { bg: C.green + "22", color: C.green, border: C.green + "44" },
      partial: { bg: "#FF910022", color: "#FF9100", border: "#FF910044" },
      loading: { bg: C.accent + "22", color: C.accent, border: C.accent + "44" },
    };
    const colors = colorMap[status] || { bg: C.neutral + "44", color: C.textMuted, border: C.border };
    return {
      padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.5px", background: colors.bg, color: colors.color,
      border: `1px solid ${colors.border}`,
    };
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <MarketsPageLayout moduleTitle="Market Heatmap" moduleIcon="🔥">
    <div style={{
      position: "relative", flex: 1, overflow: "hidden",
      background: C.bg, fontFamily: '"IBM Plex Mono", monospace',
    }}>
      <ScopedStyles />
      <MarketHeatmap
        data={heatmapData}
        dataSource="generic"
        onStockClick={handleStockClick}
      />

      {/* ── Floating overlay ────────────────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 100 }}>
        <div style={{ pointerEvents: "all" }}>

          {/* Controls toggle button */}
          <button
            onClick={() => setCtrlOpen((o) => !o)}
            onMouseEnter={() => setHoveredBtn("ctrl")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              position: "absolute", top: 10, right: 10, width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: ctrlOpen ? C.accent + "22" : C.surface,
              border: `1px solid ${ctrlOpen ? C.accent + "88" : hoveredBtn === "ctrl" ? C.accent + "88" : C.border}`,
              borderRadius: 6,
              color: ctrlOpen ? C.accent : hoveredBtn === "ctrl" ? C.accent : C.textSecondary,
              fontSize: 15, cursor: "pointer", transition: "all 0.15s ease", zIndex: 10,
            }}
          >
            {ctrlOpen ? "✕" : "⚙"}
          </button>

          {/* ── Controls panel ────────────────────────────────────────────── */}
          {ctrlOpen && (
            <div className="mhp-ctrl-panel" style={{
              position: "absolute", top: 52, right: 10, width: 272,
              maxHeight: "calc(100vh - 80px)", overflowY: "auto",
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "0 0 12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.7)",
            }}>
              <div style={{
                padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
                fontFamily: '"Barlow Condensed", sans-serif', fontSize: 13,
                fontWeight: 700, letterSpacing: "1.5px", color: C.accent, textTransform: "uppercase",
              }}>Controls</div>

              {/* Search */}
              <div style={{ padding: "10px 14px 0" }}>
                <div style={{
                  fontSize: 10, color: C.textMuted, letterSpacing: "1px",
                  textTransform: "uppercase", marginBottom: 6,
                }}>Search ticker or name</div>
                <input
                  className="mhp-search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. AAPL, Apple..."
                  autoFocus
                  style={{
                    width: "100%", padding: "7px 10px", background: C.bg,
                    border: `1px solid ${C.border}`, borderRadius: 4,
                    color: C.textPrimary, fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 12, outline: "none", transition: "border-color 0.15s ease",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ height: 1, background: C.border, margin: "12px 0 0" }} />

              {/* Cell size metric */}
              <div style={{ padding: "10px 14px 0" }}>
                <div style={{
                  fontSize: 10, color: C.textMuted, letterSpacing: "1px",
                  textTransform: "uppercase", marginBottom: 6,
                }}>Cell size driven by</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {[
                    { key: "volume",    label: "Volume" },
                    { key: "marketCap", label: "Mkt Cap" },
                  ].map(({ key, label }) => (
                    <ToggleBtnComp
                      key={key}
                      active={sizeMetric === key}
                      onClick={() => setSizeMetric(key)}
                    >
                      {label}
                    </ToggleBtnComp>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: C.border, margin: "12px 0 0" }} />

              {/* Top-N highlight */}
              <div style={{ padding: "10px 14px 0" }}>
                <div style={{
                  fontSize: 10, color: C.textMuted, letterSpacing: "1px",
                  textTransform: "uppercase", marginBottom: 6,
                }}>Highlight top performers</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <ToggleBtnComp active={!topN} onClick={() => setTopN(null)}>All</ToggleBtnComp>
                  {[5, 10, 20].map((n) => (
                    <ToggleBtnComp
                      key={n}
                      active={topN === n}
                      onClick={() => setTopN(n)}
                    >
                      Top {n}
                    </ToggleBtnComp>
                  ))}
                </div>

                {topN && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    <ToggleBtnComp
                      active={topDir === "gainers"}
                      onClick={() => setTopDir("gainers")}
                    >
                      Gainers
                    </ToggleBtnComp>
                    <ToggleBtnComp
                      active={topDir === "losers"}
                      onClick={() => setTopDir("losers")}
                    >
                      Losers
                    </ToggleBtnComp>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: C.border, margin: "12px 0 0" }} />

              {/* Live data */}
              <div style={{ padding: "10px 14px 0" }}>
                <div style={{
                  fontSize: 10, color: C.textMuted, letterSpacing: "1px",
                  textTransform: "uppercase", marginBottom: 6,
                }}>Data source</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={dataBadgeStyle(dataStatus)}>
                    {dataStatus === "loading" ? "Loading…" :
                     dataStatus === "live"    ? "LIVE"     :
                     dataStatus === "partial" ? "PARTIAL"  : "MOCK"}
                  </span>
                  {hasFmpKey() && (
                    <button
                      onClick={loadLiveData}
                      disabled={dataStatus === "loading"}
                      onMouseEnter={() => setHoveredBtn("refresh")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      style={{
                        padding: "3px 10px",
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 10,
                        background: "transparent",
                        border: `1px solid ${hoveredBtn === "refresh" && dataStatus !== "loading" ? C.accent + "66" : C.border}`,
                        borderRadius: 4,
                        color: hoveredBtn === "refresh" && dataStatus !== "loading" ? C.accent : C.textSecondary,
                        cursor: dataStatus === "loading" ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        opacity: dataStatus === "loading" ? 0.4 : 1,
                      }}
                    >
                      Refresh
                    </button>
                  )}
                </div>
                {lastUpdated && (
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
                {!hasFmpKey() && (
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                    Set VITE_FMP_KEY for live data
                  </div>
                )}
                {dataStatus === "loading" && (
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                    Fetching live quotes…
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Stats bar (bottom of screen) ──────────────────────────────── */}
          <div className="mhp-stats-bar" style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 38,
            display: "flex", alignItems: "center",
            background: C.surface + "EE", borderTop: `1px solid ${C.border}`,
            backdropFilter: "blur(8px)", padding: "0 16px", gap: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Assets</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary }}>{stats.total}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Gainers</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>▲ {stats.gainers}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Losers</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.red }}>▼ {stats.losers}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg Δ</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: changeColor(stats.avgChange) }}>
                {fmtPct(stats.avgChange)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Mkt Cap</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary }}>{fmtLarge(stats.totalMCap)}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.textMuted }}>−5%</span>
              <div
                title="Color = 1-day % change (±5% scale)"
                style={{
                  width: 80, height: 8, borderRadius: 4,
                  background: "linear-gradient(to right, #991833, #FF2D55, #334455, #009950, #00FF9D)",
                }}
              />
              <span style={{ fontSize: 10, color: C.textMuted }}>+5%</span>
              <span style={{ marginLeft: 8, fontSize: 9, color: C.textMuted }}>
                SIZE = {sizeMetric === "marketCap" ? "Market Cap" : "Volume"}
              </span>
            </div>
          </div>

          {/* ── Compare bar (above stats bar, shows pinned stocks) ─────────── */}
          {pinnedStocks.length > 0 && (
            <div className="mhp-compare-bar" style={{
              position: "absolute", bottom: 38, left: 240,
              right: selectedStock ? 300 : 0,
              background: C.surface + "EE", borderTop: `1px solid ${C.border}`,
              borderLeft: `1px solid ${C.border}`, backdropFilter: "blur(8px)",
              padding: "10px 16px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 8, fontSize: 10, color: C.textMuted,
                textTransform: "uppercase", letterSpacing: "1px",
              }}>
                <span>Compare ({pinnedStocks.length}/3)</span>
                <button
                  onClick={() => setPinnedStocks([])}
                  onMouseEnter={() => setHoveredBtn("clear")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    background: "transparent", border: "none",
                    color: hoveredBtn === "clear" ? C.red : C.textMuted,
                    fontSize: 10, cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace',
                    letterSpacing: "0.5px",
                  }}
                >Clear all</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {pinnedStocks.map((s) => (
                  <div key={s.symbol} style={{
                    position: "relative", padding: "8px 28px 8px 10px",
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 5, minWidth: 100,
                  }}>
                    <div style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: 14, fontWeight: 700, color: C.textPrimary,
                    }}>{s.symbol}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: changeColor(s.changePercent) }}>
                      {fmtPct(s.changePercent)}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                      {fmtPrice(s.price)}
                    </div>
                    <button
                      onClick={() => handleUnpin(s.symbol)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        background: "transparent", border: "none",
                        color: C.textMuted, fontSize: 11, cursor: "pointer", padding: "2px 4px",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = C.red}
                      onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Detail panel (right side, slides in on cell click) ─────────── */}
          {selectedStock && (
            <div className="mhp-detail-panel" style={{
              position: "absolute", top: 0, right: 0, bottom: 38, width: 300,
              background: C.surface, borderLeft: `1px solid ${C.border}`,
              overflowY: "auto", display: "flex", flexDirection: "column",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
              }}>
                <div style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: 22, fontWeight: 700, color: C.textPrimary,
                }}>{selectedStock.symbol}</div>
                <button
                  onClick={() => setSelectedStock(null)}
                  style={{
                    background: "transparent", border: "none", color: C.textMuted,
                    fontSize: 16, cursor: "pointer", padding: "2px 6px", borderRadius: 3,
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = C.textPrimary}
                  onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}
                >✕</button>
              </div>

              <div style={{ padding: "14px 16px", flex: 1 }}>
                <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14, lineHeight: 1.4 }}>
                  {selectedStock.name}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Sector", value: selectedStock.sector },
                    { label: "Price", value: fmtPrice(selectedStock.price) },
                    { label: "Change ($)", value: `${selectedStock.change >= 0 ? "+" : ""}${fmtPrice(selectedStock.change)}`, color: changeColor(selectedStock.changePercent) },
                    { label: "Change (%)", value: fmtPct(selectedStock.changePercent), color: changeColor(selectedStock.changePercent) },
                    { label: "Volume", value: fmtLarge(selectedStock.volume) },
                    ...(selectedBase?.marketCap ? [{ label: "Market Cap", value: fmtLarge(selectedBase.marketCap) }] : []),
                    ...(dataStatus !== "mock" && lastUpdated ? [{ label: "Updated", value: lastUpdated.toLocaleTimeString(), style: { fontSize: 10 } }] : []),
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 0",
                      borderBottom: i < arr.length - 1 ? `1px solid ${C.border}66` : "none",
                    }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.color || C.textPrimary, ...(row.style || {}) }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                display: "flex", gap: 8, padding: "14px 16px",
                borderTop: `1px solid ${C.border}`, flexShrink: 0,
              }}>
                <ActionBtnComp
                  primary={!isPinned}
                  onClick={() => handlePin(selectedStock)}
                  disabled={!isPinned && pinnedStocks.length >= 3}
                  title={!isPinned && pinnedStocks.length >= 3 ? "Max 3 pinned" : ""}
                >
                  {isPinned ? "Unpin" : "Compare"}
                </ActionBtnComp>
                <ActionBtnComp onClick={() => setSelectedStock(null)}>
                  Close
                </ActionBtnComp>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </MarketsPageLayout>
  );
}
