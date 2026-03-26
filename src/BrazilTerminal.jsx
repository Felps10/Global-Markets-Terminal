import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AssetCard, AssetRow, ListColumnHeader, Sparkline,
  formatPrice, formatVolume, formatMarketCap,
  STATIC_ASSETS_MAP,
} from "./GlobalMarketsTerminal.jsx";
import { fetchB3MarketData, bcbMacro, awesomeFx } from "./dataServices.js";
import { usePreferences } from './context/PreferencesContext.jsx';
import { BRAZIL_BLOCKS, getSectionById } from "./data/brazilBlocks.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GOLD             = "#F9C300";

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

// B3_ASSET_ENTRIES is computed lazily at call time to avoid circular-module init
function getB3AssetEntries() {
  return Object.entries(STATIC_ASSETS_MAP).filter(([, a]) => a.isB3);
}

// ─── SORT OPTIONS ─────────────────────────────────────────────────────────────
const SORT_OPTS = [
  { key: "alpha",   label: "A–Z",     defaultDir: "asc"  },
  { key: "gainers", label: "Gainers", defaultDir: "desc" },
  { key: "losers",  label: "Losers",  defaultDir: "asc"  },
];

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

// ─── BCB MACRO STRIP ──────────────────────────────────────────────────────────
function MacroStrip({ macro }) {
  if (!macro) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(249,195,0,0.06)", border: "1px solid rgba(249,195,0,0.2)",
        borderRadius: 6, padding: "8px 14px", marginBottom: 16,
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
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
      background: "rgba(249,195,0,0.06)", border: "1px solid rgba(249,195,0,0.2)",
      borderRadius: 6, padding: "8px 16px", marginBottom: 12,
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", color: "#003087", background: "rgba(0,48,135,0.18)", border: "1px solid rgba(0,48,135,0.28)", borderRadius: 3, padding: "1px 6px" }}>BCB</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", color: "#FF6B00", background: "rgba(255,107,0,0.18)", border: "1px solid rgba(255,107,0,0.28)", borderRadius: 3, padding: "1px 6px" }}>AwesomeAPI</span>
      {items.map(it => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)" }}>{it.label}:</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: it.value === "—" ? "var(--c-text-3)" : GOLD }}>{it.value}</span>
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

// ─── PLACEHOLDER SECTION ──────────────────────────────────────────────────────
function PlaceholderSection({ section, accentColor }) {
  return (
    <div style={{
      minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center",
      border: `1px dashed ${accentColor}4D`,
      borderRadius: 8, padding: 48, marginTop: 8,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
        <div style={{ fontSize: 48, opacity: 0.25 }}>{section?.icon || "📊"}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "var(--c-text-2)", letterSpacing: "1px" }}>
          {section?.label?.toUpperCase() || "SEÇÃO"}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.6 }}>
          Dados em desenvolvimento · Em breve nesta seção
        </div>
      </div>
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({ section, accentColor, getFilter, setFilter, clearFilters, activeFilterCount, activeSector, setActiveSector }) {
  if (!section) return null;
  const { sectionId, filters = [] } = section;

  const nonSetorActiveCount = activeFilterCount(sectionId);
  const setorIsFiltered     = sectionId === "acoes-b3" && activeSector !== "all";
  const hasAnyActive        = nonSetorActiveCount > 0 || setorIsFiltered;

  const inputStyle = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    background: "var(--c-surface)", border: "1px solid var(--c-border)",
    borderRadius: 4, padding: "3px 8px", color: "var(--c-text-2)",
    width: 64, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16, padding: "10px 0 14px", borderBottom: "1px solid var(--c-border)", marginBottom: 12 }}>
      {filters.map(filter => {
        // ── Setor pill (wired to activeSector)
        if (filter.id === "setor" && sectionId === "acoes-b3") {
          return (
            <div key={filter.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "var(--c-text-3)", textTransform: "uppercase" }}>{filter.label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {filter.options.map(opt => {
                  const sectorVal = opt === "Todos" ? "all" : opt;
                  const isActive  = activeSector === sectorVal;
                  return (
                    <button
                      key={opt}
                      onClick={() => setActiveSector(sectorVal)}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                        padding: "3px 9px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                        background: isActive ? accentColor + "22" : "transparent",
                        color:      isActive ? accentColor : "var(--c-text-3)",
                        border:     isActive ? `1px solid ${accentColor}66` : "1px solid var(--c-border)",
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Pill filter
        if (filter.type === "pill") {
          const currentVal = getFilter(sectionId, filter.id);
          return (
            <div key={filter.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "var(--c-text-3)", textTransform: "uppercase" }}>{filter.label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {filter.options.map(opt => {
                  const isDefault = opt === filter.options[0];
                  const isActive  = isDefault ? (currentVal == null) : (currentVal === opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => setFilter(sectionId, filter.id, isDefault ? null : opt)}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                        padding: "3px 9px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                        background: isActive ? accentColor + "22" : "transparent",
                        color:      isActive ? accentColor : "var(--c-text-3)",
                        border:     isActive ? `1px solid ${accentColor}66` : "1px solid var(--c-border)",
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Range filter
        if (filter.type === "range") {
          const currentVal = getFilter(sectionId, filter.id) || {};
          return (
            <div key={filter.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "var(--c-text-3)", textTransform: "uppercase" }}>
                {filter.label}{filter.unit ? ` (${filter.unit})` : ""}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  style={inputStyle}
                  placeholder="min"
                  value={currentVal.min || ""}
                  onChange={e => setFilter(sectionId, filter.id, { ...currentVal, min: e.target.value })}
                />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)" }}>—</span>
                <input
                  style={inputStyle}
                  placeholder="max"
                  value={currentVal.max || ""}
                  onChange={e => setFilter(sectionId, filter.id, { ...currentVal, max: e.target.value })}
                />
              </div>
            </div>
          );
        }

        return null;
      })}

      {hasAnyActive && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 2 }}>
          <button
            onClick={() => { clearFilters(sectionId); setActiveSector("all"); }}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.5px", color: "#FF5252", background: "transparent",
              border: "none", cursor: "pointer", padding: "3px 0", textDecoration: "underline",
              transition: "opacity 0.15s",
            }}
          >Limpar filtros</button>
        </div>
      )}
    </div>
  );
}

// ─── BRAZIL DETAIL PANEL ─────────────────────────────────────────────────────
function BrazilDetailPanel({ symbol, data, onClose }) {
  const asset = STATIC_ASSETS_MAP[symbol];
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  if (!asset || !data) return null;
  const positive    = (data.changePct ?? 0) >= 0;
  const color       = positive ? "#00E676" : "#FF5252";
  const sign        = positive ? "+" : "";
  const weekHighPct = data.fiftyTwoWeekHigh && data.price
    ? ((data.price - data.fiftyTwoWeekLow) / (data.fiftyTwoWeekHigh - (data.fiftyTwoWeekLow || 0))) * 100
    : null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(480px, 100vw)",
        background: "var(--c-panel)", borderLeft: "1px solid var(--c-border)",
        zIndex: 301, overflowY: "auto",
        animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ padding: "20px 20px 0", borderBottom: "1px solid var(--c-border)", paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--c-text)", letterSpacing: "0.5px" }}>{symbol}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.8px", color: "#080f1a", background: GOLD, borderRadius: 3, padding: "2px 6px" }}>B3</span>
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--c-text-2)" }}>{asset.name}</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "1px solid var(--c-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--c-text-3)", transition: "all 0.15s ease" }}
              onMouseEnter={e => { e.target.style.color = "#ff6b6b"; e.target.style.borderColor = "#ff6b6b"; }}
              onMouseLeave={e => { e.target.style.color = "var(--c-text-3)"; e.target.style.borderColor = "var(--c-border)"; }}
            >✕</button>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color }}>{formatPrice(symbol, data.price)}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color, background: color + "18", border: `1px solid ${color}30`, borderRadius: 4, padding: "2px 8px" }}>
              {positive ? "▲" : "▼"} {sign}{data.changePct != null ? data.changePct.toFixed(2) : "—"}%
            </span>
            {data.change != null && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: color + "99" }}>
                {sign}{data.change.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "OPEN",     value: formatPrice(symbol, data.prevClose) },
              { label: "HIGH",     value: formatPrice(symbol, data.high) },
              { label: "LOW",      value: formatPrice(symbol, data.low) },
              { label: "VOLUME",   value: formatVolume(data.volume) },
              { label: "MKT CAP",  value: data.marketCap ? "R$ " + (data.marketCap >= 1e9 ? (data.marketCap / 1e9).toFixed(1) + "B" : data.marketCap >= 1e6 ? (data.marketCap / 1e6).toFixed(1) + "M" : data.marketCap.toLocaleString()) : "—" },
              { label: "EXCHANGE", value: asset.exchange || "B3" },
            ].map(item => (
              <div key={item.label} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{item.value}</div>
              </div>
            ))}
          </div>
          {data.sparkline && data.sparkline.length > 1 && (
            <div style={{ marginBottom: 20, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 8 }}>TREND (30 POINTS)</div>
              <Sparkline data={data.sparkline} positive={positive} width={400} height={80} />
            </div>
          )}
          {data.fiftyTwoWeekHigh != null && data.fiftyTwoWeekLow != null && (
            <div style={{ marginBottom: 20, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 6, padding: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 8 }}>52-WEEK RANGE</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#FF5252" }}>{formatPrice(symbol, data.fiftyTwoWeekLow)}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>{formatPrice(symbol, data.price)}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#00E676" }}>{formatPrice(symbol, data.fiftyTwoWeekHigh)}</span>
              </div>
              <div style={{ height: 4, background: "var(--c-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, weekHighPct ?? 50))}%`, background: `linear-gradient(90deg,#FF5252,${GOLD},#00E676)`, borderRadius: 2 }} />
              </div>
            </div>
          )}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "0.5px", paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
            DATA VIA BRAPI · YAHOO FINANCE (.SA)
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BrazilTerminal() {
  const { prefs } = usePreferences();
  const refreshInterval = (prefs.refreshInterval || 30) * 1000;

  // ── Existing state ───────────────────────────────────────────────────────────
  const [b3Data,          setB3Data]          = useState(null);
  const [macroData,       setMacroData]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [lastUpdate,      setLastUpdate]      = useState(null);
  const [viewMode,        setViewMode]        = useState("cards");
  const [sortMode,        setSortMode]        = useState("default");
  const [sortDir,         setSortDir]         = useState("asc");
  const [activeSector,  setActiveSector]  = useState("all");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedCards,   setExpandedCards]   = useState(new Set());
  const [selectedAsset,   setSelectedAsset]   = useState(null);

  // ── New block/section/filter state ──────────────────────────────────────────
  const [activeBlock,   setActiveBlock]   = useState("mercado");
  const [activeSection, setActiveSection] = useState("acoes-b3");
  const [activeFilters, setActiveFilters] = useState({});

  const prevDataRef = useRef(null);
  const intervalRef = useRef(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Filter helpers ───────────────────────────────────────────────────────────
  const getFilter = useCallback((sectionId, filterId) =>
    activeFilters[sectionId]?.[filterId] ?? null,
  [activeFilters]);

  const setFilter = useCallback((sectionId, filterId, value) =>
    setActiveFilters(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [filterId]: value },
    })),
  []);

  const clearFilters = useCallback((sectionId) =>
    setActiveFilters(prev => { const next = { ...prev }; delete next[sectionId]; return next; }),
  []);

  const activeFilterCount = useCallback((sectionId) =>
    Object.keys(activeFilters[sectionId] || {}).length,
  [activeFilters]);

  // ── Block navigation ─────────────────────────────────────────────────────────
  const handleBlockChange = useCallback((blockId) => {
    setActiveBlock(blockId);
    const block = BRAZIL_BLOCKS.find(b => b.blockId === blockId);
    if (block) setActiveSection(block.sections[0].sectionId);
  }, []);

  // ── Active accent color ──────────────────────────────────────────────────────
  const accentColor = useMemo(() =>
    BRAZIL_BLOCKS.find(b => b.blockId === activeBlock)?.accentColor || GOLD,
  [activeBlock]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [b3Result, macroSettled, fxSettled] = await Promise.all([
        fetchB3MarketData(getB3AssetEntries(), { assets: STATIC_ASSETS_MAP, volatility: B3_VOLATILITY }),
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

  // ── Derive equity sectors from static map ────────────────────────────────────
  const brazilEquitySectors = useMemo(() => {
    const map = {};
    Object.entries(STATIC_ASSETS_MAP).forEach(([sym, a]) => {
      if (!a.isB3 || a.type !== "equity-br") return;
      const sec = a.sector;
      if (!sec || !SECTOR_META[sec]) return;
      if (!map[sec]) map[sec] = [];
      map[sec].push(sym);
    });
    return SECTOR_ORDER
      .filter(s => map[s])
      .map(s => ({ id: s, sector: s, ...SECTOR_META[s], tickers: map[s] }));
  }, []);

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  const toggleGroup = useCallback((id) => {
    setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const collapseAll = useCallback(() => {
    const next = {};
    brazilEquitySectors.forEach(sg => { next[sg.id] = true; });
    setCollapsedGroups(next);
    setExpandedCards(new Set());
  }, [brazilEquitySectors]);

  const expandAll = useCallback(() => {
    setCollapsedGroups({});
    setExpandedCards(new Set());
  }, []);

  const toggleCard = useCallback((id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Sort toggle ──────────────────────────────────────────────────────────────
  const handleSortClick = useCallback((opt) => {
    if (sortMode !== opt.key) {
      setSortMode(opt.key);
      setSortDir(opt.defaultDir);
    } else {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    }
  }, [sortMode]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const visibleSectors = useMemo(() => {
    if (activeSector === "all") return brazilEquitySectors;
    return brazilEquitySectors.filter(sg => sg.sector === activeSector);
  }, [activeSector, brazilEquitySectors]);

  const allCollapsed = useMemo(() =>
    visibleSectors.length > 0 && visibleSectors.every(sg => collapsedGroups[sg.id]),
  [visibleSectors, collapsedGroups]);

  const sortedSymbols = useCallback((symbols) => {
    const arr = [...symbols];
    if (sortMode === "default") return arr;
    if (sortMode === "alpha") {
      return arr.sort((a, b) => sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a));
    }
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

  const getSortLabel = (opt) => {
    if (sortMode !== opt.key) return opt.label;
    if (opt.key === "alpha") return sortDir === "asc" ? "A→Z" : "Z→A";
    return sortDir === "desc" ? `${opt.label} ▲` : `${opt.label} ▼`;
  };

  const totalTickers = brazilEquitySectors.reduce((n, sg) => n + sg.tickers.length, 0);

  // ── Active section lookup ────────────────────────────────────────────────────
  const currentSection = getSectionById(activeSection);

  // ── Style helpers ────────────────────────────────────────────────────────────
  const btnBase = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.8px", padding: "4px 10px", borderRadius: 4,
    cursor: "pointer", transition: "all 0.15s ease", background: "transparent",
    color: "var(--c-text-2)", border: "1px solid var(--c-border)",
  };
  const btnActive = { background: accentColor, color: "#080f1a", border: `1px solid ${accentColor}` };

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
    <div className="fade-in" style={{ paddingTop: 16 }}>

      {/* Detail panel */}
      {selectedAsset && b3Data?.[selectedAsset] && (
        <BrazilDetailPanel
          symbol={selectedAsset}
          data={b3Data[selectedAsset]}
          onClose={() => setSelectedAsset(null)}
        />
      )}

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
      <MacroStrip macro={macroData} />

      {/* ── SECTION TABS ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {BRAZIL_BLOCKS.find(b => b.blockId === activeBlock)?.sections.map(section => {
          const isActive = activeSection === section.sectionId;
          const count    = activeFilterCount(section.sectionId) +
            (section.sectionId === "acoes-b3" && activeSector !== "all" ? 1 : 0);
          return (
            <button
              key={section.sectionId}
              onClick={() => setActiveSection(section.sectionId)}
              style={{
                position: "relative",
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? accentColor + "1F" : "var(--c-surface)",
                border:     isActive ? `1px solid ${accentColor}55` : "1px solid var(--c-border)",
                color:      isActive ? accentColor : "var(--c-text-2)",
              }}
            >
              {section.icon} {section.label}
              {count > 0 && (
                <span style={{
                  position: "absolute", top: -5, right: -5,
                  width: 14, height: 14, borderRadius: "50%",
                  background: GOLD, color: "#080f1a",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── FILTER BAR ── */}
      <FilterBar
        section={currentSection}
        accentColor={accentColor}
        getFilter={getFilter}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        activeSector={activeSector}
        setActiveSector={setActiveSector}
      />

      {/* ── CONTROLS BAR — only for acoes-b3 ── */}
      {activeSection === "acoes-b3" && (
        <div style={{ marginBottom: 16 }}>
          {/* Row: sort + collapse/expand + view toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            {/* Sort buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginRight: 2 }}>SORT:</span>
              {SORT_OPTS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleSortClick(opt)}
                  style={{ ...btnBase, ...(sortMode === opt.key ? btnActive : {}) }}
                >
                  {getSortLabel(opt)}
                </button>
              ))}
            </div>
            {/* Collapse/expand + view toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={collapseAll} style={btnBase}>▲ Collapse all</button>
              <button onClick={expandAll}   style={btnBase}>▼ Expand all</button>
              <div style={{ width: 1, height: 14, background: "rgba(51,65,85,0.5)", margin: "0 4px" }} />
              <button
                onClick={() => setViewMode("cards")}
                style={{ ...btnBase, ...(viewMode === "cards" ? btnActive : {}), padding: "4px 8px" }}
                title="Card grid"
              >⊞</button>
              <button
                onClick={() => setViewMode("list")}
                style={{ ...btnBase, ...(viewMode === "list" ? btnActive : {}), padding: "4px 8px" }}
                title="List view"
              >☰</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT AREA ── */}
      {activeSection !== "acoes-b3" ? (
        <PlaceholderSection section={currentSection} accentColor={accentColor} />

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
                color: "#F9C300",
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

          {allCollapsed && viewMode === "list" ? (
        /* ── MODE B: COLLAPSED LIST MODE ── */
        <div style={{ marginTop: 8, border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {visibleSectors.map(sg => {
            const stats    = getSectorStats(sg);
            if (stats.count === 0) return null;
            const isOpen   = expandedCards.has(sg.id);
            const pctColor = stats.avgPct > 0 ? "#00E676" : stats.avgPct < 0 ? "#FF5252" : "var(--c-text-3)";
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
                    borderLeft: `3px solid ${isOpen ? accentColor : (stats.avgPct >= 0 ? "#00E676" : "#FF5252")}`,
                    cursor: "pointer", transition: "background 0.15s ease", userSelect: "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--c-text)", flex: 1 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, padding: "12px 0" }}>
          {visibleSectors.map(sg => {
            const stats   = getSectorStats(sg);
            if (stats.count === 0) return null;
            const isOpen  = expandedCards.has(sg.id);

            if (!isOpen) {
              const avg       = stats.avgPct;
              const accentClr = avg > 0 ? "#00d4aa" : avg < 0 ? "#ff6b6b" : "#2a4a6a";
              const pctColor  = avg > 0 ? "#00d4aa" : avg < 0 ? "#ff6b6b" : "#3d6080";
              const pctLabel  = avg > 0 ? `▲ +${avg.toFixed(2)}%` : avg < 0 ? `▼ ${avg.toFixed(2)}%` : "— 0.00%";
              const barWidth  = Math.min(Math.abs(avg) / 5 * 100, 100);
              const fmtMcap   = (mc) => {
                if (!mc) return "—";
                if (mc >= 1e9) return "R$ " + (mc / 1e9).toFixed(1) + "B";
                if (mc >= 1e6) return "R$ " + (mc / 1e6).toFixed(1) + "M";
                return "R$ " + mc.toLocaleString();
              };
              return (
                <div
                  key={sg.id}
                  className="gmt-group-card"
                  onClick={() => toggleCard(sg.id)}
                  style={{
                    position: "relative", overflow: "hidden",
                    background: "#0b1623", border: "0.5px solid #1a2f4a", borderRadius: 4,
                    cursor: "pointer", transition: "border-color 120ms ease, background 120ms ease",
                    padding: "14px 16px",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a4a6a"; e.currentTarget.style.background = "#0d1929"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a2f4a"; e.currentTarget.style.background = "#0b1623"; }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2.5, background: accentClr, borderRadius: "4px 0 0 4px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{sg.icon}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: pctColor }}>{pctLabel}</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#c8d8e8", marginTop: 10, marginBottom: 10 }}>
                    {sg.label.toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>ATIVOS</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{stats.count}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>MKT CAP</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{fmtMcap(stats.totalMcap)}</span>
                    </div>
                  </div>
                  <div style={{ background: "#1a2f4a", borderRadius: 1, height: 2, width: "100%", marginTop: 10 }}>
                    <div style={{ height: 2, borderRadius: 1, width: `${barWidth}%`, background: accentClr, transition: "width 0.3s ease" }} />
                  </div>
                  <span className="gmt-expand-hint" style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#1a3050", letterSpacing: "0.06em", opacity: 0, transition: "opacity 150ms ease", pointerEvents: "none" }}>EXPAND ▾</span>
                </div>
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                      {syms.map(sym => <AssetCard key={sym} symbol={sym} data={b3Data[sym]} onClick={() => setSelectedAsset(sym)} />)}
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
            const avgClr     = avgPct >= 0 ? "#00E676" : "#FF5252";
            const isCollapsed = collapsedGroups[sg.id];
            return (
              <div key={sg.id} className="section-animate" style={{ marginBottom: isCollapsed ? 8 : 24, animationDelay: `${idx * 0.08}s` }}>
                {isCollapsed ? (
                  /* Collapsed row */
                  <div
                    onClick={() => toggleGroup(sg.id)}
                    style={{
                      position: "relative", overflow: "hidden",
                      background: "#0b1623", border: "0.5px solid #1a2f4a", borderRadius: 4,
                      display: "flex", alignItems: "center", gap: 16, padding: "12px 16px 14px",
                      cursor: "pointer", transition: "border-color 120ms ease, background 120ms ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a4a6a"; e.currentTarget.style.background = "#0d1929"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a2f4a"; e.currentTarget.style.background = "#0b1623"; }}
                  >
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2.5, background: avgPct >= 0 ? "#00d4aa" : "#ff6b6b", borderRadius: "4px 0 0 4px" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1a2f4a" }}>
                      <div style={{ height: 2, width: `${Math.min(Math.abs(avgPct) / 5 * 100, 100)}%`, background: avgPct >= 0 ? "#00d4aa" : "#ff6b6b", borderRadius: 1 }} />
                    </div>
                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{sg.icon}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#c8d8e8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sg.label.toUpperCase()}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>ATIVOS</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{syms.length}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: avgPct >= 0 ? "#00d4aa" : "#ff6b6b", flexShrink: 0 }}>
                      {avgPct >= 0 ? `▲ +${avgPct.toFixed(2)}%` : `▼ ${avgPct.toFixed(2)}%`}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#1a3050", letterSpacing: "0.06em", flexShrink: 0 }}>EXPAND ▾</span>
                  </div>
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
          {activeSection === "acoes-b3"
            ? `${totalTickers} ATIVOS · ${brazilEquitySectors.length} SETORES · B3 / BOVESPA`
            : (FOOTER_SECTION_TEXT[activeSection] || "B3 / BOVESPA")}
          {lastUpdate ? ` · ${lastUpdate.toLocaleTimeString()}` : ""}
        </div>
      </div>

    </div>
  );
}
