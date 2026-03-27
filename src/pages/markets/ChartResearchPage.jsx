import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import MarketsPageLayout from '../../components/MarketsPageLayout.jsx';
import { useTaxonomy } from '../../context/TaxonomyContext.jsx';
import { useWatchlist } from '../../context/WatchlistContext.jsx';
import {
  API_BASE,
  fetchYahooOHLCV,
  fmpProfile, fmpRatios,
  finnhubNews, finnhubRecommendation,
  hasFmpKey, hasFinnhubKey,
} from '../../dataServices.js';

// ─── Constants ──────────────────────────────────────────────────────────────

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

const TIMEFRAMES  = ['1D', '1W', '1M', '3M', '1Y'];
const CHART_TYPES = ['Candlestick', 'Line', 'Area'];
const COMP_COLORS = ['#f59e0b', '#00E676', '#a78bfa'];
const DEFAULT_CHART_HEIGHT = 450;
const MIN_CHART_HEIGHT = 200;

const REC_CATS = [
  { key: 'strongBuy',  label: 'Strong Buy',  color: GREEN     },
  { key: 'buy',        label: 'Buy',          color: '#4ade80' },
  { key: 'hold',       label: 'Hold',         color: TXT_2     },
  { key: 'sell',       label: 'Sell',         color: '#fb923c' },
  { key: 'strongSell', label: 'Strong Sell',  color: RED       },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchAssetQuote(symbol) {
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
      change:    q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      open:      q.regularMarketOpen,
      prevClose: q.regularMarketPreviousClose,
      dayHigh:   q.regularMarketDayHigh,
      dayLow:    q.regularMarketDayLow,
      volume:    q.regularMarketVolume,
      avgVolume: q.averageDailyVolume3Month,
      marketCap: q.marketCap,
      w52High:   q.fiftyTwoWeekHigh,
      w52Low:    q.fiftyTwoWeekLow,
      beta:      q.beta,
      timestamp: q.regularMarketTime,
    };
  } catch (_) { return null; }
}

function normalizeToPercent(candles) {
  if (!candles || candles.length === 0) return [];
  const first = candles[0].close ?? candles[0].value;
  if (!first) return [];
  return candles.map(c => ({
    time:  c.time,
    value: (((c.close ?? c.value) - first) / first) * 100,
  }));
}

function fmtPrice(v) {
  if (v == null || isNaN(v)) return '—';
  return v >= 1000
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(2);
}

