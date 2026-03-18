import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxonomy } from '../../context/TaxonomyContext.jsx';
import { fmpProfile, fmpRatios, hasFmpKey } from '../../dataServices.js';
import { isExhausted } from '../../services/quotaTracker.js';

// ─── Colors (match ResearchTerminalPage / ChartCenterPage) ────────────────────
const BORDER  = 'rgba(30,41,59,0.8)';
const BORDER2 = 'rgba(51,65,85,0.5)';
const BG_PAGE = '#080f1a';
const BG_SIDE = '#0d1824';
const BG_HEAD = '#0a1628';
const BG_CARD = '#0d1824';
const TXT_1   = '#e2e8f0';
const TXT_2   = '#94a3b8';
const TXT_3   = '#475569';
const ACCENT  = '#3b82f6';
const GREEN   = '#00E676';
const RED     = '#FF5252';
const ORANGE  = '#f59e0b';
const AMBER   = '#fbbf24';

// ─── Position colors — chip = bar = table header (consistent) ─────────────────
const POS_COLORS = ['#3b82f6', '#f59e0b', '#00E676', '#a855f7', '#FF5252'];

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtNum(v, d = 2) {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
}

function fmtPct(v) {
  if (v == null || isNaN(Number(v))) return '—';
  const pct = Math.abs(Number(v)) <= 2 ? Number(v) * 100 : Number(v);
  return `${pct.toFixed(1)}%`;
}

function fmtLarge(v) {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US')}`;
}

