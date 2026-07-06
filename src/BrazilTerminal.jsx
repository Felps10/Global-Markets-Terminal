import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AssetCard, AssetRow, ListColumnHeader,
} from "./GlobalMarketsTerminal.jsx";
import { STATIC_ASSETS_MAP, DENSITY_CONFIG } from "./components/gmtConfig.js";
import AssetDetailDrawer from "./components/AssetDetailDrawer.jsx";
import CommandBar from "./components/CommandBar.jsx";
import GroupSummaryCard from "./components/GroupSummaryCard.jsx";
import { fetchB3MarketDataFromServer, bcbMacro, awesomeFx } from "./dataServices.js";
import { fetchBrazilMacro } from "./services/brazilDataServices.js";
import { usePreferences } from './context/PreferencesContext.jsx';
import { useWatchlist } from './context/WatchlistContext.jsx';
import { BRAZIL_BLOCKS, getSectionById } from "./data/brazilBlocks.js";

import { CLUBE_COLORS } from './lib/tokens.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GOLD             = CLUBE_COLORS.accent;

const B3_VOLATILITY = {
  "Bancos": 0.016, "Petróleo": 0.020, "Mineração": 0.020,
  "Agronegócio": 0.018, "Varejo": 0.018, "Utilities": 0.014,
  "Transporte": 0.015, "Indústria": 0.016, "Construção": 0.022,
  "Saúde": 0.018, "Telecom": 0.016, "Outros": 0.016,
  "br-fiis": 0.010, "br-etfs": 0.015, "br-indices": 0.012,
};

// Sector display order + labels (replaces old subgroup-based constants)
const SECTOR_ORDER = [
  "Bancos", "Petróleo", "Mineração", "Agronegócio", "Varejo",
  "Utilities", "Transporte", "Indústria", "Construção", "Saúde",
  "Telecom", "Outros",
];

const SECTOR_META = {
  "Bancos":       { label: "Bancos & Financeiro",    icon: "🏦" },
  "Petróleo":     { label: "Petróleo & Gás",         icon: "🛢"  },
  "Mineração":    { label: "Mineração",              icon: "⛏"  },
  "Agronegócio":  { label: "Agronegócio",            icon: "🌾"  },
  "Varejo":       { label: "Varejo & Consumo",       icon: "🛍"  },
  "Utilities":    { label: "Utilities & Energia",    icon: "⚡" },
  "Transporte":   { label: "Logística & Transporte", icon: "🚚"  },
  "Indústria":    { label: "Indústria",              icon: "⚙️" },
  "Construção":   { label: "Construção Civil",       icon: "🏗️" },
  "Saúde":        { label: "Saúde",                  icon: "🏥"  },
  "Telecom":      { label: "Telecom & Tech",         icon: "📡"  },
  "Outros":       { label: "Outros Setores",         icon: "📎"  },
};

// FII group taxonomy — the `sector` field on `type:"fii"` rows.
const FII_GROUP_ORDER = ["Tijolo", "Papel", "Híbrido", "FOF"];
const FII_GROUP_META = {
  "Tijolo":  { label: "Tijolo",  icon: "🧱" },
  "Papel":   { label: "Papel",   icon: "📄" },
  "Híbrido": { label: "Híbrido", icon: "🔀" },
  "FOF":     { label: "FOF",     icon: "🗂" },
};

// ETF group taxonomy — the `sector` field on `type:"etf-br"` rows.
const ETF_GROUP_ORDER = ["Renda Variável", "Internacional", "Renda Fixa"];
const ETF_GROUP_META = {
  "Renda Variável": { label: "Renda Variável", icon: "📈" },
  "Internacional":  { label: "Internacional",  icon: "🌎" },
  "Renda Fixa":     { label: "Renda Fixa",     icon: "🏦" },
};

// Which asset-grid sections exist and how to group each from STATIC_ASSETS_MAP.
// (All of these already flow through the server B3 feed — they were unrendered
// only because the grouping was hard-scoped to equity-br.)
const B3_SECTION_CONFIG = {
  "acoes-b3": { type: "equity-br", order: SECTOR_ORDER,    meta: SECTOR_META },
  "fiis":     { type: "fii",       order: FII_GROUP_ORDER, meta: FII_GROUP_META },
  "etfs":     { type: "etf-br",    order: ETF_GROUP_ORDER, meta: ETF_GROUP_META },
};
// Sections that render as the shared CommandBar + grouped asset grid.
const B3_GRID_SECTIONS = new Set(Object.keys(B3_SECTION_CONFIG));

// Computed once — STATIC_ASSETS_MAP is immutable after module init.
// Was previously a function called on every data refresh; memoized to avoid
// repeated O(n) filter over the full asset map.
let _b3AssetEntriesCache = null;
function getB3AssetEntries() {
  if (!_b3AssetEntriesCache) {
    _b3AssetEntriesCache = Object.entries(STATIC_ASSETS_MAP).filter(([, a]) => a.isB3);
  }
  return _b3AssetEntriesCache;
}