function fmtNum(v, decimals = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(decimals);
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  const pct = Math.abs(v) <= 2 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

function fmtLarge(v) {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US')}`;
}

function fmtVol(v) {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function relTime(ts) {
  if (!ts) return '';
  const secs = Math.floor((Date.now() - ts * 1000) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

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

// ─── Sub-components ─────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        background:    active ? 'rgba(59,130,246,0.12)' : 'transparent',
        border:        active ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
        borderRadius:  4,
        color:         disabled ? '#334155' : active ? ACCENT : TXT_3,
        cursor:        disabled ? 'not-allowed' : 'pointer',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      11,
        fontWeight:    active ? 600 : 400,
        letterSpacing: '0.04em',
        padding:       '4px 10px',
        transition:    'all 0.12s',
        opacity:       disabled ? 0.5 : 1,
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

function Card({ children, style }) {
  return (
    <div style={{
      background:   BG_CARD,
      border:       `1px solid ${BORDER}`,
      borderRadius: 6,
      padding:      12,
      ...style,
    }}>
      {children}
    </div>
  );
}

function PanelTitle({ children }) {
  return (
    <div style={{
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      11,
      fontWeight:    700,
      color:         TXT_1,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      marginBottom:  12,
    }}>
      {children}
    </div>
  );
}

function Skeleton({ height = 14, width = '60%', mb = 8 }) {
  return (
    <div style={{
      height, width, marginBottom: mb,
      background: 'rgba(255,255,255,0.04)', borderRadius: 4,
      animation: 'pulse 2s infinite',
    }} />
  );
}

function SourcePill({ label, color }) {
  return (
    <span style={{
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      9,
      fontWeight:    600,
      color:         color,
      background:    `${color}18`,
      border:        `1px solid ${color}44`,
      borderRadius:  3,
      padding:       '3px 8px',
      display:       'inline-block',
      letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: color || TXT_1 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ChartResearchPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { assets, subgroups } = useTaxonomy();
  const { items: watchlistItems, isPinned, pin, unpin } = useWatchlist();

  // ── Active asset ──────────────────────────────────────────────────────────
  const [activeSymbol, setActiveSymbol] = useState('SPY');
  const [activeAsset,  setActiveAsset]  = useState(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchOpen,   setSearchOpen]   = useState(false);
  const searchInputRef  = useRef(null);
  const searchDropRef   = useRef(null);

  // ── Chart ─────────────────────────────────────────────────────────────────
  const [timeframe,    setTimeframe]    = useState('3M');
  const [chartType,    setChartType]    = useState('Candlestick');
  const [ohlcvData,    setOhlcvData]    = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError,   setChartError]   = useState(null);
  const chartContainerRef = useRef(null);
  const chartRef          = useRef(null);
  const mainSeriesRef     = useRef(null);

  // ── Comparison (up to 3) ──────────────────────────────────────────────────
  const [compSymbols,  setCompSymbols]  = useState([]);   // ['MSFT', 'GOOGL']
  const [compData,     setCompData]     = useState({});    // { MSFT: [...], GOOGL: [...] }
  const [compExpanded, setCompExpanded] = useState(false);
  const [compSearch,   setCompSearch]   = useState('');
  const [compLoading,  setCompLoading]  = useState(false);
  const compSeriesRefs = useRef([]);
  const compSearchRef  = useRef(null);

  // ── Sidebar data ──────────────────────────────────────────────────────────
  const [priceData,    setPriceData]    = useState(null);
  const [profileData,  setProfileData]  = useState(null);
  const [ratiosData,   setRatiosData]   = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingFunds, setLoadingFunds] = useState(true);

  // ── Research data (Part 2) ────────────────────────────────────────────────
  const [newsData,     setNewsData]     = useState(null);
  const [recData,      setRecData]      = useState(null);
  const [loadingNews,  setLoadingNews]  = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  // ── Resize ────────────────────────────────────────────────────────────────
  const [chartHeight, setChartHeight] = useState(DEFAULT_CHART_HEIGHT);
  const resizing      = useRef(false);
  const resizeStartY  = useRef(0);
  const resizeStartH  = useRef(0);

  // ── Responsive ────────────────────────────────────────────────────────────
  const [isMobile,   setIsMobile]   = useState(typeof window !== 'undefined' && window.innerWidth < 900);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────

  const assetMap = useMemo(() => {
    const m = {};
    assets.forEach(a => { m[a.symbol] = { isB3: a.meta?.isB3 || false }; });
    return m;
  }, [assets]);

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
        a.symbol !== activeAsset?.symbol &&
        !compSymbols.includes(a.symbol)
      )
      .slice(0, 8);
  }, [assets, compSearch, activeAsset, compSymbols]);

  const siblings = useMemo(() => {
    if (!activeAsset) return [];
    return assets.filter(a => a.subgroup_id === activeAsset.subgroup_id);
  }, [assets, activeAsset]);

  const watchlistAssets = useMemo(() => {
    return watchlistItems
      .filter(i => i.type === 'asset')
      .map(i => assets.find(a => a.symbol === i.target_id))
      .filter(Boolean);
  }, [watchlistItems, assets]);

  const exchangeBadge = activeAsset?.meta?.isB3 ? 'B3'
    : activeAsset?.meta?.isCrypto ? 'CRYPTO'
    : activeAsset?.exchange || '—';

  const hasComparisons = compSymbols.length > 0;

  // ── Effects ───────────────────────────────────────────────────────────────

  // 1. Asset selection on mount / URL param
  useEffect(() => {
    if (assets.length === 0) return;
    const fromParam = searchParams.get('symbol');
    if (fromParam) {
      const found = assets.find(a => a.symbol === fromParam.toUpperCase());
      if (found) { setActiveSymbol(found.symbol); return; }
    }
    // Default to SPY
    if (activeSymbol === 'SPY' && !activeAsset) {
      const spy = assets.find(a => a.symbol === 'SPY');
      if (spy) setActiveAsset(spy);
    }
  }, [assets]);

  // 2. Sync activeAsset when activeSymbol changes
  useEffect(() => {
    const found = assets.find(a => a.symbol === activeSymbol);
    setActiveAsset(found || null);
  }, [activeSymbol, assets]);

  // 3. Fetch sidebar + research data on activeSymbol change
  useEffect(() => {
    if (!activeSymbol) return;
    let cancelled = false;

    setPriceData(null); setProfileData(null); setRatiosData(null);
    setNewsData(null); setRecData(null);
    setLoadingPrice(true); setLoadingFunds(true); setLoadingNews(true);

    const yahooSymbol = activeAsset?.meta?.isB3 ? activeSymbol + '.SA' : activeSymbol;
    fetchAssetQuote(yahooSymbol).then(d => {
      if (!cancelled) { setPriceData(d); setLoadingPrice(false); }
    }).catch(() => { if (!cancelled) setLoadingPrice(false); });

    if (hasFmpKey()) {
      Promise.allSettled([fmpProfile(activeSymbol), fmpRatios(activeSymbol)])
        .then(([p, r]) => {
          if (!cancelled) {
            if (p.status === 'fulfilled') setProfileData(p.value);
            if (r.status === 'fulfilled') setRatiosData(r.value);
            setLoadingFunds(false);
          }
        });
    } else { setLoadingFunds(false); }

    if (hasFinnhubKey()) {
      Promise.allSettled([finnhubNews(activeSymbol), finnhubRecommendation(activeSymbol)])
        .then(([n, r]) => {
          if (!cancelled) {
            if (n.status === 'fulfilled') setNewsData(n.value);
            if (r.status === 'fulfilled') setRecData(r.value);
            setLoadingNews(false);
          }
        });
    } else { setLoadingNews(false); }

    return () => { cancelled = true; };
  }, [activeSymbol]);

  // 4. Fetch OHLCV on activeSymbol + timeframe change
  useEffect(() => {
    if (!activeAsset) return;
    let cancelled = false;
    setChartLoading(true);
    setChartError(null);
    setOhlcvData([]);

    fetchYahooOHLCV(activeAsset.symbol, timeframe, { assets: assetMap })
      .then(data => { if (!cancelled) { setOhlcvData(data); setChartLoading(false); } })
      .catch(err => { if (!cancelled) { setChartError(err.message || 'Chart data unavailable'); setChartLoading(false); } });

    return () => { cancelled = true; };
  }, [activeAsset?.symbol, timeframe, assetMap]);

  // 5. Re-fetch comparison data when timeframe changes
  useEffect(() => {
    if (compSymbols.length === 0) return;
    let cancelled = false;
    setCompLoading(true);

    Promise.all(
      compSymbols.map(sym =>
        fetchYahooOHLCV(sym, timeframe, { assets: assetMap })
          .then(data => ({ sym, data }))
          .catch(() => ({ sym, data: null }))
      )
    ).then(results => {
      if (cancelled) return;
      const newData = {};
      results.forEach(({ sym, data }) => { if (data) newData[sym] = data; });
      setCompData(newData);
      setCompLoading(false);
    });

    return () => { cancelled = true; };
  }, [timeframe, assetMap, compSymbols.join(',')]);

  // 6. lightweight-charts init on mount
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
      chartRef.current    = null;
      mainSeriesRef.current = null;
      compSeriesRefs.current = [];
    };
  }, []);

  // 7. Series rendering on data/type/comparison change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove existing series
    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current); } catch (_) {}
      mainSeriesRef.current = null;
    }
    compSeriesRefs.current.forEach(s => {
      try { chart.removeSeries(s); } catch (_) {}
    });
    compSeriesRefs.current = [];

    if (ohlcvData.length === 0) return;

    const activeComps = compSymbols.filter(sym => compData[sym]?.length > 0);

    if (activeComps.length > 0) {
      // Comparison mode: normalized % change lines
      const mainNorm = normalizeToPercent(ohlcvData);
      const mainSeries = chart.addSeries(LineSeries, { color: ACCENT, lineWidth: 2 });
      mainSeries.setData(mainNorm);
      mainSeriesRef.current = mainSeries;

      activeComps.forEach((sym, i) => {
        const norm = normalizeToPercent(compData[sym]);
        const s = chart.addSeries(LineSeries, {
          color:     COMP_COLORS[i % COMP_COLORS.length],
          lineWidth: 2,
        });
        s.setData(norm);
        compSeriesRefs.current.push(s);
      });
    } else {
      // Single asset mode
      let series;
      if (chartType === 'Candlestick') {
        series = chart.addSeries(CandlestickSeries, {
          upColor: GREEN, downColor: RED,
          wickUpColor: GREEN, wickDownColor: RED,
          borderVisible: false,
        });
        series.setData(ohlcvData);
      } else if (chartType === 'Line') {
        series = chart.addSeries(LineSeries, { color: ACCENT, lineWidth: 2 });
        series.setData(ohlcvData.map(c => ({ time: c.time, value: c.close })));
      } else {
        series = chart.addSeries(AreaSeries, {
          topColor: 'rgba(59,130,246,0.3)',
          bottomColor: 'rgba(59,130,246,0.0)',
          lineColor: ACCENT,
        });
        series.setData(ohlcvData.map(c => ({ time: c.time, value: c.close })));
      }
      mainSeriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [ohlcvData, compData, compSymbols, chartType]);

  // 8. Resize handler
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizing.current) return;
      const delta = e.clientY - resizeStartY.current;
      const newH = Math.max(MIN_CHART_HEIGHT, Math.min(window.innerHeight * 0.8, resizeStartH.current + delta));
      setChartHeight(newH);
    };
    const onMouseUp = () => {
      resizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // 9. Responsive listener
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // 10. Click-outside-search
  useEffect(() => {
    const handler = (e) => {
      if (
        searchDropRef.current && !searchDropRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Event handlers ────────────────────────────────────────────────────────

  function switchAsset(sym) {
    if (sym === activeSymbol) return;
    setActiveSymbol(sym);
    setSearchQuery('');
    setSearchOpen(false);
    setCompSymbols([]);
    setCompData({});
    setCompExpanded(false);
    setCompSearch('');
    setDescExpanded(false);
    setMobileOpen(false);
  }

  const addComparison = useCallback(async (asset) => {
    if (compSymbols.length >= 3) return;
    const sym = asset.symbol;
    setCompSymbols(prev => [...prev, sym]);
    setCompExpanded(false);
    setCompSearch('');
    setCompLoading(true);

    try {
      const data = await fetchYahooOHLCV(sym, timeframe, { assets: assetMap });
      setCompData(prev => ({ ...prev, [sym]: data }));
    } catch (_) {
      setCompData(prev => ({ ...prev, [sym]: null }));
    }
    setCompLoading(false);
  }, [compSymbols, timeframe, assetMap]);

  const removeComparison = useCallback((sym) => {
    setCompSymbols(prev => prev.filter(s => s !== sym));
    setCompData(prev => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  }, []);

  const startResize = (e) => {
    resizing.current = true;
    resizeStartY.current = e.clientY;
    resizeStartH.current = chartHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // ── Sidebar content (shared by desktop + mobile) ──────────────────────────

  const sidebarContent = (
    <>
      {/* Asset identity */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.12em', color: ACCENT, background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)', borderRadius: 3,
          padding: '2px 6px', display: 'inline-block', marginBottom: 8,
        }}>
          {exchangeBadge}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: TXT_1 }}>
            {activeAsset?.symbol || activeSymbol}
          </span>
          <button
            onClick={() => isPinned('asset', activeSymbol) ? unpin('asset', activeSymbol) : pin('asset', activeSymbol)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 16, color: isPinned('asset', activeSymbol) ? '#FFB300' : TXT_3,
              padding: '2px 4px', lineHeight: 1, transition: 'color 0.15s',
            }}
            title={isPinned('asset', activeSymbol) ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isPinned('asset', activeSymbol) ? '★' : '☆'}
          </button>
        </div>
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_2,
          marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {activeAsset?.name || '—'}
        </div>

        {activeAsset?.subgroup_id && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            {activeAsset.subgroup_id.replace(/-/g, ' ')}
          </div>
        )}
        {activeAsset?.group_id && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {activeAsset.group_id}
          </div>
        )}
      </div>

      {/* Price + metrics */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {loadingPrice ? (
          <>
            <Skeleton height={24} width="50%" mb={6} />
            <Skeleton height={14} width="40%" mb={12} />
            <Skeleton height={12} width="80%" mb={4} />
            <Skeleton height={12} width="70%" mb={4} />
            <Skeleton height={12} width="60%" />
          </>
        ) : priceData ? (
          <>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: TXT_1, marginBottom: 2 }}>
              {fmtPrice(priceData.price)}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: priceData.changePct >= 0 ? GREEN : RED, marginBottom: 4 }}>
              {priceData.changePct >= 0 ? '▲' : '▼'} {priceData.change != null ? fmtNum(Math.abs(priceData.change), 2) : ''} ({fmtNum(priceData.changePct, 2)}%)
            </div>
            {priceData.timestamp && (
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: TXT_3, marginBottom: 12 }}>
                {relTime(priceData.timestamp)}
              </div>
            )}

            <SidebarRow label="Volume" value={fmtVol(priceData.volume)} />
            <SidebarRow label="Mkt Cap" value={fmtLarge(priceData.marketCap)} />
            {(profileData?.pe || ratiosData?.peRatio) && (
              <SidebarRow label="P/E" value={fmtNum(ratiosData?.peRatio ?? profileData?.pe, 1)} />
            )}

            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <SourcePill label="YAHOO" color={ACCENT} />
              {profileData && <SourcePill label="FMP" color={GREEN} />}
            </div>
          </>
        ) : (
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3 }}>
            Price data unavailable
          </div>
        )}
      </div>

      {/* Asset lists */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>

        {/* Watchlist quick-access */}
        {watchlistAssets.length > 0 && (
          <>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: '#FFB300', letterSpacing: '1.5px',
              padding: '0 16px 6px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>★</span> WATCHLIST
            </div>
            {watchlistAssets.map(a => {
              const isActive = a.symbol === activeSymbol;
              return (
                <button
                  key={a.symbol}
                  onClick={() => switchAsset(a.symbol)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '5px 16px',
                    background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent',
                    border: 'none', borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                    cursor: isActive ? 'default' : 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(59,130,246,0.06)' : 'transparent'; }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isActive ? TXT_1 : TXT_2 }}>
                    {a.symbol}
                  </span>
                  <span style={{ color: '#FFB300', fontSize: 10 }}>★</span>
                </button>
              );
            })}
            <div style={{ height: 1, background: BORDER, margin: '10px 16px' }} />
          </>
        )}

        {/* Sibling asset list */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: TXT_3, letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '0 16px 8px',
        }}>
          In This Group
        </div>
        {siblings.map(a => {
          const isActive = a.symbol === activeSymbol;
          const pct = isActive && priceData?.changePct != null ? priceData.changePct : null;
          return (
            <button
              key={a.id}
              onClick={() => switchAsset(a.symbol)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '6px 16px',
                background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent',
                border: 'none', borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                cursor: isActive ? 'default' : 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(59,130,246,0.06)' : 'transparent'; }}
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
    </>
  );

  // ── Comparison bar JSX ────────────────────────────────────────────────────

  const activeComps = compSymbols.filter(sym => compData[sym]?.length > 0);

  const comparisonBar = (
    <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, background: BG_HEAD }}>
      {/* Existing comparison cards */}
      {compSymbols.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', gap: 10, flexWrap: 'wrap' }}>
          {/* Main symbol legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 4 }}>
            <div style={{ width: 14, height: 2, background: ACCENT, borderRadius: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
              {activeAsset?.symbol} %Δ
            </span>
          </div>
          {compSymbols.map((sym, i) => (
            <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 14, height: 2, background: COMP_COLORS[i % COMP_COLORS.length], borderRadius: 1 }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>{sym}</span>
              {compLoading && !compData[sym] && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3 }}>...</span>}
              <button
                onClick={() => removeComparison(sym)}
                style={{
                  background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 3,
                  cursor: 'pointer', color: TXT_3, fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, padding: '1px 6px', lineHeight: 1, transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = RED; }}
                onMouseLeave={e => { e.currentTarget.style.color = TXT_3; e.currentTarget.style.borderColor = BORDER; }}
              >×</button>
            </div>
          ))}
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, flex: 1 }}>
            Showing % change from period start
          </span>
        </div>
      )}

      {/* Add comparison row */}
      {!compExpanded && compSymbols.length < 3 ? (
        <button
          onClick={() => setCompExpanded(true)}
          style={{
            width: '100%', padding: compSymbols.length > 0 ? '4px 16px 8px' : '10px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: TXT_3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            letterSpacing: '0.06em', textAlign: 'left', transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = TXT_2; }}
          onMouseLeave={e => { e.currentTarget.style.color = TXT_3; }}
        >
          + Add comparison {compSymbols.length > 0 ? `(${compSymbols.length}/3)` : ''}
        </button>
      ) : compExpanded ? (
        <div style={{ padding: '6px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }} ref={compSearchRef}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_3, flexShrink: 0 }}>Compare:</span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <input
              autoFocus
              value={compSearch}
              onChange={e => setCompSearch(e.target.value)}
              placeholder="Search symbol..."
              style={{
                width: '100%', background: 'rgba(13,24,36,0.8)',
                border: `1px solid ${BORDER}`, borderRadius: 4,
                color: TXT_1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                padding: '4px 10px', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {compSearchResults.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
                width: 260, background: '#0d1824', border: `1px solid ${BORDER}`,
                borderRadius: 6, zIndex: 300, maxHeight: 220, overflowY: 'auto',
                boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
              }}>
                {compSearchResults.map(a => (
                  <button
                    key={a.id}
                    onClick={() => addComparison(a)}
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
          <button
            onClick={() => { setCompExpanded(false); setCompSearch(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TXT_3, fontSize: 16, padding: '0 4px', lineHeight: 1 }}
          >×</button>
        </div>
      ) : null}
    </div>
  );

  // ── Search bar (for subtitle bar) ─────────────────────────────────────────

  const searchBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 4,
            cursor: 'pointer', color: TXT_2, fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12, padding: '4px 10px',
          }}
        >Browse</button>
      )}
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
                onClick={() => switchAsset(a.symbol)}
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
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MarketsPageLayout moduleTitle="Chart & Research" moduleIcon="📊" rightControls={searchBar}>
      {/* Pulse animation for skeletons */}
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* SIDEBAR — desktop */}
        {!isMobile && (
          <div style={{
            width: 220, flexShrink: 0, background: BG_SIDE,
            borderRight: `1px solid ${BORDER}`, display: 'flex',
            flexDirection: 'column', overflow: 'hidden',
          }}>
            {sidebarContent}
          </div>
        )}

        {/* SIDEBAR — mobile overlay */}
        {isMobile && mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
            />
            <div style={{
              position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
              background: BG_SIDE, zIndex: 201, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: TXT_2, letterSpacing: '0.1em' }}>BROWSE ASSETS</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TXT_3, fontSize: 18, lineHeight: 1 }}
                >×</button>
              </div>
              {sidebarContent}
            </div>
          </>
        )}

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* CHART SECTION */}
          <div style={{ height: chartHeight, flexShrink: 0, display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${BORDER}` }}>
            {/* Toolbar: timeframes + chart type */}
            <div style={{
              height: 44, flexShrink: 0, borderBottom: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6, background: BG_HEAD,
            }}>
              {TIMEFRAMES.map(tf => (
                <TabBtn key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} />
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {CHART_TYPES.map(ct => (
                  <TabBtn
                    key={ct}
                    label={ct}
                    active={chartType === ct}
                    onClick={() => setChartType(ct)}
                    disabled={hasComparisons && ct === 'Candlestick'}
                  />
                ))}
              </div>
            </div>

            {/* Chart container */}
            <div ref={chartContainerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              {/* Comparison legend overlay */}
              {hasComparisons && (
                <div style={{
                  position: 'absolute', top: 10, left: 12, zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 16, height: 2, background: ACCENT, borderRadius: 1 }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
                      {activeAsset?.symbol} %Δ
                    </span>
                  </div>
                  {compSymbols.map((sym, i) => (
                    <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 16, height: 2, background: COMP_COLORS[i % COMP_COLORS.length], borderRadius: 1 }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
                        {sym} %Δ
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading overlay */}
              {chartLoading && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(8,15,26,0.85)',
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: TXT_3, letterSpacing: '0.08em' }}>
                    Loading chart data...
                  </span>
                </div>
              )}

              {/* Error overlay */}
              {!chartLoading && chartError && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 5,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(8,15,26,0.85)', gap: 8,
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: RED }}>
                    Unable to load chart data
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, maxWidth: 360, textAlign: 'center' }}>
                    {chartError}
                  </span>
                </div>
              )}
            </div>

            {/* Comparison bar */}
            {comparisonBar}
          </div>

          {/* RESIZE HANDLE */}
          <div
            onMouseDown={startResize}
            style={{
              height: 6, flexShrink: 0, cursor: 'row-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: BG_HEAD, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = BG_HEAD; }}
          >
            <div style={{ width: 40, height: 2, borderRadius: 1, background: BORDER2 }} />
          </div>

          {/* RESEARCH SECTION */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1400 }}>

            {/* Row 1: Price & Market Data + Fundamentals */}
            <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

              {/* ── Price & Market Data ─────────────────────────────── */}
              <Card style={{ flex: 55, minWidth: isMobile ? '100%' : 0 }}>
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
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: TXT_1, lineHeight: 1.1, marginBottom: 4 }}>
                      {fmtPrice(priceData.price)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600,
                        color: priceData.changePct >= 0 ? GREEN : RED,
                      }}>
                        {priceData.changePct != null
                          ? `${priceData.changePct >= 0 ? '▲ +' : '▼ '}${priceData.change != null ? Math.abs(priceData.change).toFixed(2) : ''} (${Math.abs(priceData.changePct).toFixed(2)}%)`
                          : '—'}
                      </span>
                    </div>
                    {priceData.timestamp && (
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, marginBottom: 14 }}>
                        As of {new Date(priceData.timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                      </div>
                    )}

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

              {/* ── Fundamentals ────────────────────────────────────── */}
              <Card style={{ flex: 45, minWidth: isMobile ? '100%' : 0 }}>
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
                        { label: 'P/E (TTM)',      key: 'pe',         val: ratiosData?.peRatio ?? profileData?.pe,   fmt: v => fmtNum(v, 1) },
                        { label: 'EPS (TTM)',       key: null,         val: profileData?.eps,                         fmt: v => `$${fmtNum(v, 2)}` },
                        { label: 'ROE',             key: null,         val: ratiosData?.roe,                          fmt: fmtPct },
                        { label: 'Debt/Equity',     key: 'debtEquity', val: ratiosData?.debtEquity,                   fmt: v => fmtNum(v, 2) },
                        { label: 'Net Margin',      key: 'netMargin',  val: ratiosData?.profitMargin,                 fmt: fmtPct },
                        { label: 'Current Ratio',   key: null,         val: ratiosData?.currentRatio,                 fmt: v => fmtNum(v, 2) },
                        { label: 'Beta',            key: null,         val: profileData?.beta ?? priceData?.beta,     fmt: v => fmtNum(v, 2) },
                        { label: 'Dividend',        key: null,         val: profileData?.lastDiv,                     fmt: v => `$${fmtNum(v, 2)}` },
                      ].map(m => {
                        const dot = m.key ? valDot(m.key, m.val) : TXT_3;
                        return (
                          <div key={m.label} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {m.label}
                              </span>
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: TXT_1, paddingLeft: 11 }}>
                              {m.val != null ? m.fmt(m.val) : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                      <SourcePill label="FMP" color="#22c55e" />
                    </div>

                    {!ratiosData && !profileData && (
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic', marginTop: 8 }}>
                        FMP data unavailable for this symbol.
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            {/* Row 2: Analyst Consensus + Company News */}
            <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

              {/* ── Analyst Consensus ───────────────────────────────── */}
              <Card style={{ flex: 40, minWidth: isMobile ? '100%' : 0 }}>
                <PanelTitle>Analyst Consensus</PanelTitle>

                {!hasFinnhubKey() ? (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    Finnhub key required for analyst data.<br /><br />
                    Set <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>VITE_FINNHUB_KEY</code> in <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>.env.local</code> to enable.
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
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                            {REC_CATS.map(cat => {
                              const cnt = recData[cat.key] || 0;
                              if (!cnt || !total) return null;
                              return (
                                <div key={cat.key} style={{ flex: cnt, background: cat.color, position: 'relative' }} title={`${cat.label}: ${cnt}`} />
                              );
                            })}
                          </div>
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

                        <div style={{
                          display: 'inline-block',
                          background: `${maxCat.color}18`, border: `1px solid ${maxCat.color}44`,
                          borderRadius: 6, padding: '8px 16px',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
                          color: maxCat.color, letterSpacing: '0.08em', marginBottom: 8,
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

              {/* ── Company News ────────────────────────────────────── */}
              <Card style={{ flex: 60, minWidth: isMobile ? '100%' : 0 }}>
                <PanelTitle>Latest News</PanelTitle>

                {!hasFinnhubKey() ? (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
                    Finnhub key required for news data.<br /><br />
                    Set <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>VITE_FINNHUB_KEY</code> in <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2, fontSize: 11 }}>.env.local</code> to enable.
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
                    {newsData.slice(0, 5).map((item, i) => (
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
                    <div style={{ marginTop: 12, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: '#334155' }}>
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

            {/* Row 3: Company Description */}
            {profileData?.description && (
              <Card>
                <PanelTitle>Company Description</PanelTitle>
                {profileData.sector && (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, marginBottom: 8 }}>
                    <span style={{ color: TXT_2 }}>{profileData.sector}</span>
                    {profileData.industry && <span> · {profileData.industry}</span>}
                  </div>
                )}
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_2,
                  lineHeight: 1.6,
                  ...(!descExpanded ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
                }}>
                  {profileData.description}
                </div>
                <button
                  onClick={() => setDescExpanded(p => !p)}
                  style={{
                    marginTop: 8, background: 'transparent', border: 'none',
                    cursor: 'pointer', color: ACCENT, fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 11, padding: 0,
                  }}
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              </Card>
            )}

          </div>

        </div>
      </div>
    </MarketsPageLayout>
  );
}
