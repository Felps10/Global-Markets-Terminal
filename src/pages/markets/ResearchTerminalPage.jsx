import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createChart, AreaSeries } from 'lightweight-charts';
import { useTaxonomy } from '../../context/TaxonomyContext.jsx';
import {
  fetchYahooOHLCV,
  fmpProfile, fmpRatios,
  finnhubNews, finnhubRecommendation,
  fredAllMacro, bcbMacro, awesomeFx,
  hasFmpKey, hasFinnhubKey,
} from '../../dataServices.js';

// ─── Colours (match ChartCenterPage) ─────────────────────────────────────────
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

// ─── Module-level macro cache (shared across asset switches) ──────────────────
let _macroCache    = null;
let _macroCacheTs  = 0;
const MACRO_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Analyst recommendation categories ───────────────────────────────────────
const REC_CATS = [
  { key: 'strongBuy',  label: 'Strong Buy',  color: GREEN      },
  { key: 'buy',        label: 'Buy',          color: '#4ade80'  },
  { key: 'hold',       label: 'Hold',         color: TXT_2      },
  { key: 'sell',       label: 'Sell',         color: '#fb923c'  },
  { key: 'strongSell', label: 'Strong Sell',  color: RED        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(v) {
  if (v == null || isNaN(v)) return '—';
  return v >= 1000
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(2);
}

function fmtNum(v, decimals = 2) {
  if (v == null || isNaN(v)) return '—';
  return v.toFixed(decimals);
}

function fmtPct(v) {
  // Handles both decimal (0.25) and percentage (25) forms
  if (v == null || isNaN(v)) return '—';
  const pct = Math.abs(v) <= 2 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

function fmtLarge(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString('en-US')}`;
}

function fmtVol(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

function relTime(ts) {
  if (!ts) return '';
  const secs = Math.floor((Date.now() - ts * 1000) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function latestObs(series) {
  const obs = series?.observations;
  if (!obs?.length) return null;
  return obs[obs.length - 1];
}

function fmtFred(series) {
  const obs = latestObs(series);
  if (!obs) return '—';
  const v = parseFloat(obs.value);
  if (isNaN(v)) return '—';
  if (series.unit === '%') return `${v.toFixed(2)}%`;
  if (series.unit === '$B') return `$${(v / 1000).toFixed(1)}T`;
  if (series.unit === '$M') return `$${(v / 1000).toFixed(0)}B`;
  return v.toFixed(1);
}

// Valuation dot color
function valDot(key, value) {
  if (value == null || isNaN(value)) return TXT_3;
  const raw = Math.abs(value) <= 2 ? value * 100 : value;
  const rules = {
    pe:         v => v < 15 ? GREEN : v > 35 ? RED : TXT_2,
    pb:         v => v < 1.5 ? GREEN : v > 5 ? RED : TXT_2,
    debtEquity: v => v < 0.5 ? GREEN : v > 2 ? RED : TXT_2,
    netMargin:  v => v > 20 ? GREEN : v < 0 ? RED : TXT_2,
  };
  return rules[key] ? rules[key](raw) : TXT_3;
}

// Direct Yahoo quote fetch (single symbol, no apiClient overhead)
async function fetchAssetQuote(symbol) {
  try {
    const res = await fetch(
      `/api/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      price:       q.regularMarketPrice,
      change:      q.regularMarketChange,
      changePct:   q.regularMarketChangePercent,
      open:        q.regularMarketOpen,
      prevClose:   q.regularMarketPreviousClose,
      dayHigh:     q.regularMarketDayHigh,
      dayLow:      q.regularMarketDayLow,
      volume:      q.regularMarketVolume,
      avgVolume:   q.averageDailyVolume3Month,
      marketCap:   q.marketCap,
      w52High:     q.fiftyTwoWeekHigh,
      w52Low:      q.fiftyTwoWeekLow,
      beta:        q.beta,
      timestamp:   q.regularMarketTime,
    };
  } catch (_) { return null; }
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function PanelTitle({ children }) {
  return (
    <div style={{
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      10,
      fontWeight:    600,
      color:         TXT_3,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom:  12,
    }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: color || TXT_1 }}>
        {value}
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background:   BG_CARD,
      border:       `1px solid ${BORDER}`,
      borderRadius: 6,
      padding:      16,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Skeleton({ height = 14, width = '60%', mb = 8 }) {
  return (
    <div style={{
      height, width, marginBottom: mb,
      background:    'rgba(51,65,85,0.2)',
      borderRadius:  3,
      animation:     'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function SourcePill({ label, color }) {
  return (
    <span style={{
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      9,
      color,
      background:    `${color}18`,
      border:        `1px solid ${color}44`,
      borderRadius:  3,
      padding:       '1px 6px',
      letterSpacing: '0.08em',
      marginRight:   4,
    }}>
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResearchTerminalPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { assets }     = useTaxonomy();

  // Active asset
  const [activeSymbol, setActiveSymbol] = useState('SPY');
  const [activeAsset,  setActiveAsset]  = useState(null);

  // Data states
  const [priceData,   setPriceData]   = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [ratiosData,  setRatiosData]  = useState(null);
  const [newsData,    setNewsData]    = useState(null);
  const [recData,     setRecData]     = useState(null);
  const [macroData,   setMacroData]   = useState(null);
  const [chartData,   setChartData]   = useState(null);

  // Loading flags
  const [loadingPrice,  setLoadingPrice]  = useState(true);
  const [loadingFunds,  setLoadingFunds]  = useState(true);
  const [loadingNews,   setLoadingNews]   = useState(true);
  const [loadingMacro,  setLoadingMacro]  = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const searchInputRef = useRef(null);
  const searchDropRef  = useRef(null);

  // Mini chart refs
  const miniContainerRef     = useRef(null);
  const miniChartRef         = useRef(null);
  const miniSeriesRef        = useRef(null);

  // Responsive
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Resolve active asset from taxonomy ────────────────────────────────────
  useEffect(() => {
    if (!assets.length) return;
    const fromParam = searchParams.get('symbol');
    if (fromParam) {
      const found = assets.find(a => a.symbol === fromParam.toUpperCase());
      if (found) { setActiveSymbol(found.symbol); return; }
    }
    const spy = assets.find(a => a.symbol === 'SPY');
    if (spy && activeSymbol === 'SPY') setActiveAsset(spy);
  }, [assets]);

  useEffect(() => {
    const found = assets.find(a => a.symbol === activeSymbol);
    setActiveAsset(found || null);
  }, [activeSymbol, assets]);

  // ── Siblings in same subgroup ─────────────────────────────────────────────
  const siblings = useMemo(() => {
    if (!activeAsset) return [];
    return assets.filter(a => a.subgroup_id === activeAsset.subgroup_id);
  }, [assets, activeAsset]);

  // ── Search results ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return assets
      .filter(a => a.symbol.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [assets, searchQuery]);

  // ── Click outside search close ────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (
        searchDropRef.current && !searchDropRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) setSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Main data fetch on activeSymbol change ────────────────────────────────
  useEffect(() => {
    if (!activeSymbol) return;
    let cancelled = false;

    // Reset
    setPriceData(null); setProfileData(null); setRatiosData(null);
    setNewsData(null);  setRecData(null);     setChartData(null);
    setLoadingPrice(true); setLoadingFunds(true); setLoadingNews(true);

    // Yahoo quote for price panel
    const yahooSymbol = activeAsset?.meta?.isB3 ? activeSymbol + '.SA' : activeSymbol;
    fetchAssetQuote(yahooSymbol).then(d => {
      if (!cancelled) { setPriceData(d); setLoadingPrice(false); }
    }).catch(() => { if (!cancelled) setLoadingPrice(false); });

    // OHLCV for mini chart
    fetchYahooOHLCV(activeSymbol, '1M').then(d => {
      if (!cancelled) setChartData(d);
    }).catch(() => {});

    // FMP fundamentals
    if (hasFmpKey()) {
      Promise.allSettled([fmpProfile(activeSymbol), fmpRatios(activeSymbol)])
        .then(([p, r]) => {
          if (!cancelled) {
            if (p.status === 'fulfilled') setProfileData(p.value);
            if (r.status === 'fulfilled') setRatiosData(r.value);
            setLoadingFunds(false);
          }
        });
    } else {
      setLoadingFunds(false);
    }

    // Finnhub news & recommendations
    if (hasFinnhubKey()) {
      Promise.allSettled([finnhubNews(activeSymbol), finnhubRecommendation(activeSymbol)])
        .then(([n, r]) => {
          if (!cancelled) {
            if (n.status === 'fulfilled') setNewsData(n.value);
            if (r.status === 'fulfilled') setRecData(r.value);
            setLoadingNews(false);
          }
        });
    } else {
      setLoadingNews(false);
    }

    // Macro data (module-level cache, 10-min TTL)
    if (_macroCache && Date.now() - _macroCacheTs < MACRO_TTL_MS) {
      setMacroData(_macroCache);
      setLoadingMacro(false);
    } else {
      setLoadingMacro(true);
      Promise.all([
        fredAllMacro().catch(() => null),
        bcbMacro().catch(() => null),
        awesomeFx().catch(() => null),
      ]).then(([fred, bcb, fx]) => {
        if (!cancelled) {
          const macro = { fred, bcb, fx };
          _macroCache   = macro;
          _macroCacheTs = Date.now();
          setMacroData(macro);
          setLoadingMacro(false);
        }
      });
    }

    return () => { cancelled = true; };
  }, [activeSymbol]);

  // ── Mini chart: init once ─────────────────────────────────────────────────
  useEffect(() => {
    if (!miniContainerRef.current) return;
    const chart = createChart(miniContainerRef.current, {
      autoSize:    true,
      layout:      { background: { color: BG_PAGE }, textColor: TXT_2, fontFamily: "'JetBrains Mono', monospace" },
      grid:        { vertLines: { color: '#1e2d3d' }, horzLines: { color: '#1e2d3d' } },
      crosshair:   { mode: 1 },
      rightPriceScale: { borderColor: '#1e2d3d' },
      timeScale:   { borderColor: '#1e2d3d', timeVisible: false },
      handleScroll: false,
      handleScale:  false,
    });
    miniChartRef.current = chart;
    return () => {
      chart.remove();
      miniChartRef.current  = null;
      miniSeriesRef.current = null;
    };
  }, []);

  // ── Mini chart: update series when chartData changes ──────────────────────
  useEffect(() => {
    const chart = miniChartRef.current;
    if (!chart || !chartData?.length) return;
    if (miniSeriesRef.current) {
      try { chart.removeSeries(miniSeriesRef.current); } catch (_) {}
      miniSeriesRef.current = null;
    }
    const series = chart.addSeries(AreaSeries, {
      topColor:    'rgba(59,130,246,0.25)',
      bottomColor: 'rgba(59,130,246,0.0)',
      lineColor:   ACCENT,
      lineWidth:   2,
    });
    series.setData(chartData.map(c => ({ time: c.time, value: c.close })));
    chart.timeScale().fitContent();
    miniSeriesRef.current = series;
  }, [chartData]);

  // ── Switch asset ──────────────────────────────────────────────────────────
  function switchSymbol(sym) {
    if (sym === activeSymbol) return;
    setActiveSymbol(sym);
    setSearchQuery('');
    setSearchOpen(false);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const changePct   = priceData?.changePct;
  const isPositive  = changePct != null && changePct >= 0;
  const changeColor = changePct == null ? TXT_1 : isPositive ? GREEN : RED;

  // Exchange badge
  const exchangeBadge = activeAsset?.meta?.isB3
    ? 'B3' : activeAsset?.meta?.isCrypto
    ? 'CRYPTO' : activeAsset?.exchange || '—';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height:        '100vh',
      display:       'flex',
      flexDirection: 'column',
      background:    BG_PAGE,
      overflow:      'hidden',
      fontFamily:    "'IBM Plex Sans', sans-serif",
    }}>
      {/* Pulse animation for skeletons */}
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div style={{
        height:       48,
        flexShrink:   0,
        background:   BG_HEAD,
        borderBottom: `1px solid ${BORDER}`,
        display:      'flex',
        alignItems:   'center',
        padding:      '0 20px',
        gap:          16,
        zIndex:       10,
      }}>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: TXT_3, fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13, padding: '4px 8px', borderRadius: 4, transition: 'color 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = TXT_2; }}
          onMouseLeave={e => { e.currentTarget.style.color = TXT_3; }}
        >
          ← Terminal
        </button>

        <div style={{ width: 1, height: 20, background: BORDER2 }} />

        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
          letterSpacing: '0.14em', color: TXT_2, textTransform: 'uppercase',
          flex: 1, textAlign: 'center',
        }}>
          Research Terminal
        </span>

        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.14em', color: ORANGE, background: 'rgba(245,158,11,0.08)',
          border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 4,
          padding: '3px 8px', textTransform: 'uppercase', flexShrink: 0,
        }}>
          GMT_MODULE
        </span>

        <div style={{ width: 1, height: 20, background: BORDER2 }} />

        {/* Asset search */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={searchDropRef}>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => { if (searchQuery) setSearchOpen(true); }}
            placeholder="Search asset..."
            style={{
              width: isMobile ? 140 : 200, background: 'rgba(13,24,36,0.8)',
              border: `1px solid ${BORDER}`, borderRadius: 4, color: TXT_1,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              padding: '5px 10px', outline: 'none',
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0,
              width: 260, background: BG_SIDE, border: `1px solid ${BORDER}`,
              borderRadius: 6, zIndex: 300, maxHeight: 280, overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {searchResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => switchSymbol(a.symbol)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TXT_1, minWidth: 52 }}>{a.symbol}</span>
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT COLUMN ────────────────────────────────────────── */}
        {!isMobile && (
          <div style={{
            width: 220, flexShrink: 0, background: BG_SIDE,
            borderRight: `1px solid ${BORDER}`, display: 'flex',
            flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Asset identity */}
            <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              {/* Exchange badge */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.12em', color: ACCENT, background: 'rgba(59,130,246,0.1)',
                border: `1px solid rgba(59,130,246,0.3)`, borderRadius: 3,
                padding: '2px 6px', display: 'inline-block', marginBottom: 8,
              }}>
                {exchangeBadge}
              </span>

              {/* Symbol */}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 18,
                fontWeight: 700, color: TXT_1, marginBottom: 4,
              }}>
                {activeAsset?.symbol || activeSymbol}
              </div>

              {/* Full name */}
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_2,
                marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {activeAsset?.name || '—'}
              </div>

              {/* Subgroup & group labels */}
              {activeAsset?.subgroup_id && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: 2,
                }}>
                  {activeAsset.subgroup_id.replace(/-/g, ' ')}
                </div>
              )}
              {activeAsset?.group_id && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {activeAsset.group_id}
                </div>
              )}
            </div>

            {/* Sibling asset list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: TXT_3, letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '0 16px 8px',
              }}>
                In Group
              </div>
              {siblings.map(a => {
                const isActive = a.symbol === activeSymbol;
                const pct = isActive && priceData?.changePct != null ? priceData.changePct : null;
                return (
                  <button
                    key={a.id}
                    onClick={() => switchSymbol(a.symbol)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '6px 16px',
                      background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent',
                      border: 'none', borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                      cursor: isActive ? 'default' : 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isActive ? TXT_1 : TXT_2 }}>
                      {a.symbol}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: pct == null ? TXT_3 : pct >= 0 ? GREEN : RED }}>
                      {pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CONTENT AREA ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1400 }}>

            {/* ROW 1: Price + Fundamentals */}
            <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

              {/* ── PRICE PANEL ──────────────────────────────────── */}
              <Card style={{ flex: 55 }}>
                <PanelTitle>Price &amp; Market Data</PanelTitle>

                {loadingPrice ? (
                  <>
                    <Skeleton height={36} width="50%" mb={8} />
                    <Skeleton height={18} width="30%" mb={20} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {[...Array(8)].map((_, i) => <Skeleton key={i} height={40} width="90%" mb={0} />)}
                    </div>
                  </>
                ) : priceData ? (
                  <>
                    {/* Primary price */}
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: TXT_1, lineHeight: 1.1, marginBottom: 4 }}>
                      {fmtPrice(priceData.price)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: changeColor }}>
                        {changePct != null ? `${isPositive ? '▲ +' : '▼ '}${priceData.change?.toFixed(2)} (${Math.abs(changePct).toFixed(2)}%)` : '—'}
                      </span>
                    </div>
                    {priceData.timestamp && (
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, marginBottom: 14 }}>
                        As of {new Date(priceData.timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                      </div>
                    )}

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      <StatBox label="Open"       value={fmtPrice(priceData.open)} />
                      <StatBox label="Prev Close"  value={fmtPrice(priceData.prevClose)} />
                      <StatBox label="Day High"    value={fmtPrice(priceData.dayHigh)} />
                      <StatBox label="Day Low"     value={fmtPrice(priceData.dayLow)} />
                      <StatBox label="52W High"    value={fmtPrice(priceData.w52High)} />
                      <StatBox label="52W Low"     value={fmtPrice(priceData.w52Low)} />
                      <StatBox label="Volume"      value={fmtVol(priceData.volume)} />
                      <StatBox label="Avg Volume"  value={fmtVol(priceData.avgVolume)} />
                      <StatBox label="Market Cap"  value={fmtLarge(priceData.marketCap ?? profileData?.marketCap)} />
                      <StatBox label="Beta"        value={fmtNum(priceData.beta ?? profileData?.beta)} />
                    </div>

                    {/* Source pills */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <SourcePill label="YAHOO" color={ACCENT} />
                      {profileData && <SourcePill label="FMP" color="#22c55e" />}
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: TXT_3 }}>
                    Unable to load price data
                  </div>
                )}
              </Card>

              {/* ── FUNDAMENTALS PANEL ───────────────────────────── */}
              <Card style={{ flex: 45 }}>
                <PanelTitle>Fundamentals</PanelTitle>

                {!hasFmpKey() ? (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    FMP key required for fundamental data.
                    <br /><br />
                    Set <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>VITE_FMP_KEY</code> in your <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>.env.local</code> to enable.
                  </div>
                ) : loadingFunds ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                    {[...Array(12)].map((_, i) => <Skeleton key={i} height={38} width="90%" mb={0} />)}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                      {[
                        { label: 'P/E (TTM)',      key: 'pe',         val: ratiosData?.peRatio ?? profileData?.pe,     fmt: v => fmtNum(v, 1) },
                        { label: 'EPS (TTM)',       key: null,         val: profileData?.eps,                           fmt: v => `$${fmtNum(v, 2)}` },
                        { label: 'ROE',             key: null,         val: ratiosData?.roe,                            fmt: fmtPct },
                        { label: 'Debt/Equity',     key: 'debtEquity', val: ratiosData?.debtEquity,                     fmt: v => fmtNum(v, 2) },
                        { label: 'Net Margin',      key: 'netMargin',  val: ratiosData?.profitMargin,                   fmt: fmtPct },
                        { label: 'Current Ratio',   key: null,         val: ratiosData?.currentRatio,                   fmt: v => fmtNum(v, 2) },
                        { label: 'Beta',            key: null,         val: profileData?.beta ?? priceData?.beta,       fmt: v => fmtNum(v, 2) },
                        { label: 'Dividend',        key: null,         val: profileData?.lastDiv,                       fmt: v => `$${fmtNum(v, 2)}` },
                        { label: 'P/E Ratio',       key: 'pe',         val: profileData?.pe,                            fmt: v => fmtNum(v, 1) },
                        { label: 'P/B Ratio',       key: 'pb',         val: null,                                       fmt: () => '—' },
                        { label: 'EV/EBITDA',       key: null,         val: null,                                       fmt: () => '—' },
                        { label: 'Price/Sales',     key: null,         val: null,                                       fmt: () => '—' },
                      ].filter((m, i) => {
                        // Deduplicate P/E — show ratiosData version if available
                        if (i === 8 && (ratiosData?.peRatio != null || profileData?.pe != null)) return false;
                        return true;
                      }).map(m => {
                        const v   = m.val;
                        const dot = m.key ? valDot(m.key, v) : TXT_3;
                        return (
                          <div key={m.label} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {m.label}
                              </span>
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: TXT_1, paddingLeft: 11 }}>
                              {v != null ? m.fmt(v) : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Company profile block */}
                    {profileData && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                        {profileData.sector && (
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, marginBottom: 4 }}>
                            <span style={{ color: TXT_2 }}>{profileData.sector}</span>
                            {profileData.industry && <span> · {profileData.industry}</span>}
                          </div>
                        )}
                        {profileData.description && (
                          <div style={{
                            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3,
                            display: '-webkit-box', WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5,
                          }}>
                            {profileData.description}
                          </div>
                        )}
                      </div>
                    )}

                    {!ratiosData && !profileData && (
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                        FMP data unavailable for this symbol.
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            {/* ── MINI CHART ──────────────────────────────────────── */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px 8px',
              }}>
                <PanelTitle>Price History — 1M</PanelTitle>
                <button
                  onClick={() => navigate(`/markets/chart?symbol=${activeSymbol}`)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
                    color: ACCENT, padding: '2px 0', marginBottom: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Open in Chart Center →
                </button>
              </div>
              <div style={{ height: 200, position: 'relative' }}>
                {!chartData && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TXT_3 }}>
                      Loading chart...
                    </span>
                  </div>
                )}
                <div ref={miniContainerRef} style={{ width: '100%', height: '100%' }} />
              </div>
            </Card>

            {/* ROW 2: Analyst + News */}
            <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

              {/* ── ANALYST PANEL ────────────────────────────────── */}
              <Card style={{ flex: 40 }}>
                <PanelTitle>Analyst Consensus</PanelTitle>

                {!hasFinnhubKey() ? (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    Finnhub key required for analyst data.<br /><br />
                    Set <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>VITE_FINNHUB_KEY</code> in your <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>.env.local</code> to enable.
                  </div>
                ) : loadingNews ? (
                  <>
                    <Skeleton height={24} width="100%" mb={8} />
                    <Skeleton height={14} width="60%" mb={12} />
                    <Skeleton height={40} width="70%" mb={0} />
                  </>
                ) : recData ? (
                  (() => {
                    const total = REC_CATS.reduce((s, c) => s + (recData[c.key] || 0), 0);
                    const maxCat = REC_CATS.reduce((a, b) =>
                      (recData[a.key] || 0) >= (recData[b.key] || 0) ? a : b
                    );
                    return (
                      <>
                        {/* Segment bar */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                            {REC_CATS.map(cat => {
                              const cnt = recData[cat.key] || 0;
                              if (!cnt || !total) return null;
                              return (
                                <div
                                  key={cat.key}
                                  style={{ flex: cnt, background: cat.color, position: 'relative' }}
                                  title={`${cat.label}: ${cnt}`}
                                />
                              );
                            })}
                          </div>
                          {/* Labels */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {REC_CATS.map(cat => {
                              const cnt = recData[cat.key] || 0;
                              return (
                                <div key={cat.key} style={{ textAlign: 'center', flex: 1 }}>
                                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: cat.color, fontWeight: 600 }}>{cnt}</div>
                                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: TXT_3, letterSpacing: '0.04em' }}>{cat.label.split(' ')[0]}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, marginBottom: 12 }}>
                          Based on {total} analyst{total !== 1 ? 's' : ''}
                        </div>

                        {/* Consensus badge */}
                        <div style={{
                          display: 'inline-block',
                          background: `${maxCat.color}18`,
                          border: `1px solid ${maxCat.color}44`,
                          borderRadius: 6, padding: '8px 16px',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 14, fontWeight: 700,
                          color: maxCat.color, letterSpacing: '0.08em',
                          marginBottom: 8,
                        }}>
                          {maxCat.label.toUpperCase()}
                        </div>

                        {recData.period && (
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3 }}>
                            Period: {recData.period?.slice(0, 7)}
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    No analyst data available for {activeSymbol}.
                  </div>
                )}
              </Card>

              {/* ── NEWS PANEL ───────────────────────────────────── */}
              <Card style={{ flex: 60 }}>
                <PanelTitle>Latest News</PanelTitle>

                {!hasFinnhubKey() ? (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    Finnhub key required for news data.<br /><br />
                    Set <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>VITE_FINNHUB_KEY</code> in your <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>.env.local</code> to enable.
                  </div>
                ) : loadingNews ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <Skeleton height={14} width="90%" mb={4} />
                      <Skeleton height={14} width="70%" mb={4} />
                      <Skeleton height={10} width="40%" mb={0} />
                    </div>
                  ))
                ) : newsData?.length ? (
                  <div>
                    {newsData.slice(0, 6).map((item, i) => (
                      <div key={i}>
                        {i > 0 && <div style={{ height: 1, background: BORDER, margin: '10px 0' }} />}
                        <div
                          onClick={() => window.open(item.url, '_blank')}
                          style={{ cursor: 'pointer', padding: '4px 0' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderRadius = '4px'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{
                            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: TXT_1,
                            lineHeight: 1.45, marginBottom: 5,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {item.headline}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3 }}>
                            {item.source && <span style={{ color: TXT_2 }}>{item.source}</span>}
                            {item.datetime && <span> · {relTime(item.datetime)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{
                      marginTop: 12, fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 10, color: '#334155',
                    }}>
                      Powered by Finnhub
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    No recent news for {activeSymbol}.
                  </div>
                )}
              </Card>
            </div>

            {/* ── MACRO CONTEXT PANEL ─────────────────────────────── */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <PanelTitle>Macro Context</PanelTitle>
                {macroData && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3 }}>
                    Updated {new Date(_macroCacheTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {loadingMacro ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[...Array(8)].map((_, i) => <Skeleton key={i} height={40} width="80%" mb={0} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 32, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

                  {/* US Macro */}
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                      color: TXT_3, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12,
                    }}>
                      United States
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      {[
                        { key: 'fedRate',           label: 'Fed Funds Rate',  tint: v => parseFloat(v?.observations?.at(-1)?.value) > 5 ? AMBER : null },
                        { key: 'cpi',               label: 'CPI Index',       tint: null },
                        { key: 'unemployment',      label: 'Unemployment',    tint: v => parseFloat(v?.observations?.at(-1)?.value) > 5 ? AMBER : null },
                        { key: 'treasury10y',       label: '10Y Treasury',    tint: null },
                        { key: 'gdp',               label: 'GDP',             tint: null },
                        { key: 'consumerSentiment', label: 'Consumer Senti.', tint: null },
                      ].map(({ key, label, tint }) => {
                        const series = macroData?.fred?.[key];
                        const val    = fmtFred(series);
                        const color  = tint ? tint(series) : null;
                        return (
                          <div key={key} style={{ marginBottom: 8 }}>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                              {label}
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: color || TXT_1 }}>
                              {series ? val : <span style={{ color: TXT_3, fontSize: 12 }}>—</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ width: 1, background: BORDER, flexShrink: 0 }} />

                  {/* Brazil Macro */}
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                      color: TXT_3, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12,
                    }}>
                      Brazil
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      {[
                        { label: 'SELIC Rate',    val: macroData?.bcb?.selic != null ? `${macroData.bcb.selic.toFixed(2)}%` : '—', tint: macroData?.bcb?.selic > 10 ? AMBER : null },
                        { label: 'IPCA',          val: macroData?.bcb?.ipca  != null ? `${macroData.bcb.ipca.toFixed(2)}` : '—',   tint: null },
                        { label: 'CDI Rate',      val: macroData?.bcb?.cdi   != null ? `${macroData.bcb.cdi.toFixed(2)}%` : '—',   tint: null },
                        { label: 'USD/BRL',       val: macroData?.fx?.usdBrl != null ? `R$${macroData.fx.usdBrl.toFixed(2)}` : '—', tint: null },
                      ].map(({ label, val, tint }) => (
                        <div key={label} style={{ marginBottom: 8 }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                            {label}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: tint || TXT_1 }}>
                            {val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