// ─── FOOTER TEXT MAP ──────────────────────────────────────────────────────────
const FOOTER_SECTION_TEXT = {
  "fiis":               "FIIs · B3 / BOVESPA",
  "etfs":               "ETFs · B3 / BOVESPA",
  "indices-benchmarks": "ÍNDICES & BENCHMARKS",
  "juros":              "JUROS · BCB",
  "credito":            "CRÉDITO · B3",
  "titulos-publicos":   "TÍTULOS PÚBLICOS · TESOURO DIRETO",
  "macro-brasil":       "MACRO · BCB / IBGE",
  "cambio-liquidez":    "CÂMBIO · AWESOMEAPI",
};

// ─── INDICATOR CARD ───────────────────────────────────────────────────────────
function IndicatorCard({ symbol, name, value, date, unit, source, category, changePct }) {
  const hasValue = value != null;
  const sourceColors = { BCB: { color: "#003087", bg: "rgba(0,48,135,0.18)", border: "rgba(0,48,135,0.28)" }, AwesomeAPI: { color: "#FF6B00", bg: "rgba(255,107,0,0.18)", border: "rgba(255,107,0,0.28)" } };
  const sc = sourceColors[source] || sourceColors.BCB;
  const fmtValue = hasValue
    ? (unit === "R$" ? "R$ " + Number(value).toFixed(2) : unit === "%" ? Number(value).toFixed(2) + "%" : unit === "R$ bi" ? "R$ " + Number(value).toFixed(1) + " bi" : Number(value).toFixed(2))
    : null;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "14px 16px", minWidth: 180, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.5px" }}>{symbol}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 3, padding: "1px 6px" }}>{source}</span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: "var(--c-text-3)", marginBottom: 8, lineHeight: 1.3 }}>{name}</div>
      {hasValue ? (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{fmtValue}</div>
      ) : (
        <div style={{ width: 40, height: 20, borderRadius: 3, background: "rgba(249,195,0,0.15)", marginBottom: 4 }} className="gmt-blink" />
      )}
      {changePct != null && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: changePct >= 0 ? "#00E676" : "var(--c-error)", marginBottom: 4 }}>
          {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
        </div>
      )}
      {date && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)" }}>{date}</div>}
      {category && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "var(--c-text-3)", marginTop: 4, letterSpacing: "0.5px", opacity: 0.6 }}>{category}</div>}
    </div>
  );
}

// ─── COMING SOON PLACEHOLDER ──────────────────────────────────────────────────
// One neutral treatment for every not-yet-live section (no accent color, so it
// reads as "pending" rather than as an active surface).
function ComingSoon({ section }) {
  return (
    <div style={{ minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--c-border)", borderRadius: 8, padding: 48, marginTop: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <div style={{ fontSize: 40, opacity: 0.25 }}>{section?.icon || "📊"}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "var(--c-text-2)", letterSpacing: "1px" }}>
          {(section?.label || "Seção").toUpperCase()}
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.6 }}>
          Em breve
        </div>
      </div>
    </div>
  );
}

// ─── BCB MACRO STRIP ──────────────────────────────────────────────────────────
function MacroStrip({ macro, extended }) {
  if (!macro) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(21,101,192,0.08)", border: "1px solid rgba(21,101,192,0.2)",
        borderRadius: 8, padding: "8px 14px", marginBottom: 16,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "pulse 1.2s ease-in-out infinite" }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>
          Loading macro data...
        </span>
      </div>
    );
  }
  const items = [
    { label: "SELIC",   value: macro.selic   != null ? macro.selic   + "%" : "—" },
    { label: "IPCA",    value: macro.ipca    != null ? macro.ipca    + "%" : "—" },
    { label: "CDI",     value: macro.cdi     != null ? macro.cdi     + "%" : "—" },
    { label: "USD/BRL", value: macro.usdBrl  != null ? "R$ " + Number(macro.usdBrl).toFixed(2) : "—", pct: macro.usdBrlPct },
  ];
  if (extended?.fx?.['EUR-BRL']?.value != null) {
    items.push({ label: "EUR/BRL", value: "R$ " + Number(extended.fx['EUR-BRL'].value).toFixed(2), pct: extended.fx['EUR-BRL'].changePct });
  }
  if (extended?.fx?.['GBP-BRL']?.value != null) {
    items.push({ label: "GBP/BRL", value: "R$ " + Number(extended.fx['GBP-BRL'].value).toFixed(2), pct: extended.fx['GBP-BRL'].changePct });
  }
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
      background: "rgba(21,101,192,0.08)", border: "1px solid rgba(21,101,192,0.2)",
      borderRadius: 8, padding: "8px 16px", marginBottom: 12,
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", color: "#003087", background: "rgba(0,48,135,0.18)", border: "1px solid rgba(0,48,135,0.28)", borderRadius: 3, padding: "1px 6px" }}>BCB</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", color: "#FF6B00", background: "rgba(255,107,0,0.18)", border: "1px solid rgba(255,107,0,0.28)", borderRadius: 3, padding: "1px 6px" }}>AwesomeAPI</span>
      {items.map(it => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>{it.label}:</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: it.value === "—" ? "var(--c-text-3)" : GOLD, fontVariantNumeric: "tabular-nums" }}>{it.value}</span>
          {it.pct != null && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: it.pct >= 0 ? "#00E676" : "var(--c-error)" }}>
              {it.pct >= 0 ? "+" : ""}{it.pct.toFixed(2)}%
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// Brazil-scoped collapse key — must NOT collide with the Global terminal's
// "collapsedGroups" (Global keys on subgroup ids, Brazil on sector names; a
// shared key would corrupt Global's collapsed state).
const COLLAPSE_KEY = "collapsedGroupsBrazil";