function fmtVol(v) {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function fmtPrice(v) {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  return n >= 1000
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toFixed(2);
}

// ─── METRICS ─────────────────────────────────────────────────────────────────
const METRICS = [
  { key: 'pe',           label: 'P/E Ratio',    fmt: v => fmtNum(v, 1),   src: 'fmp',   thresholds: { low: 15,  high: 35 } },
  { key: 'eps',          label: 'EPS (TTM)',     fmt: v => (v != null && !isNaN(Number(v))) ? `$${fmtNum(v, 2)}` : '—', src: 'fmp', thresholds: null },
  { key: 'roe',          label: 'ROE',           fmt: fmtPct,              src: 'fmp',   thresholds: { low: 15,  high: 30, higherBetter: true } },
  { key: 'debtEquity',   label: 'Debt / Equity', fmt: v => fmtNum(v, 2),   src: 'fmp',   thresholds: { low: 0.5, high: 2 } },
  { key: 'netMargin',    label: 'Net Margin',    fmt: fmtPct,              src: 'fmp',   thresholds: { low: 0,   high: 20, higherBetter: true } },
  { key: 'currentRatio', label: 'Current Ratio', fmt: v => fmtNum(v, 2),   src: 'fmp',   thresholds: { low: 1,   high: 3,  higherBetter: true } },
  { key: 'marketCap',    label: 'Market Cap',    fmt: fmtLarge,            src: 'yahoo', thresholds: null },
  { key: 'price',        label: 'Price',         fmt: fmtPrice,            src: 'yahoo', thresholds: null },
  { key: 'changePct',    label: 'Daily Change',  fmt: v => (v != null && !isNaN(Number(v))) ? `${Number(v) >= 0 ? '+' : ''}${fmtNum(v, 2)}%` : '—', src: 'yahoo', thresholds: null },
  { key: 'volume',       label: 'Volume',        fmt: fmtVol,              src: 'yahoo', thresholds: null },
];

const METRICS_MAP = Object.fromEntries(METRICS.map(m => [m.key, m]));

// ─── Threshold cell coloring ──────────────────────────────────────────────────
function getCellColors(key, value) {
  const m = METRICS_MAP[key];
  if (!m?.thresholds || value == null || isNaN(Number(value))) return {};
  const { low, high, higherBetter } = m.thresholds;
  let v = Number(value);
  // Normalize decimal-form percentages to percentage form for threshold comparison
  if (key === 'roe' || key === 'netMargin') v = Math.abs(v) <= 2 ? v * 100 : v;
  if (higherBetter) {
    if (v > high) return { color: GREEN, background: 'rgba(0,230,118,0.08)' };
    if (v < low)  return { color: RED,   background: 'rgba(255,82,82,0.08)' };
  } else {
    if (v < low)  return { color: GREEN, background: 'rgba(0,230,118,0.08)' };
    if (v > high) return { color: RED,   background: 'rgba(255,82,82,0.08)' };
  }
  return {};
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
const SVG_H      = 280;
const PAD_LEFT   = 64;
const PAD_RIGHT  = 20;
const PAD_TOP    = 28;
const PAD_BOTTOM = 36;

function BarChart({ values, metricKey, width }) {
  const [tooltip, setTooltip] = useState(null);
  const m = METRICS_MAP[metricKey];
  const areaW = Math.max(80, (width || 600) - PAD_LEFT - PAD_RIGHT);
  const areaH = SVG_H - PAD_TOP - PAD_BOTTOM;

  const validValues = values.filter(v => v.value != null && !isNaN(Number(v.value)));
  const hasData     = validValues.length > 0;
  const nums        = hasData ? validValues.map(v => Number(v.value)) : [0, 1];

  let dataMin = Math.min(...nums);
  let dataMax = Math.max(...nums);
  if (dataMin === dataMax) {
    const pad = Math.abs(dataMin) * 0.15 || 0.5;
    dataMin -= pad;
    dataMax += pad;
  }
  const range      = dataMax - dataMin;
  const paddedMin  = dataMin - range * 0.1;
  const paddedMax  = dataMax + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  const scale  = v => areaH - ((Number(v) - paddedMin) / paddedRange) * areaH;
  const zeroY  = Math.max(0, Math.min(areaH, scale(0)));
  const hasNeg = hasData && nums.some(n => n < 0);

  const n      = Math.max(values.length, 1);
  const barGap = 12;
  const barW   = Math.max(20, (areaW - barGap * Math.max(n - 1, 0)) / n);

  const ySteps  = 5;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const v = paddedMin + (paddedRange * i) / (ySteps - 1);
    return { v, y: scale(v) };
  });

  if (values.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width || 600} height={SVG_H} style={{ overflow: 'visible', display: 'block' }}>
        {/* Gridlines + Y labels */}
        {yLabels.map(({ v, y }, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} y1={PAD_TOP + y}
              x2={PAD_LEFT + areaW} y2={PAD_TOP + y}
              stroke={BORDER2} strokeWidth={0.5} strokeDasharray="4,4"
            />
            <text
              x={PAD_LEFT - 6} y={PAD_TOP + y + 4}
              textAnchor="end" fill={TXT_3}
              fontFamily="'JetBrains Mono', monospace" fontSize={9}
            >
              {m?.fmt(v) ?? fmtNum(v, 1)}
            </text>
          </g>
        ))}

        {/* Zero line when negatives exist */}
        {hasNeg && (
          <line
            x1={PAD_LEFT} y1={PAD_TOP + zeroY}
            x2={PAD_LEFT + areaW} y2={PAD_TOP + zeroY}
            stroke={TXT_2} strokeWidth={1}
          />
        )}

        {/* Bars */}
        {values.map((item, i) => {
          const x      = PAD_LEFT + i * (barW + barGap);
          const isNull = item.value == null || isNaN(Number(item.value));

          // Skeleton bar (loading, no data yet)
          if (!isNull && item.loading && !hasData) {
            return (
              <rect key={item.symbol}
                x={x} y={PAD_TOP + areaH * 0.3} width={barW} height={areaH * 0.7}
                fill={BORDER2} opacity={0.5}
                style={{ animation: 'flPulse 1.5s ease-in-out infinite' }}
              />
            );
          }

          // N/A bar
          if (isNull) {
            const naH = areaH * 0.35;
            const naY = PAD_TOP + areaH / 2 - naH / 2;
            return (
              <g key={item.symbol}>
                <rect x={x} y={naY} width={barW} height={naH} fill={TXT_3} opacity={0.2} />
                <text x={x + barW / 2} y={naY - 7}
                  textAnchor="middle" fill={TXT_3}
                  fontFamily="'JetBrains Mono', monospace" fontSize={10}>N/A</text>
                <text x={x + barW / 2} y={PAD_TOP + areaH + 22}
                  textAnchor="middle" fill={TXT_3}
                  fontFamily="'JetBrains Mono', monospace" fontSize={10}>{item.symbol}</text>
              </g>
            );
          }

          const val   = Number(item.value);
          const yVal  = scale(val);
          const yTop  = PAD_TOP + Math.min(yVal, zeroY);
          const bH    = Math.max(2, Math.abs(yVal - zeroY));
          const label = m?.fmt(val) ?? fmtNum(val, 2);

          return (
            <g key={item.symbol}>
              <rect
                x={x} y={yTop} width={barW} height={bH}
                fill={item.color}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => {
                  e.currentTarget.setAttribute('opacity', '0.75');
                  setTooltip({ symbol: item.symbol, value: label, x: x + barW / 2, y: yTop - 10 });
                }}
                onMouseLeave={e => { e.currentTarget.setAttribute('opacity', '1'); setTooltip(null); }}
              />
              <text
                x={x + barW / 2} y={PAD_TOP + Math.min(yVal, zeroY) - 6}
                textAnchor="middle" fill={TXT_1}
                fontFamily="'JetBrains Mono', monospace" fontSize={10}
              >{label}</text>
              <text
                x={x + barW / 2} y={PAD_TOP + areaH + 22}
                textAnchor="middle" fill={item.color}
                fontFamily="'JetBrains Mono', monospace" fontSize={10} fontWeight={600}
              >{item.symbol}</text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x, top: tooltip.y,
          transform: 'translateX(-50%)',
          background: BG_HEAD, border: `1px solid ${BORDER}`,
          borderRadius: 4, padding: '4px 8px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: TXT_1, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 100,
        }}>
          <span style={{ color: TXT_3 }}>{tooltip.symbol}:&nbsp;</span>{tooltip.value}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FundamentalLabPage() {
  const navigate = useNavigate();
  const { subgroups, assets } = useTaxonomy();

  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [assetData,        setAssetData]       = useState({});
  const [activeMetric,     setActiveMetric]    = useState('pe');
  const [searchQuery,      setSearchQuery]     = useState('');
  const [searchOpen,       setSearchOpen]      = useState(false);
  const [maxWarning,       setMaxWarning]      = useState(false);
  const [fmpQuotaWarning,  setFmpQuotaWarning] = useState(false);
  const [expandedSgs,      setExpandedSgs]     = useState({});
  const [isMobile,         setIsMobile]        = useState(window.innerWidth < 900);
  const [mobileOpen,       setMobileOpen]      = useState(false);
  const [chartWidth,       setChartWidth]      = useState(600);

  const searchRef       = useRef(null);
  const chartContainerRef = useRef(null);

  // ── CSS keyframes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = 'fl-page-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes flPulse { 0%,100%{opacity:0.4} 50%{opacity:0.85} }
      @keyframes flSlide { from{transform:translateX(100%)} to{transform:translateX(0)} }
    `;
    document.head.appendChild(s);
    return () => document.getElementById(id)?.remove();
  }, []);

  // ── Resize tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Chart container width (ResizeObserver) ─────────────────────────────────
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setChartWidth(el.clientWidth || 600));
    obs.observe(el);
    setChartWidth(el.clientWidth || 600);
    return () => obs.disconnect();
  }, []);

  // ── Outside click to close search ─────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const assetMap = useMemo(
    () => Object.fromEntries(assets.map(a => [a.symbol, a])),
    [assets]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return assets
      .filter(a => a.symbol?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [assets, searchQuery]);

  // Group the flat subgroups list by parent group name for the browser
  const subgroupsByGroup = useMemo(() => {
    const map = {};
    subgroups.forEach(sg => {
      const g = sg.groupDisplayName || 'Other';
      if (!map[g]) map[g] = [];
      map[g].push(sg);
    });
    return map;
  }, [subgroups]);

  // Bar chart data for the active metric
  const chartValues = useMemo(
    () => selectedSymbols.map((sym, i) => ({
      symbol:  sym,
      value:   assetData[sym]?.[activeMetric] ?? null,
      color:   POS_COLORS[i],
      loading: !!(assetData[sym]?.loadingFmp || assetData[sym]?.loadingYahoo),
    })),
    [selectedSymbols, assetData, activeMetric]
  );

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchYahooQuote = useCallback(async symbol => {
    try {
      const res  = await fetch(
        `/api/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const json = await res.json();
      const q    = json?.quoteResponse?.result?.[0];
      if (!q) throw new Error('No result');
      setAssetData(prev => ({
        ...prev,
        [symbol]: {
          ...prev[symbol],
          price:     q.regularMarketPrice         ?? null,
          changePct: q.regularMarketChangePercent ?? null,
          volume:    q.regularMarketVolume        ?? null,
          marketCap: q.marketCap                  ?? null,
          loadingYahoo: false,
        },
      }));
    } catch {
      setAssetData(prev => ({ ...prev, [symbol]: { ...prev[symbol], loadingYahoo: false } }));
    }
  }, []);

  const fetchFmpData = useCallback(async symbol => {
    if (isExhausted('fmp')) {
      setFmpQuotaWarning(true);
      setAssetData(prev => ({ ...prev, [symbol]: { ...prev[symbol], loadingFmp: false } }));
      return;
    }
    try {
      const [profileRes, ratiosRes] = await Promise.allSettled([
        fmpProfile(symbol),
        fmpRatios(symbol),
      ]);
      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const ratios  = ratiosRes.status  === 'fulfilled' ? ratiosRes.value  : null;
      setAssetData(prev => ({
        ...prev,
        [symbol]: {
          ...prev[symbol],
          // fmpRatios returns peRatio (not pe) and profitMargin (not netMargin)
          pe:           ratios?.peRatio     ?? profile?.pe ?? null,
          eps:          profile?.eps        ?? null,
          roe:          ratios?.roe         ?? null,
          debtEquity:   ratios?.debtEquity  ?? null,
          netMargin:    ratios?.profitMargin ?? null,
          currentRatio: ratios?.currentRatio ?? null,
          loadingFmp:   false,
        },
      }));
    } catch {
      setAssetData(prev => ({ ...prev, [symbol]: { ...prev[symbol], loadingFmp: false } }));
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const addAsset = useCallback((symbol, name) => {
    if (selectedSymbols.includes(symbol)) return;
    if (selectedSymbols.length >= 5) {
      setMaxWarning(true);
      setTimeout(() => setMaxWarning(false), 2000);
      return;
    }
    const assetName = name || assetMap[symbol]?.name || symbol;
    setSelectedSymbols(prev => [...prev, symbol]);
    setSearchQuery('');
    setSearchOpen(false);
    setAssetData(prev => ({
      ...prev,
      [symbol]: { loadingFmp: hasFmpKey(), loadingYahoo: true, error: null, name: assetName },
    }));
    fetchYahooQuote(symbol);
    if (hasFmpKey()) fetchFmpData(symbol);
  }, [selectedSymbols, assetMap, fetchYahooQuote, fetchFmpData]);

  const removeAsset = useCallback(symbol => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
    setAssetData(prev => { const n = { ...prev }; delete n[symbol]; return n; });
  }, []);

  const toggleSg = useCallback(id => {
    setExpandedSgs(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  function exportCsv() {
    const rows = [
      ['Metric', ...selectedSymbols],
      ...METRICS.map(m => [
        m.label,
        ...selectedSymbols.map(sym => {
          const v = assetData[sym]?.[m.key];
          return (v == null || isNaN(Number(v))) ? 'N/A' : m.fmt(v);
        }),
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'fundamental_comparison.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── Shared panel render ────────────────────────────────────────────────────
  function renderPanel(withClose) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Close button — mobile only */}
        {withClose && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px 0', flexShrink: 0 }}>
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TXT_2, fontSize: 20, lineHeight: 1, padding: 4 }}
            >×</button>
          </div>
        )}

        {/* Search input */}
        <div ref={!withClose ? searchRef : null} style={{ padding: withClose ? '8px 12px 0' : '12px 12px 0', position: 'relative', flexShrink: 0 }}>
          {withClose && (
            /* mobile: separate search ref since the desktop one is off-screen */
            <div ref={searchRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
          )}
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Add asset... (max 5)"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
              borderRadius: 4, padding: '7px 10px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              color: TXT_1, outline: 'none',
            }}
          />
          {maxWarning && (
            <div style={{ marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: AMBER }}>
              Maximum 5 assets
            </div>
          )}
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 2px)', left: 12, right: 12, zIndex: 300,
              background: BG_HEAD, border: `1px solid ${BORDER}`, borderRadius: 4,
              maxHeight: 260, overflowY: 'auto',
            }}>
              {searchResults.map(a => (
                <div
                  key={a.symbol}
                  onClick={() => addAsset(a.symbol, a.name)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 8, borderBottom: `1px solid ${BORDER}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                    color: selectedSymbols.includes(a.symbol) ? ACCENT : TXT_1,
                    minWidth: 56, flexShrink: 0,
                  }}>
                    {a.symbol}
                    {selectedSymbols.includes(a.symbol) && <span style={{ color: ACCENT, marginLeft: 4 }}>✓</span>}
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

          {/* Selected asset chips */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
            }}>Comparing</div>

            {selectedSymbols.length === 0 ? (
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3,
                fontStyle: 'italic', lineHeight: 1.6, margin: 0,
              }}>
                Search for an asset above to begin comparing fundamentals.
              </p>
            ) : (
              selectedSymbols.map((sym, i) => {
                const d = assetData[sym];
                const loading = d?.loadingFmp || d?.loadingYahoo;
                return (
                  <div key={sym} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', marginBottom: 4, borderRadius: 4,
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: `3px solid ${POS_COLORS[i]}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          color: TXT_1, fontWeight: 600,
                        }}>{sym}</span>
                        {loading && (
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%', background: ACCENT,
                            display: 'inline-block', animation: 'flPulse 1s ease-in-out infinite',
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {d?.name || assetMap[sym]?.name || sym}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAsset(sym)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: TXT_3, fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = TXT_1}
                      onMouseLeave={e => e.currentTarget.style.color = TXT_3}
                    >×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Subgroup browser */}
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
            }}>Browse by Group</div>

            {Object.entries(subgroupsByGroup).map(([groupName, sgs]) => (
              <div key={groupName} style={{ marginBottom: 10 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_2,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '3px 0 5px', borderBottom: `1px solid ${BORDER}`, marginBottom: 2,
                }}>
                  {groupName}
                </div>

                {sgs.map(sg => (
                  <div key={sg.id}>
                    {/* Subgroup header */}
                    <div
                      onClick={() => toggleSg(sg.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 4px', cursor: 'pointer', borderRadius: 3,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2,
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 9, color: TXT_3, flexShrink: 0 }}>
                        {expandedSgs[sg.id] ? '▾' : '▸'}
                      </span>
                      {sg.icon && <span style={{ fontSize: 12 }}>{sg.icon}</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sg.display_name}
                      </span>
                    </div>

                    {/* Expanded asset list */}
                    {expandedSgs[sg.id] && (
                      <div style={{ paddingLeft: 14, marginBottom: 4 }}>
                        {(sg.assets || []).map(a => {
                          const isSel = selectedSymbols.includes(a.symbol);
                          return (
                            <div
                              key={a.symbol}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 4px', borderRadius: 3,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                                color: isSel ? ACCENT : TXT_1, minWidth: 52, flexShrink: 0,
                              }}>{a.symbol}</span>
                              <span style={{
                                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: TXT_3,
                                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{a.name}</span>
                              {isSel ? (
                                <span style={{ color: GREEN, fontSize: 13, flexShrink: 0, lineHeight: 1 }}>✓</span>
                              ) : (
                                <button
                                  onClick={() => addAsset(a.symbol, a.name)}
                                  style={{
                                    background: 'transparent', border: `1px solid ${BORDER2}`,
                                    borderRadius: 3, cursor: 'pointer', color: TXT_3,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 11, padding: '1px 6px', flexShrink: 0, lineHeight: 1.4,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.color = TXT_1; e.currentTarget.style.borderColor = ACCENT; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = TXT_3; e.currentTarget.style.borderColor = BORDER2; }}
                                >+</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const fmpConnected = hasFmpKey();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: BG_PAGE }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        background: BG_HEAD, borderBottom: `1px solid ${BORDER}`, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: TXT_3, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.color = TXT_2}
          onMouseLeave={e => e.currentTarget.style.color = TXT_3}
        >← Terminal</button>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
          letterSpacing: '2px', color: TXT_2, textTransform: 'uppercase',
        }}>Fundamental Lab</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 4,
                cursor: 'pointer', color: TXT_2, fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, padding: '4px 10px',
              }}
            >Browse Assets</button>
          )}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4,
            ...(fmpConnected
              ? { background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.3)',  color: GREEN }
              : { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', color: AMBER }
            ),
          }}>
            {fmpConnected ? 'FMP CONNECTED' : 'FMP REQUIRED FOR RATIOS'}
          </div>
        </div>
      </div>

      {/* ── Quota warning banner ────────────────────────────────────────────── */}
      {fmpQuotaWarning && (
        <div style={{
          flexShrink: 0, background: 'rgba(245,158,11,0.1)',
          borderBottom: `1px solid rgba(245,158,11,0.3)`,
          padding: '8px 16px', fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12, color: AMBER, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚠</span>
          <span>FMP daily quota reached (250 req/day). Fundamental data unavailable until reset.</span>
          <button
            onClick={() => setFmpQuotaWarning(false)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: AMBER, fontSize: 18, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel — desktop only */}
        {!isMobile && (
          <div style={{
            width: 280, flexShrink: 0,
            background: BG_SIDE, borderRight: `1px solid ${BORDER}`,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {renderPanel(false)}
          </div>
        )}

        {/* Right content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Metric selector bar ─────────────────────────────────────── */}
          <div style={{
            overflowX: 'auto', display: 'flex', gap: 6,
            paddingBottom: 4, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                style={{
                  flexShrink: 0, cursor: 'pointer', borderRadius: 4,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  padding: '5px 10px', border: '1px solid', transition: 'all 0.15s',
                  ...(activeMetric === m.key
                    ? { background: 'rgba(59,130,246,0.15)', borderColor: ACCENT, color: TXT_1 }
                    : { background: 'transparent', borderColor: BORDER, color: TXT_3 }
                  ),
                }}
                onMouseEnter={e => { if (activeMetric !== m.key) e.currentTarget.style.color = TXT_2; }}
                onMouseLeave={e => { if (activeMetric !== m.key) e.currentTarget.style.color = TXT_3; }}
              >{m.label}</button>
            ))}
          </div>

          {/* ── Bar chart card ──────────────────────────────────────────── */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, flexShrink: 0 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              color: TXT_2, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              {METRICS_MAP[activeMetric]?.label ?? activeMetric} — Comparison
            </div>

            <div ref={chartContainerRef}>
              {selectedSymbols.length === 0 ? (
                <div style={{
                  height: SVG_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic',
                }}>
                  Select assets on the left to begin comparison.
                </div>
              ) : (
                <BarChart values={chartValues} metricKey={activeMetric} width={chartWidth} />
              )}
            </div>
          </div>

          {/* ── Comparison table card ───────────────────────────────────── */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                color: TXT_2, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>Full Comparison</div>

              {selectedSymbols.length > 0 && (
                <button
                  onClick={exportCsv}
                  style={{
                    background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 4,
                    cursor: 'pointer', color: TXT_3,
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, padding: '4px 10px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = TXT_1}
                  onMouseLeave={e => e.currentTarget.style.color = TXT_3}
                >↓ Export CSV</button>
              )}
            </div>

            {selectedSymbols.length === 0 ? (
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3,
                fontStyle: 'italic', padding: '24px 0',
              }}>
                Add assets on the left to start comparing.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  borderCollapse: 'collapse', width: '100%',
                  minWidth: 140 + selectedSymbols.length * 120,
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        width: 140, minWidth: 140, position: 'sticky', left: 0, zIndex: 2,
                        background: BG_CARD, padding: '8px 12px', textAlign: 'left',
                        borderBottom: `1px solid ${BORDER}`,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        color: TXT_3, fontWeight: 400, textTransform: 'uppercase',
                      }}>Metric</th>

                      {selectedSymbols.map((sym, i) => (
                        <th key={sym} style={{
                          minWidth: 120, padding: '8px 12px', textAlign: 'right',
                          borderBottom: `1px solid ${BORDER}`, background: BG_CARD,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12, fontWeight: 700, color: POS_COLORS[i],
                        }}>
                          <div>{sym}</div>
                          <div style={{ fontSize: 10, color: TXT_3, fontWeight: 400, marginTop: 2 }}>
                            {assetMap[sym]?.subgroupDisplayName ?? ''}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {METRICS.map((m, ri) => (
                      <tr
                        key={m.key}
                        style={{ background: ri % 2 !== 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = ri % 2 !== 0 ? 'rgba(0,0,0,0.1)' : 'transparent'}
                      >
                        {/* Metric label cell */}
                        <td style={{
                          width: 140, minWidth: 140, position: 'sticky', left: 0, zIndex: 1,
                          background: 'inherit', padding: '8px 12px',
                          borderBottom: `1px solid ${BORDER}`,
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span>{m.label}</span>
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 3,
                              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                              letterSpacing: '0.04em', flexShrink: 0,
                              ...(m.src === 'fmp'
                                ? { background: 'rgba(59,130,246,0.1)',  color: ACCENT, border: `1px solid rgba(59,130,246,0.3)` }
                                : { background: 'rgba(245,158,11,0.1)',  color: ORANGE, border: `1px solid rgba(245,158,11,0.3)` }
                              ),
                            }}>
                              {m.src === 'fmp' ? 'FMP' : 'YAHOO'}
                            </span>
                          </div>
                        </td>

                        {/* Value cells */}
                        {selectedSymbols.map(sym => {
                          const d        = assetData[sym];
                          const val      = d?.[m.key];
                          const loading  = m.src === 'fmp' ? d?.loadingFmp : d?.loadingYahoo;
                          const isNull   = val == null || isNaN(Number(val));
                          const clr      = getCellColors(m.key, val);

                          return (
                            <td key={sym} style={{
                              minWidth: 120, padding: '8px 12px', textAlign: 'right',
                              borderBottom: `1px solid ${BORDER}`,
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                              ...(!isNull ? clr : { color: TXT_3 }),
                            }}>
                              {loading ? (
                                <span style={{
                                  display: 'inline-block', width: 40, height: 10, borderRadius: 2,
                                  background: BORDER2, animation: 'flPulse 1.5s ease-in-out infinite',
                                  verticalAlign: 'middle',
                                }} />
                              ) : isNull ? '—' : m.fmt(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>{/* end right area */}
      </div>{/* end body */}

      {/* ── Mobile slide-over backdrop ──────────────────────────────────────── */}
      {isMobile && mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile slide-over panel ─────────────────────────────────────────── */}
      {isMobile && mobileOpen && (
        <div style={{
          position: 'fixed', right: 0, top: 0, height: '100%', width: 280, zIndex: 300,
          background: BG_SIDE, borderLeft: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          animation: 'flSlide 0.2s ease-out',
        }}>
          {renderPanel(true)}
        </div>
      )}

    </div>
  );
}
