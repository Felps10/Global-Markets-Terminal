import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createChart, LineSeries, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { useTaxonomy } from '../../context/TaxonomyContext.jsx';
import { API_BASE, fetchYahooOHLCV, fmpProfile } from '../../dataServices.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'];
const CHART_TYPES = ['Candlestick', 'Line', 'Area'];

const BORDER   = 'rgba(30,41,59,0.8)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const BG_PAGE  = '#080f1a';
const BG_SIDE  = '#0d1824';
const BG_HEAD  = '#0a1628';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
const ORANGE   = '#f59e0b';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v, decimals = 2) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPrice(v) {
  if (v == null || isNaN(v)) return '—';
  return v >= 1000
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(2);
}

function fmtLarge(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(2)}M`;
  return v.toLocaleString('en-US');
}

function fmtVol(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

function normalizeToPercent(candles) {
  if (!candles || candles.length === 0) return [];
  const first = candles[0].close ?? candles[0].value;
  if (!first) return [];
  return candles.map(c => ({
    time:  c.time,
    value: ((( c.close ?? c.value) - first) / first) * 100,
  }));
}

// Direct Yahoo quote fetch — single symbol, for sidebar price/volume data.
// Bypasses apiClient complexity since this is on-demand user interaction.
async function fetchSingleQuote(symbol) {
  try {
    const res = await fetch(
      `${API_BASE}/proxy/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      price:     q.regularMarketPrice,
      changePct: q.regularMarketChangePercent,
      volume:    q.regularMarketVolume,
      marketCap: q.marketCap,
    };
  } catch (_) {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:    active ? 'rgba(59,130,246,0.12)' : 'transparent',
        border:        active ? `1px solid rgba(59,130,246,0.4)` : `1px solid transparent`,
        borderRadius:  4,
        color:         active ? ACCENT : TXT_3,
        cursor:        'pointer',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      11,
        fontWeight:    active ? 600 : 400,
        letterSpacing: '0.04em',
        padding:       '4px 10px',
        transition:    'all 0.12s',
      }}
    >
      {label}
    </button>
  );
}

function SidebarRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_1, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChartCenterPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { assets }     = useTaxonomy();

  // Core state
  const [activeAsset, setActiveAsset] = useState(null);
  const [timeframe,   setTimeframe]   = useState('1M');
  const [chartType,   setChartType]   = useState('Candlestick');

  // Data state
  const [ohlcvData,  setOhlcvData]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [quoteData,  setQuoteData]  = useState(null); // { price, changePct, volume, marketCap }
  const [fmpData,    setFmpData]    = useState(null); // { pe, marketCap, ... }

  // Comparison state
  const [compSymbol,   setCompSymbol]   = useState(null);
  const [compData,     setCompData]     = useState(null);
  const [compExpanded, setCompExpanded] = useState(false);
  const [compSearch,   setCompSearch]   = useState('');
  const [compLoading,  setCompLoading]  = useState(false);

  // Search state
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchInputRef  = useRef(null);
  const searchDropRef   = useRef(null);
  const compSearchRef   = useRef(null);

  // Chart refs
  const chartContainerRef = useRef(null);
  const chartRef          = useRef(null);  // lightweight-charts IChartApi
  const mainSeriesRef     = useRef(null);  // main series
  const compSeriesRef     = useRef(null);  // comparison series

  // ── Asset map (symbol → { isB3 }) for Yahoo suffix logic ──────────────────
  const assetMap = useMemo(() => {
    const m = {};
    assets.forEach(a => { m[a.symbol] = { isB3: a.meta?.isB3 || false }; });
    return m;
  }, [assets]);

  // ── Filtered search results ────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return assets
      .filter(a => a.symbol.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [assets, searchQuery]);

  const compSearchResults = useMemo(() => {
    if (!compSearch.trim()) return [];
    const q = compSearch.toLowerCase();
    return assets
      .filter(a =>
        (a.symbol.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q)) &&
        a.symbol !== activeAsset?.symbol
      )
      .slice(0, 8);
  }, [assets, compSearch, activeAsset]);

  // ── Subgroup siblings ─────────────────────────────────────────────────────
  const subgroupAssets = useMemo(() => {
    if (!activeAsset) return [];
    return assets.filter(a => a.subgroup_id === activeAsset.subgroup_id);
  }, [assets, activeAsset]);

  // ── Default asset selection on taxonomy load ───────────────────────────────
  useEffect(() => {
    if (activeAsset || assets.length === 0) return;
    const fromParam = searchParams.get('symbol');
    if (fromParam) {
      const found = assets.find(a => a.symbol === fromParam.toUpperCase());
      if (found) { setActiveAsset(found); return; }
    }
    const spy = assets.find(a => a.symbol === 'SPY');
    setActiveAsset(spy || assets[0]);
  }, [assets, activeAsset, searchParams]);

  // ── Fetch OHLCV when asset or timeframe changes ────────────────────────────
  useEffect(() => {
    if (!activeAsset) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOhlcvData([]);
    // Clear comparison when switching asset
    setCompSymbol(null);
    setCompData(null);

    fetchYahooOHLCV(activeAsset.symbol, timeframe, { assets: assetMap })
      .then(data => {
        if (!cancelled) { setOhlcvData(data); setLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message || 'Chart data unavailable'); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [activeAsset?.symbol, timeframe]);

  // ── Fetch sidebar quote data when asset changes ────────────────────────────
  useEffect(() => {
    if (!activeAsset) return;
    let cancelled = false;
    setQuoteData(null);
    setFmpData(null);

    const symbol = activeAsset.meta?.isB3 ? activeAsset.symbol + '.SA' : activeAsset.symbol;
    fetchSingleQuote(symbol).then(data => {
      if (!cancelled && data) setQuoteData(data);
    });

    fmpProfile(activeAsset.symbol).then(data => {
      if (!cancelled && data) setFmpData(data);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [activeAsset?.symbol]);

  // ── Init lightweight-charts on mount ──────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { color: BG_PAGE },
        textColor:  TXT_2,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#1e2d3d' },
        horzLines: { color: '#1e2d3d' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1e2d3d' },
      timeScale: {
        borderColor:  '#1e2d3d',
        timeVisible:  true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current  = null;
      mainSeriesRef.current = null;
      compSeriesRef.current = null;
    };
  }, []);

  // ── Re-render chart series when data, type, or comparison changes ──────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove existing series
    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current); } catch (_) {}
      mainSeriesRef.current = null;
    }
    if (compSeriesRef.current) {
      try { chart.removeSeries(compSeriesRef.current); } catch (_) {}
      compSeriesRef.current = null;
    }

    if (ohlcvData.length === 0) return;

    if (compData && compData.length > 0) {
      // Comparison mode: both series normalized to % change
      const mainNorm = normalizeToPercent(ohlcvData);
      const compNorm = normalizeToPercent(compData);

      const mainSeries = chart.addSeries(LineSeries, {
        color:     ACCENT,
        lineWidth: 2,
      });
      mainSeries.setData(mainNorm);
      mainSeriesRef.current = mainSeries;

      const cSeries = chart.addSeries(LineSeries, {
        color:     ORANGE,
        lineWidth: 2,
      });
      cSeries.setData(compNorm);
      compSeriesRef.current = cSeries;
    } else {
      // Single asset mode
      let series;
      if (chartType === 'Candlestick') {
        series = chart.addSeries(CandlestickSeries, {
          upColor:        GREEN,
          downColor:      RED,
          wickUpColor:    GREEN,
          wickDownColor:  RED,
          borderVisible:  false,
        });
        series.setData(ohlcvData);
      } else if (chartType === 'Line') {
        series = chart.addSeries(LineSeries, { color: ACCENT, lineWidth: 2 });
        series.setData(ohlcvData.map(c => ({ time: c.time, value: c.close })));
      } else {
        series = chart.addSeries(AreaSeries, {
          topColor:    'rgba(59,130,246,0.3)',
          bottomColor: 'rgba(59,130,246,0.0)',
          lineColor:   ACCENT,
        });
        series.setData(ohlcvData.map(c => ({ time: c.time, value: c.close })));
      }
      mainSeriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [ohlcvData, compData, chartType]);

  // ── Click outside search dropdown ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        searchDropRef.current && !searchDropRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch comparison OHLCV ────────────────────────────────────────────────
  const loadComparison = useCallback(async (asset) => {
    setCompSymbol(asset.symbol);
    setCompLoading(true);
    setCompSearch('');
    try {
      const data = await fetchYahooOHLCV(asset.symbol, timeframe, { assets: assetMap });
      setCompData(data);
    } catch (_) {
      setCompData(null);
    }
    setCompLoading(false);
  }, [timeframe, assetMap]);

  const removeComparison = useCallback(() => {
    setCompSymbol(null);
    setCompData(null);
    setCompLoading(false);
  }, []);

  // ── Active asset switch ────────────────────────────────────────────────────
  const switchAsset = useCallback((asset) => {
    if (asset.symbol === activeAsset?.symbol) return;
    setActiveAsset(asset);
    setSearchQuery('');
    setSearchOpen(false);
  }, [activeAsset]);

  // ── Derived sidebar values ─────────────────────────────────────────────────
  const price     = quoteData?.price     ?? (ohlcvData.length ? ohlcvData[ohlcvData.length - 1].close : null);
  const changePct = quoteData?.changePct ?? null;
  const volume    = quoteData?.volume    ?? (ohlcvData.length ? ohlcvData[ohlcvData.length - 1].volume : null);
  const marketCap = fmpData?.marketCap   ?? quoteData?.marketCap ?? null;
  const pe        = fmpData?.pe          ?? fmpData?.peRatio     ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height:          '100vh',
      display:         'flex',
      flexDirection:   'column',
      background:      BG_PAGE,
      overflow:        'hidden',
      fontFamily:      "'IBM Plex Sans', sans-serif",
    }}>

      {/* ── HEADER BAR ───────────────────────────────────────────── */}
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
        {/* Back */}
        <button
          onClick={() => navigate('/app')}
          style={{
            background:  'transparent',
            border:      'none',
            cursor:      'pointer',
            color:       TXT_3,
            fontFamily:  "'IBM Plex Sans', sans-serif",
            fontSize:    13,
            padding:     '4px 8px',
            borderRadius: 4,
            transition:  'color 0.15s',
            flexShrink:  0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = TXT_2; }}
          onMouseLeave={e => { e.currentTarget.style.color = TXT_3; }}
        >
          ← Terminal
        </button>

        <div style={{ width: 1, height: 20, background: BORDER2 }} />

        {/* Title */}
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      13,
          letterSpacing: '0.14em',
          color:         TXT_2,
          textTransform: 'uppercase',
          flex:          1,
          textAlign:     'center',
        }}>
          Chart Center
        </span>

        {/* GMT_MODULE badge */}
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.14em',
          color:         ORANGE,
          background:    'rgba(245,158,11,0.08)',
          border:        `1px solid rgba(245,158,11,0.3)`,
          borderRadius:  4,
          padding:       '3px 8px',
          textTransform: 'uppercase',
          flexShrink:    0,
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
            placeholder="Search asset... (e.g. AAPL)"
            style={{
              width:       200,
              background:  'rgba(13,24,36,0.8)',
              border:      `1px solid ${BORDER}`,
              borderRadius: 4,
              color:       TXT_1,
              fontFamily:  "'JetBrains Mono', monospace",
              fontSize:    12,
              padding:     '5px 10px',
              outline:     'none',
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position:    'absolute',
              top:         'calc(100% + 4px)',
              right:       0,
              width:       260,
              background:  '#0d1824',
              border:      `1px solid ${BORDER}`,
              borderRadius: 6,
              zIndex:      300,
              maxHeight:   280,
              overflowY:   'auto',
              boxShadow:   '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {searchResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => switchAsset(a)}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        8,
                    width:      '100%',
                    padding:    '9px 14px',
                    background: 'transparent',
                    border:     'none',
                    cursor:     'pointer',
                    textAlign:  'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TXT_1, minWidth: 52 }}>
                    {a.symbol}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY: SIDEBAR + MAIN ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT SIDEBAR ───────────────────────────────────────── */}
        <div style={{
          width:       240,
          flexShrink:  0,
          background:  BG_SIDE,
          borderRight: `1px solid ${BORDER}`,
          display:     'flex',
          flexDirection: 'column',
          overflow:    'hidden',
        }}>
          {/* Asset info panel */}
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {activeAsset ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: TXT_1 }}>
                    {activeAsset.symbol}
                  </span>
                  {activeAsset.exchange && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TXT_3, letterSpacing: '0.1em', marginTop: 3 }}>
                      {activeAsset.exchange}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_2, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeAsset.name || '—'}
                </div>

                {/* Price */}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: TXT_1, marginBottom: 4 }}>
                  {fmtPrice(price)}
                </div>

                {/* % change */}
                {changePct != null ? (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: changePct >= 0 ? GREEN : RED, marginBottom: 12 }}>
                    {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }} />
                )}

                <div style={{ height: 1, background: BORDER, marginBottom: 12 }} />

                <SidebarRow label="Volume"  value={fmtVol(volume)} />
                <SidebarRow label="Mkt Cap" value={fmtLarge(marketCap)} />
                <SidebarRow label="P/E"     value={pe ? fmt(pe, 1) : '—'} />

                {/* Source badges */}
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {quoteData && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TXT_3, background: 'rgba(51,65,85,0.3)', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.08em' }}>
                      YAHOO
                    </span>
                  )}
                  {fmpData && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TXT_3, background: 'rgba(51,65,85,0.3)', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.08em' }}>
                      FMP
                    </span>
                  )}
                  {!fmpData && (
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 9, color: TXT_3, fontStyle: 'italic' }}>
                      FMP unavailable
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TXT_3 }}>Loading...</div>
            )}
          </div>

          {/* Subgroup asset list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
            {subgroupAssets.length > 0 && (
              <>
                <div style={{
                  fontFamily:    "'JetBrains Mono', monospace",
                  fontSize:      10,
                  color:         TXT_3,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  padding:       '0 16px 8px',
                }}>
                  In This Group
                </div>
                {subgroupAssets.map(a => {
                  const isActive = a.symbol === activeAsset?.symbol;
                  return (
                    <button
                      key={a.id}
                      onClick={() => switchAsset(a)}
                      style={{
                        display:     'flex',
                        alignItems:  'center',
                        justifyContent: 'space-between',
                        width:       '100%',
                        padding:     '7px 16px',
                        background:  isActive ? 'rgba(59,130,246,0.06)' : 'transparent',
                        border:      'none',
                        borderLeft:  isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                        cursor:      isActive ? 'default' : 'pointer',
                        textAlign:   'left',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: isActive ? TXT_1 : TXT_2 }}>
                        {a.symbol}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── MAIN CHART AREA ────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Timeframe tabs + chart type toggle */}
          <div style={{
            height:       44,
            flexShrink:   0,
            borderBottom: `1px solid ${BORDER}`,
            display:      'flex',
            alignItems:   'center',
            padding:      '0 16px',
            gap:          6,
            background:   BG_HEAD,
          }}>
            {TIMEFRAMES.map(tf => (
              <TabBtn key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} />
            ))}

            <div style={{ flex: 1 }} />

            {/* Chart type toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              {CHART_TYPES.map(ct => (
                <TabBtn key={ct} label={ct} active={chartType === ct} onClick={() => setChartType(ct)} />
              ))}
            </div>
          </div>

          {/* Chart container — fills remaining height */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>

            {/* Comparison legend overlay */}
            {compSymbol && (
              <div style={{
                position:   'absolute',
                top:        10,
                left:       12,
                zIndex:     10,
                display:    'flex',
                alignItems: 'center',
                gap:        12,
                pointerEvents: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 2, background: ACCENT, borderRadius: 1 }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
                    {activeAsset?.symbol} %Δ
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 2, background: ORANGE, borderRadius: 1 }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
                    {compSymbol} %Δ
                  </span>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div style={{
                position:   'absolute', inset: 0, zIndex: 5,
                display:    'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(8,15,26,0.85)',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: TXT_3, letterSpacing: '0.08em' }}>
                  Loading chart data...
                </span>
              </div>
            )}

            {/* Error overlay */}
            {!loading && error && (
              <div style={{
                position:   'absolute', inset: 0, zIndex: 5,
                display:    'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(8,15,26,0.85)',
                gap:        8,
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: RED }}>
                  Unable to load chart data
                </span>
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, maxWidth: 360, textAlign: 'center' }}>
                  {error}
                </span>
              </div>
            )}

            {/* lightweight-charts mount point */}
            <div
              ref={chartContainerRef}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* ── COMPARISON BAR ───────────────────────────────────── */}
          <div style={{
            flexShrink:  0,
            borderTop:   `1px solid ${BORDER}`,
            background:  BG_HEAD,
          }}>
            {!compExpanded && !compSymbol ? (
              <button
                onClick={() => setCompExpanded(true)}
                style={{
                  width:       '100%',
                  padding:     '10px 16px',
                  background:  'transparent',
                  border:      'none',
                  cursor:      'pointer',
                  color:       TXT_3,
                  fontFamily:  "'JetBrains Mono', monospace",
                  fontSize:    11,
                  letterSpacing: '0.06em',
                  textAlign:   'left',
                  transition:  'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = TXT_2; }}
                onMouseLeave={e => { e.currentTarget.style.color = TXT_3; }}
              >
                + Add comparison
              </button>
            ) : compSymbol ? (
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
                  Comparing: <span style={{ color: ORANGE }}>{compSymbol}</span>
                  {compLoading && <span style={{ color: TXT_3, marginLeft: 8 }}>loading...</span>}
                </span>
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, flex: 1 }}>
                  Showing % change from first data point
                </span>
                <button
                  onClick={removeComparison}
                  style={{
                    background:  'transparent',
                    border:      `1px solid ${BORDER}`,
                    borderRadius: 4,
                    cursor:      'pointer',
                    color:       TXT_3,
                    fontFamily:  "'JetBrains Mono', monospace",
                    fontSize:    11,
                    padding:     '3px 10px',
                    transition:  'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = RED; }}
                  onMouseLeave={e => { e.currentTarget.style.color = TXT_3; e.currentTarget.style.borderColor = BORDER; }}
                >
                  × Remove
                </button>
              </div>
            ) : (
              <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }} ref={compSearchRef}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_3, flexShrink: 0 }}>Compare:</span>
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                  <input
                    autoFocus
                    value={compSearch}
                    onChange={e => setCompSearch(e.target.value)}
                    placeholder="Search symbol..."
                    style={{
                      width:       '100%',
                      background:  'rgba(13,24,36,0.8)',
                      border:      `1px solid ${BORDER}`,
                      borderRadius: 4,
                      color:       TXT_1,
                      fontFamily:  "'JetBrains Mono', monospace",
                      fontSize:    12,
                      padding:     '4px 10px',
                      outline:     'none',
                      boxSizing:   'border-box',
                    }}
                  />
                  {compSearchResults.length > 0 && (
                    <div style={{
                      position:    'absolute',
                      bottom:      'calc(100% + 4px)',
                      left:        0,
                      width:       260,
                      background:  '#0d1824',
                      border:      `1px solid ${BORDER}`,
                      borderRadius: 6,
                      zIndex:      300,
                      maxHeight:   220,
                      overflowY:   'auto',
                      boxShadow:   '0 -8px 24px rgba(0,0,0,0.5)',
                    }}>
                      {compSearchResults.map(a => (
                        <button
                          key={a.id}
                          onClick={() => loadComparison(a)}
                          style={{
                            display:    'flex', alignItems: 'center', gap: 8,
                            width:      '100%', padding: '9px 14px',
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
                <button
                  onClick={() => { setCompExpanded(false); setCompSearch(''); }}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: TXT_3, fontSize: 16, padding: '0 4px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