// All Brazil assets trade on B3, so the CommandBar exchange filter is inert
// (the EXCHANGE tab hides itself when allExchanges is empty). Stable refs.
const EMPTY_EXCHANGES = new Set();
const EMPTY_LIST = [];
const NOOP = () => {};

export default function BrazilTerminal() {
  const { prefs } = usePreferences();
  const { isPinned } = useWatchlist();
  const refreshInterval = (prefs.refreshInterval || 30) * 1000;

  // ── Existing state ───────────────────────────────────────────────────────────
  const [b3Data,          setB3Data]          = useState(null);
  const [macroData,       setMacroData]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [lastUpdate,      setLastUpdate]      = useState(null);
  const [viewMode,        setViewMode]        = useState("cards");   // "cards" | "list" (adapted to grid/list at the CommandBar)
  const [sortMode,        setSortMode]        = useState("alpha");   // "alpha" | "return"
  const [sortDir,         setSortDir]         = useState("asc");     // "asc" | "desc"
  const [activeFilter,    setActiveFilter]    = useState("all");     // "all" | "watchlist" | <sector name>
  const [cardDensity,     setCardDensity]     = useState("compact"); // "compact" | "comfortable" | "spacious"
  const [flatExpand,      setFlatExpand]      = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(COLLAPSE_KEY)) || {}; }
    catch { return {}; }
  });
  const [expandedCards,   setExpandedCards]   = useState(new Set());
  const [selectedAsset,   setSelectedAsset]   = useState(null);

  // ── New block/section state ─────────────────────────────────────────────────
  const [activeBlock,   setActiveBlock]   = useState("mercado");
  const [activeSection, setActiveSection] = useState("acoes-b3");

  // ── Extended macro data from backend endpoint ──────────────────────────────
  const [brazilMacroData, setBrazilMacroData] = useState(null);
  const [macroLoading,    setMacroLoading]    = useState(false);

  const prevDataRef = useRef(null);
  const intervalRef = useRef(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Section / block navigation ───────────────────────────────────────────────
  // Reset the sector filter when the section changes — each grid section has its
  // own group taxonomy (equity sectors vs FII types vs ETF classes).
  const handleSectionChange = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setActiveFilter("all");
  }, []);

  const handleBlockChange = useCallback((blockId) => {
    setActiveBlock(blockId);
    const block = BRAZIL_BLOCKS.find(b => b.blockId === blockId);
    if (block) handleSectionChange(block.sections[0].sectionId);
  }, [handleSectionChange]);

  // ── Active accent color ──────────────────────────────────────────────────────
  const accentColor = useMemo(() =>
    BRAZIL_BLOCKS.find(b => b.blockId === activeBlock)?.accentColor || GOLD,
  [activeBlock]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [b3Result, macroSettled, fxSettled] = await Promise.all([
        fetchB3MarketDataFromServer(getB3AssetEntries(), { assets: STATIC_ASSETS_MAP, volatility: B3_VOLATILITY }),
        bcbMacro().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e })),
        awesomeFx().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e })),
      ]);
      if (!mountedRef.current) return;
      prevDataRef.current = b3Result;
      setB3Data(b3Result || {});
      setMacroData({
        ...(macroSettled.value || {}),
        usdBrl:    fxSettled.value?.usdBrl    ?? null,
        usdBrlPct: fxSettled.value?.usdBrlPct ?? null,
      });
      setLastUpdate(new Date());
    } catch (_) {
      // partial data is acceptable
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [loadData, refreshInterval]);

  // ── Extended macro fetch (BCB batch + AwesomeAPI via backend) ──────────────
  useEffect(() => {
    let cancelled = false;
    const fetchMacro = async () => {
      setMacroLoading(true);
      try {
        const data = await fetchBrazilMacro();
        if (!cancelled && data) setBrazilMacroData(data);
      } catch (_) {
        // partial failure acceptable
      } finally {
        if (!cancelled) setMacroLoading(false);
      }
    };
    fetchMacro();
    const interval = setInterval(fetchMacro, 5 * 60 * 1000); /* macro refresh: 5 min */
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // ── Derive the active grid section's groups from the static map ──────────────
  // Ações → sectors, FIIs → fund type, ETFs → class. Same shape either way, so
  // the whole CommandBar + grouped-grid render below is section-agnostic.
  const brazilEquitySectors = useMemo(() => {
    const cfg = B3_SECTION_CONFIG[activeSection];
    if (!cfg) return [];
    const map = {};
    Object.entries(STATIC_ASSETS_MAP).forEach(([sym, a]) => {
      if (!a.isB3 || a.type !== cfg.type) return;
      const g = a.sector;
      if (!g || !cfg.meta[g]) return;
      if (!map[g]) map[g] = [];
      map[g].push(sym);
    });
    return cfg.order
      .filter(g => map[g])
      .map(g => ({ id: g, sector: g, ...cfg.meta[g], tickers: map[g] }));
  }, [activeSection]);

  // ── Índices & Benchmarks — read-only benchmark values (^BVSP, IFIX) ─────────
  const brazilIndices = useMemo(() =>
    Object.entries(STATIC_ASSETS_MAP)
      .filter(([, a]) => a.isB3 && a.type === "index-br")
      .map(([sym, a]) => ({ symbol: sym, name: a.name, display: a.meta?.display || sym })),
  []);

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  const toggleGroup = useCallback((id) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setFlatExpand(false);
    setExpandedCards(new Set());
    const next = {};
    brazilEquitySectors.forEach(sg => { next[sg.id] = true; });
    setCollapsedGroups(next);
    sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
  }, [brazilEquitySectors]);

  const expandAll = useCallback(() => {
    setFlatExpand(true);
    setCollapsedGroups({});
    setExpandedCards(new Set());
    sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify({}));
  }, []);

  const toggleCard = useCallback((id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────────
  const visibleSectors = useMemo(() => {
    if (activeFilter === "all" || activeFilter === "watchlist") return brazilEquitySectors;
    return brazilEquitySectors.filter(sg => sg.sector === activeFilter);
  }, [activeFilter, brazilEquitySectors]);

  const allCollapsed = useMemo(() =>
    visibleSectors.length > 0 && visibleSectors.every(sg => collapsedGroups[sg.id]),
  [visibleSectors, collapsedGroups]);

  const sortedSymbols = useCallback((symbols) => {
    const arr = [...symbols];
    if (sortMode === "alpha") {
      return arr.sort((a, b) => sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a));
    }
    // "return" — sort by daily % change
    return arr.sort((a, b) => {
      const pA = b3Data?.[a]?.changePct ?? 0;
      const pB = b3Data?.[b]?.changePct ?? 0;
      return sortDir === "desc" ? pB - pA : pA - pB;
    });
  }, [sortMode, sortDir, b3Data]);

  const getSectorStats = useCallback((sg) => {
    const syms     = sg.tickers.filter(s => b3Data?.[s]);
    const pcts     = syms.map(s => b3Data[s]?.changePct ?? 0);
    const avgPct   = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const totalMcap = syms.reduce((sum, s) => sum + (b3Data[s]?.marketCap ?? 0), 0);
    return { count: syms.length, avgPct, totalMcap };
  }, [b3Data]);

  // Symbols for a sector group — consumed by the shared GroupSummaryCard.
  const getGroupSymbols = useCallback((secId) => {
    const sg = brazilEquitySectors.find(s => s.id === secId);
    return sg ? sg.tickers.filter(s => b3Data?.[s]) : [];
  }, [brazilEquitySectors, b3Data]);

  // Watchlist flat view — all pinned B3 equities that have data.
  const watchlistFlatSymbols = useMemo(() => {
    if (activeFilter !== "watchlist") return null;
    return brazilEquitySectors
      .flatMap(sg => sg.tickers)
      .filter(s => b3Data?.[s] && isPinned('asset', s));
  }, [activeFilter, brazilEquitySectors, b3Data, isPinned]);

  // ── Market Pulse + Top Movers over the currently-visible set ────────────────
  const pulseSymbols = useMemo(() => {
    if (activeFilter === "watchlist") return watchlistFlatSymbols || [];
    return visibleSectors.flatMap(sg => sg.tickers).filter(s => b3Data?.[s]);
  }, [activeFilter, watchlistFlatSymbols, visibleSectors, b3Data]);

  const { sentiment, rising, falling, avgChange, topMovers } = useMemo(() => {
    const pcts = pulseSymbols
      .map(s => b3Data?.[s]?.changePct)
      .filter(n => typeof n === 'number' && !isNaN(n));
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const movers = pulseSymbols
      .filter(s => typeof b3Data?.[s]?.changePct === 'number' && !isNaN(b3Data[s].changePct))
      .sort((a, b) => Math.abs(b3Data[b].changePct) - Math.abs(b3Data[a].changePct))
      .slice(0, 6)
      .map(s => ({ symbol: s, changePct: b3Data[s].changePct ?? 0 }));
    return {
      sentiment: avg > 0.3 ? "BULLISH" : avg < -0.3 ? "BEARISH" : "MIXED",
      rising:  pcts.filter(p => p > 0).length,
      falling: pcts.filter(p => p < 0).length,
      avgChange: avg,
      topMovers: movers,
    };
  }, [pulseSymbols, b3Data]);

  // Sectors expressed as CommandBar "subgroups" — the setor filter is the one
  // Brazil-specific control surfaced through the shared bar.
  const sectorSubgroups = useMemo(() =>
    brazilEquitySectors.map(sg => ({ id: sg.id, group_id: "br-mercado", display_name: sg.label })),
  [brazilEquitySectors]);

  const totalTickers = brazilEquitySectors.reduce((n, sg) => n + sg.tickers.length, 0);

  // Active density config (grid min-width / gap), shared with the Global terminal.
  const dc = DENSITY_CONFIG[cardDensity] || DENSITY_CONFIG.compact;

  // ── Active section lookup ────────────────────────────────────────────────────
  const currentSection = getSectionById(activeSection);

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 0", gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: accentColor, animation: "pulse 1.2s ease-in-out infinite" }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--c-text-2)" }}>Conectando ao mercado B3...</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const hasB3Data    = b3Data && Object.keys(b3Data).length > 0;
  const hasMacroData = macroData != null && (
    macroData.selic != null || macroData.ipca != null ||
    macroData.cdi   != null || macroData.usdBrl != null
  );
  if (!hasB3Data && !hasMacroData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>📡</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: "var(--c-text-2)", letterSpacing: "2px" }}>SISTEMA FORA DO AR</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--c-text-3)", letterSpacing: "1px", maxWidth: 360, lineHeight: 1.8 }}>
          Nenhum dado disponível.<br />Todos os feeds estão inacessíveis.
        </div>
        <button onClick={loadData}
          style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "var(--c-text-2)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6, padding: "8px 20px", cursor: "pointer", letterSpacing: "1px", transition: "all 0.2s ease" }}
          onMouseEnter={e => { e.target.style.borderColor = GOLD; e.target.style.color = GOLD; }}
          onMouseLeave={e => { e.target.style.borderColor = "var(--c-border)"; e.target.style.color = "var(--c-text-2)"; }}>
          TENTAR NOVAMENTE
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" data-context="brazil" style={{ paddingTop: 16 }}>

      {/* Detail drawer — shared with the Global terminal (self-fetches quote +
          chart; B3 tickers resolve via taxonomy meta.isB3 → Yahoo `.SA`). */}
      <AssetDetailDrawer
        symbol={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onSymbolChange={setSelectedAsset}
      />

      {/* ── BLOCK TABS ── */}
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 0,
        borderBottom: "1px solid var(--c-border)", marginBottom: 14,
      }}>
        {BRAZIL_BLOCKS.map(block => {
          const isActive = activeBlock === block.blockId;
          return (
            <button
              key={block.blockId}
              onClick={() => handleBlockChange(block.blockId)}
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: "1.2px", padding: "10px 18px",
                cursor: "pointer", background: "transparent", outline: "none",
                border: "none", borderBottom: isActive ? `2px solid ${block.accentColor}` : "2px solid transparent",
                color: isActive ? block.accentColor : "var(--c-text-3)",
                transition: "all 0.15s ease",
                marginBottom: -1,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--c-text-2)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--c-text-3)"; }}
            >
              {block.icon} {block.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* ── BCB MACRO STRIP ── */}
      <MacroStrip macro={macroData} extended={brazilMacroData} />

      {/* ── SECTION TABS ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {BRAZIL_BLOCKS.find(b => b.blockId === activeBlock)?.sections.map(section => {
          const isActive = activeSection === section.sectionId;
          return (
            <button
              key={section.sectionId}
              onClick={() => handleSectionChange(section.sectionId)}
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600,
                padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? accentColor + "1F" : "var(--c-surface)",
                border:     isActive ? `1px solid ${accentColor}55` : "1px solid var(--c-border)",
                color:      isActive ? accentColor : "var(--c-text-2)",
              }}
            >
              {section.icon} {section.label}
            </button>
          );
        })}
      </div>

      {/* ── COMMAND BAR (asset-grid sections) — shared with the Global terminal ── */}
      {B3_GRID_SECTIONS.has(activeSection) && (
        <div style={{ marginBottom: 16 }}>
          <CommandBar
            sentiment={sentiment}
            risingCount={rising}
            fallingCount={falling}
            avgChange={avgChange}
            topMovers={topMovers}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            sortMode={sortMode}
            sortDir={sortDir}
            onSortChange={(mode, dir) => { setSortMode(mode); setSortDir(dir); }}
            activeExchanges={EMPTY_EXCHANGES}
            allExchanges={EMPTY_LIST}
            onExchangeToggle={NOOP}
            onExchangeReset={NOOP}
            viewMode={viewMode === "cards" ? "grid" : "list"}
            onViewChange={(mode) => setViewMode(mode === "grid" ? "cards" : "list")}
            onDensityChange={setCardDensity}
            cardDensity={cardDensity}
            onCollapseAll={collapseAll}
            onExpandAll={expandAll}
            flatExpand={flatExpand}
            onRefresh={loadData}
            groups={EMPTY_LIST}
            subgroups={sectorSubgroups}
          />
        </div>
      )}

      {/* ── CONTENT AREA ── */}
      {activeSection === "juros" ? (
        <div style={{ marginTop: 8 }}>
          {macroLoading && !brazilMacroData && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginBottom: 12 }}>Carregando dados BCB...</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {['CDI', 'SELIC', 'SELIC-META', 'SELIC-EFET'].map(sym => {
              const d = brazilMacroData?.bcb?.[sym];
              return (
                <IndicatorCard
                  key={sym}
                  symbol={sym}
                  name={d?.name || sym}
                  value={d?.value ?? null}
                  date={d?.date || null}
                  unit="%"
                  source="BCB"
                  category={d?.category || "Juros"}
                />
              );
            })}
          </div>
        </div>

      ) : activeSection === "macro-brasil" ? (
        <div style={{ marginTop: 8 }}>
          {macroLoading && !brazilMacroData && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginBottom: 12 }}>Carregando indicadores macro...</div>
          )}
          {[
            { cat: "Inflação",     syms: ["IPCA", "IGP-M", "INPC"] },
            { cat: "Atividade",    syms: ["IBC-Br", "PIB-REAL", "PIB-NOM", "PROD-IND", "VENDAS-VAR"] },
            { cat: "Emprego",      syms: ["DESEMPREGO"] },
            { cat: "Fiscal",       syms: ["RES-PRIM", "DIVIDA-PUB"] },
            { cat: "Externo",      syms: ["RESERVAS"] },
            { cat: "Expectativas", syms: ["FOCUS-IPCA"] },
            { cat: "Crédito",      syms: ["INAD"] },
          ].map(group => (
            <div key={group.cat} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
                {group.cat}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {group.syms.map(sym => {
                  const d = brazilMacroData?.bcb?.[sym];
                  return (
                    <IndicatorCard
                      key={sym}
                      symbol={sym}
                      name={d?.name || sym}
                      value={d?.value ?? null}
                      date={d?.date || null}
                      unit="%"
                      source="BCB"
                      category={group.cat}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      ) : activeSection === "cambio-liquidez" ? (
        <div style={{ marginTop: 8 }}>
          {macroLoading && !brazilMacroData && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginBottom: 12 }}>Carregando câmbio...</div>
          )}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            CÂMBIO
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            {['USD-BRL', 'EUR-BRL', 'GBP-BRL'].map(sym => {
              const d = brazilMacroData?.fx?.[sym];
              return (
                <IndicatorCard
                  key={sym}
                  symbol={sym}
                  name={sym.replace('-', '/')}
                  value={d?.value ?? null}
                  date={null}
                  unit="R$"
                  source="AwesomeAPI"
                  category="Câmbio"
                  changePct={d?.changePct ?? null}
                />
              );
            })}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            LIQUIDEZ & REFERÊNCIA
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {['PTAX', 'M2'].map(sym => {
              const d = brazilMacroData?.bcb?.[sym];
              return (
                <IndicatorCard
                  key={sym}
                  symbol={sym}
                  name={d?.name || sym}
                  value={d?.value ?? null}
                  date={d?.date || null}
                  unit={sym === 'M2' ? 'R$ bi' : 'R$'}
                  source="BCB"
                  category={d?.category || "Liquidez"}
                />
              );
            })}
          </div>
        </div>

      ) : activeSection === "indices-benchmarks" ? (
        /* ── ÍNDICES & BENCHMARKS — read-only benchmark values ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, padding: "12px 0" }}>
          {brazilIndices.map(ix => {
            const d = b3Data?.[ix.symbol];
            const pct = d?.changePct;
            const positive = (pct ?? 0) >= 0;
            const clr = pct == null ? "var(--c-text-3)" : positive ? "#00E676" : "var(--c-error)";
            return (
              <div key={ix.symbol} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.5px" }}>{ix.display}</span>
                  {pct != null && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: clr }}>
                      {positive ? "▲ +" : "▼ "}{pct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--c-text)", fontVariantNumeric: "tabular-nums" }}>
                  {d?.price != null ? d.price.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}
                </div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: "var(--c-text-3)", marginTop: 4 }}>{ix.name}</div>
              </div>
            );
          })}
        </div>

      ) : !B3_GRID_SECTIONS.has(activeSection) ? (
        <ComingSoon section={currentSection} />

      ) : (
        <>
          {!hasB3Data && (
            <div style={{
              margin: "0 0 16px 0",
              padding: "14px 18px",
              background: "rgba(249,195,0,0.06)",
              border: "1px solid rgba(249,195,0,0.25)",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                color: GOLD,
                letterSpacing: "0.5px",
              }}>
                ⚠ BRAPI QUOTA ESGOTADA
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "rgba(249,195,0,0.65)",
                lineHeight: 1.6,
              }}>
                Dados do mercado B3 indisponíveis.<br />
                Limite diário atingido — reset à meia-noite UTC.<br />
                SELIC · IPCA · CDI · USD/BRL continuam disponíveis abaixo.
              </div>
            </div>
          )}

          {watchlistFlatSymbols ? (
        /* ── WATCHLIST FLAT VIEW ── */
        watchlistFlatSymbols.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12, textAlign: "center" }}>
            <span style={{ fontSize: 32, opacity: 0.25 }}>★</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--c-text-3)", letterSpacing: "0.08em" }}>
              Nenhum ativo fixado — clique ★ em qualquer ativo
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${dc.assetGridMin}px, 1fr))`, gap: dc.assetGap, padding: "12px 0" }}>
            {sortedSymbols(watchlistFlatSymbols).map(sym => (
              <AssetCard key={sym} symbol={sym} data={b3Data[sym]} onClick={() => setSelectedAsset(sym)} density={cardDensity} />
            ))}
          </div>
        )
      ) : flatExpand ? (
        /* ── FLAT EXPAND — one continuous grid, no group headers ── */
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${dc.assetGridMin}px, 1fr))`, gap: dc.assetGap, padding: "12px 0" }}>
          {sortedSymbols(visibleSectors.flatMap(sg => sg.tickers).filter(s => b3Data?.[s])).map(sym => (
            <AssetCard key={sym} symbol={sym} data={b3Data[sym]} onClick={() => setSelectedAsset(sym)} density={cardDensity} />
          ))}
        </div>
      ) : allCollapsed && viewMode === "list" ? (
        /* ── MODE B: COLLAPSED LIST MODE ── */
        <div style={{ marginTop: 8, border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {visibleSectors.map(sg => {
            const stats    = getSectorStats(sg);
            if (stats.count === 0) return null;
            const isOpen   = expandedCards.has(sg.id);
            const pctColor = stats.avgPct > 0 ? "#00E676" : stats.avgPct < 0 ? "var(--c-error)" : "var(--c-text-3)";
            const pctSign  = stats.avgPct > 0 ? "+" : stats.avgPct < 0 ? "−" : "";
            const pctArrow = stats.avgPct > 0 ? "↑" : stats.avgPct < 0 ? "↓" : "";
            const syms     = isOpen ? sortedSymbols(sg.tickers.filter(s => b3Data[s])) : null;
            return (
              <div key={sg.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                <div
                  onClick={() => toggleCard(sg.id)}
                  style={{
                    display: "flex", alignItems: "center",
                    height: 40, padding: "0 16px",
                    borderLeft: `3px solid ${isOpen ? accentColor : (stats.avgPct >= 0 ? "#00E676" : "var(--c-error)")}`,
                    cursor: "pointer", transition: "background 0.15s ease", userSelect: "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--c-text)", flex: 1 }}>
                    {sg.icon} {sg.label}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginRight: 12 }}>
                    {stats.count} ativos
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: pctColor, marginRight: 12 }}>
                    {pctArrow} {pctSign}{Math.abs(stats.avgPct).toFixed(2)}%
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 16, lineHeight: 1,
                    color: isOpen ? accentColor : "var(--c-text-3)",
                    transition: "transform 0.25s ease, color 0.15s ease",
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    display: "inline-block",
                  }}>›</span>
                </div>
                <div style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? 4000 : 0,
                  opacity: isOpen ? 1 : 0,
                  transition: "max-height 0.25s ease, opacity 0.2s ease",
                }}>
                  <div style={{ borderTop: "1px solid var(--c-border)", padding: "12px 0" }}>
                    {syms && (
                      <>
                        <ListColumnHeader />
                        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                          {syms.map((sym, i) => (
                            <AssetRow key={sym} symbol={sym} data={b3Data[sym]} rank={i + 1} onClick={() => setSelectedAsset(sym)} />
                          ))}
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
        /* ── MODE A: COLLAPSED CARD GRID MODE ── */
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${dc.gridMin}px, 1fr))`, gap: dc.gap, padding: "12px 0" }}>
          {visibleSectors.map(sg => {
            const stats   = getSectorStats(sg);
            if (stats.count === 0) return null;
            const isOpen  = expandedCards.has(sg.id);

            if (!isOpen) {
              return (
                <GroupSummaryCard
                  key={sg.id}
                  catKey={sg.id}
                  cat={{ icon: sg.icon, label: sg.label }}
                  layout="grid"
                  density={cardDensity}
                  onExpand={() => toggleCard(sg.id)}
                  getGroupSymbols={getGroupSymbols}
                  marketData={b3Data}
                  assets={STATIC_ASSETS_MAP}
                />
              );
            }

            // Expanded inline slot
            const syms = sortedSymbols(sg.tickers.filter(s => b3Data[s]));
            return (
              <div key={sg.id} className="section-animate" style={{ gridColumn: "1 / -1", background: `${accentColor}08`, border: `0.5px solid ${accentColor}44`, borderRadius: 4, padding: "14px 16px", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "absolute", top: 10, left: 12, right: 12 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500, letterSpacing: "0.10em", color: "#2a4a6a", textTransform: "uppercase", userSelect: "none" }}>
                    {sg.icon} {sg.label}
                  </span>
                  <button
                    onClick={() => toggleCard(sg.id)}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, lineHeight: 1, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", transition: "all 0.15s ease" }}
                    onMouseEnter={e => { e.target.style.color = "#ff6b6b"; e.target.style.borderColor = "#ff6b6b"; }}
                    onMouseLeave={e => { e.target.style.color = "var(--c-text-3)"; e.target.style.borderColor = "var(--c-border)"; }}
                  >✕</button>
                </div>
                <div style={{ paddingTop: 38 }}>
                  {viewMode === "list" && <ListColumnHeader />}
                  {viewMode === "cards" ? (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${dc.assetGridMin}px, 1fr))`, gap: dc.assetGap }}>
                      {syms.map(sym => <AssetCard key={sym} symbol={sym} data={b3Data[sym]} onClick={() => setSelectedAsset(sym)} density={cardDensity} />)}
                    </div>
                  ) : (
                    <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                      {syms.map((sym, i) => <AssetRow key={sym} symbol={sym} data={b3Data[sym]} rank={i + 1} onClick={() => setSelectedAsset(sym)} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        /* ── MODE C: NORMAL EXPANDED GROUP VIEW ── */
        <div style={{ marginTop: 8 }}>
          {visibleSectors.map((sg, idx) => {
            const rawSyms = sg.tickers.filter(s => b3Data?.[s]);
            const syms    = sortedSymbols(rawSyms);
            if (syms.length === 0) return null;
            const pcts       = syms.map(s => b3Data[s]?.changePct ?? 0);
            const avgPct     = pcts.reduce((a, b) => a + b, 0) / pcts.length;
            const avgClr     = avgPct >= 0 ? "#00E676" : "var(--c-error)";
            const isCollapsed = collapsedGroups[sg.id];
            return (
              <div key={sg.id} className="section-animate" style={{ marginBottom: isCollapsed ? 8 : 24, animationDelay: `${idx * 0.08}s` }}>
                {isCollapsed ? (
                  <GroupSummaryCard
                    catKey={sg.id}
                    cat={{ icon: sg.icon, label: sg.label }}
                    layout="row"
                    density={cardDensity}
                    onExpand={() => toggleGroup(sg.id)}
                    getGroupSymbols={getGroupSymbols}
                    marketData={b3Data}
                    assets={STATIC_ASSETS_MAP}
                  />
                ) : (
                  <>
                    {/* Section header */}
                    <div
                      onClick={() => toggleGroup(sg.id)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: 10, padding: "6px 8px 6px 12px", borderRadius: 6,
                        cursor: "pointer", userSelect: "none", minHeight: 44,
                        transition: "background 0.15s ease",
                        borderLeft: `3px solid ${accentColor}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: accentColor, display: "inline-block" }}>▼</span>
                        <span style={{ fontSize: 16 }}>{sg.icon}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.3px", color: "var(--c-text)" }}>{sg.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>({syms.length})</span>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: avgClr }}>
                        {avgPct >= 0 ? "+" : ""}{avgPct.toFixed(2)}%
                      </div>
                    </div>
                    {/* Cards or list */}
                    {viewMode === "list" && <ListColumnHeader />}
                    {viewMode === "cards" ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {syms.map(sym => <AssetCard key={sym} symbol={sym} data={b3Data[sym]} onClick={() => setSelectedAsset(sym)} />)}
                      </div>
                    ) : (
                      <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
                        {syms.map((sym, i) => <AssetRow key={sym} symbol={sym} data={b3Data[sym]} rank={i + 1} onClick={() => setSelectedAsset(sym)} />)}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        )}
        </>
      )}

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 14, marginTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>FONTE: BRAPI · BCB · AWESOMEAPI</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.5px" }}>
          {B3_GRID_SECTIONS.has(activeSection)
            ? `${totalTickers} ATIVOS · ${brazilEquitySectors.length} GRUPOS · B3 / BOVESPA`
            : (FOOTER_SECTION_TEXT[activeSection] || "B3 / BOVESPA")}
          {lastUpdate ? ` · ${lastUpdate.toLocaleTimeString()}` : ""}
        </div>
      </div>

    </div>
  );
}
