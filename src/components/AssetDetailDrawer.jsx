/**
 * AssetDetailDrawer.jsx
 *
 * Right-side slide-in drawer showing asset detail for the Global Markets Terminal.
 *
 * Collapsed view  — price header · key stats · chart
 * Expanded 3-col  — left: stats | center: chart + news | right: fundamentals + analyst
 *
 * Expand data (fundamentals, analyst, news) is fetched lazily on first expand per symbol.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart, AreaSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useTaxonomy } from '../context/TaxonomyContext.jsx';
import {
  API_BASE,
  fetchYahooOHLCV,
  fmpProfile, fmpRatios,
  finnhubRecommendation, finnhubNews,
  hasFmpKey, hasFinnhubKey,
} from '../dataServices.js';
import { useAuth } from '../hooks/useAuth.js';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const BG_DRAWER = '#0a1628';
const BG_CARD   = '#0d1824';
const BORDER    = 'rgba(30,41,59,0.8)';
const TXT_1     = '#e2e8f0';
const TXT_2     = '#94a3b8';
const TXT_3     = '#475569';
const ACCENT    = '#3b82f6';
const GREEN     = '#00E676';
const RED       = '#FF5252';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES   = ['1D', '5D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'MAX'];
const EQUITY_TYPES = new Set(['stock', 'etf', 'equity']);

const INTERVAL_OPTIONS = {
  '1D':  { default: '5m',  options: ['1m', '5m', '15m', '30m'] },
  '5D':  { default: '30m', options: ['15m', '30m', '1h'] },
  '1W':  { default: '30m', options: ['15m', '30m', '1h'] },
  '1M':  { default: '1d',  options: ['1h', '1d'] },
  '3M':  { default: '1d',  options: ['1d', '1wk'] },
  'YTD': { default: '1d',  options: ['1d', '1wk'] },
  '1Y':  { default: '1wk', options: ['1d', '1wk', '1mo'] },
  '5Y':  { default: '1wk', options: ['1d', '1wk', '1mo'] },
  'MAX': { default: '1mo', options: ['1wk', '1mo'] },
};

// ─── LockedTabCard — shown to guests on gated tabs ───────────────────────────
function LockedTabCard({ title, description, onUnlock }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
      gap: 12,
    }}>
      <div style={{ fontSize: 20 }}>🔒</div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: '#e2e8f0',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12,
        color: '#64748b',
        lineHeight: 1.5,
        maxWidth: 260,
      }}>
        {description}
      </div>
      <button
        onClick={onUnlock}
        style={{
          marginTop: 4,
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: 7,
          color: '#e2e8f0',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12,
          padding: '8px 20px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      >
        Criar conta gratuita →
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(unixSec) {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Formatters (Number(v) coercion) ─────────────────────────────────────────
function fmtPrice(v) {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return n >= 1000
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toFixed(2);
}
function fmtVol(v) {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function fmtLarge(v) {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US')}`;
}
function fmtNum(v, d = 2) {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return n.toFixed(d);
}
function fmtPct(v) {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  const pct = Math.abs(n) <= 2 ? n * 100 : n;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

// ─── Single-quote fetcher ─────────────────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, fontWeight: 600, color: TXT_3,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function CardWrap({ children, style }) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 6, padding: 14, marginBottom: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SidebarRow({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: 'rgba(30,41,59,0.45) solid 1px',
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, color: TXT_3,
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, color: valueColor || TXT_1,
      }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function Skeleton({ height = 12, width = '70%', mb = 6 }) {
  return (
    <div style={{
      height, width, marginBottom: mb,
      background: 'rgba(51,65,85,0.2)',
      borderRadius: 3,
      animation: 'add-pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function SideRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: '0.08em', color: TXT_3,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 500,
        color: valueColor || TXT_1,
      }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function FiftyTwoWeekBar({ current, low, high }) {
  if (current == null || low == null || high == null || high <= low) return null;
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        letterSpacing: '1.5px', color: TXT_3, marginBottom: 8,
      }}>52-WEEK RANGE</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: RED, minWidth: 50, textAlign: 'right' }}>
          {low.toFixed(2)}
        </span>
        <div style={{ flex: 1, height: 6, background: 'rgba(30,41,59,0.5)', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, ${RED}, ${pct > 50 ? GREEN : '#FFD740'})`, borderRadius: 3 }} />
          <div style={{ position: 'absolute', left: `${pct}%`, top: -4, width: 2, height: 14, background: TXT_1, borderRadius: 1, transform: 'translateX(-1px)' }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: GREEN, minWidth: 50 }}>
          {high.toFixed(2)}
        </span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_1, textAlign: 'center', marginTop: 4 }}>
        Current: {current.toFixed(2)} ({pct.toFixed(0)}% of range)
      </div>
    </div>
  );
}

function metricColor(key, value) {
  if (value == null || !isFinite(Number(value))) return TXT_3;
  const v = Number(value);
  const n = Math.abs(v) < 3 ? v * 100 : v;
  const rules = {
    pe:               x => x < 15 ? GREEN : x > 35 ? RED : TXT_1,
    priceToBook:      x => x < 1.5 ? GREEN : x > 5 ? RED : TXT_1,
    evToEbitda:       x => x < 10 ? GREEN : x > 25 ? RED : TXT_1,
    grossMargin:      x => x > 50 ? GREEN : x < 20 ? RED : TXT_1,
    operatingMargin:  x => x > 25 ? GREEN : x < 5 ? RED : TXT_1,
    profitMargin:     x => x > 20 ? GREEN : x < 0 ? RED : TXT_1,
    roe:              x => x > 20 ? GREEN : x < 5 ? RED : TXT_1,
    roa:              x => x > 10 ? GREEN : x < 2 ? RED : TXT_1,
    debtEquity:       x => x < 0.5 ? GREEN : x > 2 ? RED : TXT_1,
    currentRatio:     x => x > 2 ? GREEN : x < 1 ? RED : TXT_1,
    interestCoverage: x => x > 5 ? GREEN : x < 1.5 ? RED : TXT_1,
  };
  return (rules[key] ?? (() => TXT_1))(n);
}

function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 8, fontWeight: 600, letterSpacing: '0.08em',
      color: TXT_3, background: 'rgba(51,65,85,0.3)',
      borderRadius: 3, padding: '2px 5px',
      maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {source}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetDetailDrawer({ symbol, onClose, onSymbolChange }) {
  const navigate   = useNavigate();
  const { assets } = useTaxonomy();
  const { isAuthenticated, openAuthPanel } = useAuth();

  // ── Navigation stack ──────────────────────────────────────────────────────
  const [stack, setStack] = useState([]);
  const currentSymbol     = stack[stack.length - 1] || null;

  useEffect(() => {
    if (!symbol) { setStack([]); return; }
    setStack(prev => {
      if (prev.length === 0)               return [symbol];
      if (prev[prev.length - 1] === symbol) return prev;
      if (prev.length >= 3)                return [...prev.slice(0, 2), symbol];
      return [...prev, symbol];
    });
  }, [symbol]);

  function handleBack() {
    setStack(prev => {
      const next = prev.slice(0, -1);
      if (next.length > 0) onSymbolChange?.(next[next.length - 1]);
      return next;
    });
  }

  const [closing, setClosing] = useState(false);
  const closingTimerRef = useRef(null);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    closingTimerRef.current = setTimeout(() => {
      setStack([]);
      setClosing(false);
      onClose?.();
    }, 200);
  }

  // Clean up closing timer on unmount
  useEffect(() => {
    return () => { if (closingTimerRef.current) clearTimeout(closingTimerRef.current); };
  }, []);

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);

  // ── Asset info from taxonomy ──────────────────────────────────────────────
  const assetInfo = assets.find(a => a.symbol === currentSymbol) || null;
  const assetMeta = (() => {
    if (!assetInfo?.meta) return {};
    if (typeof assetInfo.meta === 'string') {
      try { return JSON.parse(assetInfo.meta); } catch { return {}; }
    }
    return assetInfo.meta;
  })();
  const isEquity = EQUITY_TYPES.has(assetInfo?.type);

  // ── Data states ───────────────────────────────────────────────────────────
  const [quoteData,   setQuoteData]   = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [ratiosData,  setRatiosData]  = useState(null);
  const [recData,     setRecData]     = useState(null);
  const [newsData,    setNewsData]    = useState(null);

  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [loadingRec,   setLoadingRec]   = useState(false);
  const [loadingNews,  setLoadingNews]  = useState(false);

  // Tracks which symbols have had expand data fetched this mount
  const expandDataLoaded = useRef({});

  // ── Chart state ───────────────────────────────────────────────────────────
  const [timeframe,    setTimeframe]    = useState('1M');
  const [chartInterval, setChartInterval] = useState(null); // null = use default for timeframe
  const [chartType,    setChartType]    = useState('area'); // 'area' | 'candle'
  const [chartPoints,  setChartPoints]  = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError,   setChartError]   = useState(null);
  const chartCacheRef     = useRef({});
  const activeSymTfRef    = useRef('');
  const chartContainerRef = useRef(null);
  const chartInstanceRef  = useRef(null);
  const seriesRef         = useRef(null);
  const volumeSeriesRef   = useRef(null);
  const chartPointsRef    = useRef(null); // mirror of chartPoints for use in chart init effect
  const [chartGen, setChartGen] = useState(0); // bumped when chart instance is (re)created

  // Peers from same subgroup (for Compare button in Fundamentals tab)
  const peerSymbols = useMemo(() => {
    if (!assetInfo?.subgroup_id || !assets?.length) return [];
    return assets
      .filter(a => a.subgroup_id === assetInfo.subgroup_id && a.symbol !== currentSymbol)
      .sort((a, b) => (a.name || a.symbol).localeCompare(b.name || b.symbol))
      .slice(0, 4)
      .map(a => a.symbol);
  }, [assetInfo, currentSymbol, assets]);

  // Prev/next siblings for arrow-key navigation
  const { prevAsset, nextAsset, siblingIndex, siblingCount } = useMemo(() => {
    if (!assetInfo?.subgroup_id || !assets?.length)
      return { prevAsset: null, nextAsset: null, siblingIndex: -1, siblingCount: 0 };
    const siblings = assets
      .filter(a => a.subgroup_id === assetInfo.subgroup_id)
      .sort((a, b) => (a.symbol).localeCompare(b.symbol));
    if (siblings.length <= 1)
      return { prevAsset: null, nextAsset: null, siblingIndex: 0, siblingCount: siblings.length };
    const idx = siblings.findIndex(a => a.symbol === currentSymbol);
    if (idx === -1)
      return { prevAsset: null, nextAsset: null, siblingIndex: -1, siblingCount: siblings.length };
    return {
      prevAsset: siblings[(idx - 1 + siblings.length) % siblings.length],
      nextAsset: siblings[(idx + 1) % siblings.length],
      siblingIndex: idx,
      siblingCount: siblings.length,
    };
  }, [assetInfo, currentSymbol, assets]);

  // ── Keyboard: ESC to close, ← → to navigate siblings ────────────────────
  useEffect(() => {
    if (!currentSymbol) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft' && prevAsset && onSymbolChange) {
        e.preventDefault();
        onSymbolChange(prevAsset.symbol);
      }
      if (e.key === 'ArrowRight' && nextAsset && onSymbolChange) {
        e.preventDefault();
        onSymbolChange(nextAsset.symbol);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentSymbol, prevAsset, nextAsset, onSymbolChange]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch quote on symbol change ──────────────────────────────────────────
  useEffect(() => {
    if (!currentSymbol) return;
    let cancelled = false;

    setQuoteData(null);
    setProfileData(null);
    setRatiosData(null);
    setRecData(null);
    setNewsData(null);
    setLoadingQuote(true);

    fetchAssetQuote(currentSymbol)
      .then(d  => { if (!cancelled) { setQuoteData(d); setLoadingQuote(false); } })
      .catch(() => { if (!cancelled) setLoadingQuote(false); });

    return () => { cancelled = true; };
  }, [currentSymbol]);

  // ── Reset view state when symbol changes ─────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  useEffect(() => {
    setTimeframe('1M');
    setChartInterval(null);
    setExpanded(false);
    setChartType('area');
    setActiveTab('overview');
  }, [currentSymbol]);

  // ── Fetch expand data on first expand per symbol ──────────────────────────
  useEffect(() => {
    if (!expanded || !currentSymbol) return;
    if (expandDataLoaded.current[currentSymbol]) return;
    expandDataLoaded.current[currentSymbol] = true;

    let cancelled = false;

    console.log('[AssetDetailDrawer] FMP key present:', hasFmpKey());
    console.log('[AssetDetailDrawer] Fetching expand data for:', currentSymbol);

    if (isEquity && hasFmpKey()) {
      setLoadingFunds(true);
      Promise.allSettled([fmpProfile(currentSymbol), fmpRatios(currentSymbol)])
        .then(([prof, rat]) => {
          console.log('[AssetDetailDrawer] fmpProfile result:', prof.status, prof.value ?? prof.reason);
          console.log('[AssetDetailDrawer] fmpRatios result:', rat.status, rat.value ?? rat.reason);
          if (!cancelled) {
            if (prof.status === 'fulfilled') setProfileData(prof.value);
            if (rat.status  === 'fulfilled') setRatiosData(rat.value);
            setLoadingFunds(false);
          }
        });
    }

    if (isEquity && hasFinnhubKey()) {
      setLoadingRec(true);
      finnhubRecommendation(currentSymbol)
        .then(d  => { if (!cancelled) { setRecData(d);   setLoadingRec(false);  } })
        .catch(() => { if (!cancelled) setLoadingRec(false); });

      setLoadingNews(true);
      finnhubNews(currentSymbol)
        .then(d  => { if (!cancelled) { setNewsData(d);  setLoadingNews(false); } })
        .catch(() => { if (!cancelled) setLoadingNews(false); });
    }

    return () => { cancelled = true; };
  }, [expanded, currentSymbol, isEquity]);

  // ── Chart data loader ─────────────────────────────────────────────────────
  const effectiveInterval = chartInterval || INTERVAL_OPTIONS[timeframe]?.default || '1d';

  const loadChart = useCallback(async (sym, tf, iv) => {
    const cacheKey = `${sym}:${tf}:${iv}`;
    activeSymTfRef.current = cacheKey;

    if (chartCacheRef.current[cacheKey]) {
      setChartPoints(chartCacheRef.current[cacheKey]);
      setChartLoading(false);
      setChartError(null);
      return;
    }

    setChartLoading(true);
    setChartError(null);
    setChartPoints(null);

    try {
      const candles = await fetchYahooOHLCV(sym, tf, { interval: iv });
      chartCacheRef.current[cacheKey] = candles;
      if (activeSymTfRef.current === cacheKey) setChartPoints(candles);
    } catch (err) {
      if (activeSymTfRef.current === cacheKey)
        setChartError(err.message || 'Chart unavailable');
    } finally {
      if (activeSymTfRef.current === cacheKey) setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentSymbol) loadChart(currentSymbol, timeframe, effectiveInterval);
  }, [currentSymbol, timeframe, effectiveInterval, loadChart]);

  // ── Chart: create chart instance when container mounts ───────────────────
  // expanded is in deps because toggling switches conditional branches, which
  // unmounts and remounts the chart container div (new DOM node).
  useEffect(() => {
    if (!currentSymbol) return;
    const el = chartContainerRef.current;
    if (!el) return;

    chartInstanceRef.current?.remove();
    seriesRef.current       = null;
    volumeSeriesRef.current = null;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: BG_CARD },
        textColor: TXT_2,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(30,41,59,0.4)' },
        horzLines: { color: 'rgba(30,41,59,0.4)' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: 'rgba(30,41,59,0.6)' },
      timeScale: { borderColor: 'rgba(30,41,59,0.6)', timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });
    chartInstanceRef.current = chart;
    setChartGen(g => g + 1); // signal series effect to re-render

    return () => {
      chart.remove();
      chartInstanceRef.current = null;
      seriesRef.current        = null;
      volumeSeriesRef.current  = null;
    };
  }, [currentSymbol, expanded]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chart: keep chartPointsRef in sync so render effect can re-apply data
  useEffect(() => { chartPointsRef.current = chartPoints; }, [chartPoints]);

  // ── Chart: render series when data or chartType changes ────────────────
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    // Remove existing series before creating new ones
    if (seriesRef.current) {
      try { chart.removeSeries(seriesRef.current); } catch (_) {}
      seriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      try { chart.removeSeries(volumeSeriesRef.current); } catch (_) {}
      volumeSeriesRef.current = null;
    }

    const pts = chartPoints ?? chartPointsRef.current;
    if (!pts?.length) return;

    const isUp = pts[pts.length - 1].close >= pts[0].close;

    if (chartType === 'candle') {
      // ── Candlestick series ──
      const series = chart.addSeries(CandlestickSeries, {
        upColor: GREEN,
        downColor: RED,
        borderUpColor: GREEN,
        borderDownColor: RED,
        wickUpColor: GREEN,
        wickDownColor: RED,
      });
      series.setData(pts); // [{time, open, high, low, close}]
      seriesRef.current = series;

      // ── Volume histogram ──
      const hasVolume = pts.some(c => c.volume > 0);
      if (hasVolume) {
        const volSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });
        volSeries.setData(pts.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.25)',
        })));
        volumeSeriesRef.current = volSeries;
      }
    } else {
      // ── Area series (default) ──
      const mainColor = isUp ? GREEN : RED;
      const series = chart.addSeries(AreaSeries, {
        topColor:    mainColor + '30',
        bottomColor: 'rgba(0,0,0,0)',
        lineColor:   mainColor,
        lineWidth:   2,
      });
      series.setData(pts.map(c => ({ time: c.time, value: c.close })));
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [chartPoints, chartType, chartGen]);

  // ── Chart: refit after expand/collapse transition ─────────────────────────
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    const timer = setTimeout(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.timeScale().fitContent();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [expanded]);

  // ── Early exit when closed ────────────────────────────────────────────────
  if (!currentSymbol) return null;

  // ── Derived values ────────────────────────────────────────────────────────
  const positive   = (quoteData?.changePct ?? 0) >= 0;
  const priceColor = positive ? GREEN : RED;
  const sign       = positive ? '+' : '';

  const exchangeLabel = assetMeta.isB3 ? 'B3'
    : assetMeta.isCrypto ? 'CRYPTO'
    : assetInfo?.exchange || null;

  // ── Section: price header ─────────────────────────────────────────────────
  const priceHeaderSection = (
    <div style={{ marginBottom: 12 }}>
      {loadingQuote ? (
        <>
          <Skeleton height={32} width="45%" mb={8} />
          <Skeleton height={16} width="35%" mb={8} />
          <Skeleton height={10} width="60%" mb={0} />
        </>
      ) : quoteData ? (
        <>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28, fontWeight: 700, color: TXT_1,
            letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 4,
          }}>
            {fmtPrice(quoteData.price)}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14, fontWeight: 600, color: priceColor, marginBottom: 6,
          }}>
            {positive ? '▲' : '▼'} {sign}{fmtPrice(quoteData.change)}{' '}
            ({sign}{quoteData.changePct?.toFixed(2) ?? '—'}%)
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: TXT_3,
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            {quoteData.volume    != null && <span>VOL {fmtVol(quoteData.volume)}</span>}
            {quoteData.marketCap != null && <span>MCAP {fmtLarge(quoteData.marketCap)}</span>}
            {quoteData.timestamp && (
              <span>
                {new Date(quoteData.timestamp * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                })}
              </span>
            )}
          </div>
        </>
      ) : (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3 }}>
          Price data unavailable
        </div>
      )}
    </div>
  );

  // ── Section: key stats ────────────────────────────────────────────────────
  const keyStatsSection = (
    <CardWrap>
      <SectionTitle>Key Stats</SectionTitle>
      {loadingQuote ? (
        [...Array(6)].map((_, i) => <Skeleton key={i} height={26} width="100%" mb={2} />)
      ) : quoteData ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20 }}>
          <div>
            <SidebarRow label="Open"      value={fmtPrice(quoteData.open)} />
            <SidebarRow label="Day High"  value={fmtPrice(quoteData.dayHigh)}  valueColor={GREEN} />
            <SidebarRow label="52W High"  value={fmtPrice(quoteData.w52High)}  valueColor={GREEN} />
            <SidebarRow label="Volume"    value={fmtVol(quoteData.volume)} />
            <SidebarRow label="Mkt Cap"   value={fmtLarge(quoteData.marketCap)} />
          </div>
          <div>
            <SidebarRow label="Prev Close" value={fmtPrice(quoteData.prevClose)} />
            <SidebarRow label="Day Low"    value={fmtPrice(quoteData.dayLow)}   valueColor={RED} />
            <SidebarRow label="52W Low"    value={fmtPrice(quoteData.w52Low)}   valueColor={RED} />
            <SidebarRow label="Avg Vol"    value={fmtVol(quoteData.avgVolume)} />
            <SidebarRow label="Beta"       value={fmtNum(quoteData.beta ?? profileData?.beta)} />
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
          Stats unavailable
        </div>
      )}
    </CardWrap>
  );

  // ── Section: price chart ──────────────────────────────────────────────────
  const chartSection = (
    <CardWrap style={{ padding: 0, overflow: 'hidden' }}>
      {/* ── CHART TOOLBAR ── */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        {/* Row 1: Timeframes (always) + Chart type & expand (expanded only) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px',
        }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {TIMEFRAMES.map(tf => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => { setTimeframe(tf); setChartInterval(null); }}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, fontWeight: active ? 700 : 400,
                    color: active ? GREEN : TXT_3,
                    background: active ? 'rgba(0,230,118,0.1)' : 'transparent',
                    border: active ? '1px solid rgba(0,230,118,0.3)' : '1px solid transparent',
                    borderRadius: 4, padding: '5px 10px',
                    cursor: 'pointer', transition: 'all 0.12s ease',
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          {expanded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['area', 'candle'].map(type => {
                const active = chartType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, fontWeight: active ? 600 : 400,
                      color: active ? GREEN : TXT_3,
                      background: active ? 'rgba(0,230,118,0.08)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(0,230,118,0.25)' : 'transparent'}`,
                      borderRadius: 3, padding: '3px 8px',
                      cursor: 'pointer', textTransform: 'capitalize',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {type === 'area' ? 'Area' : 'Candle'}
                  </button>
                );
              })}
              <button
                onClick={() => navigate(`/markets/research?symbol=${currentSymbol}`)}
                title="Open in Chart & Research"
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: TXT_3, background: 'transparent',
                  border: `1px solid ${BORDER}`, borderRadius: 3,
                  padding: '3px 8px', cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = TXT_2; e.currentTarget.style.borderColor = TXT_2; }}
                onMouseLeave={e => { e.currentTarget.style.color = TXT_3; e.currentTarget.style.borderColor = BORDER; }}
              >
                ⛶
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Interval selector (expanded only) */}
        {expanded && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px 6px',
            borderTop: `1px solid ${BORDER}`,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: ACCENT, letterSpacing: '0.05em', opacity: 0.7,
            }}>
              Interval:
            </span>
            {(INTERVAL_OPTIONS[timeframe]?.options || []).map(iv => {
              const active = effectiveInterval === iv;
              return (
                <button
                  key={iv}
                  onClick={() => setChartInterval(iv)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, fontWeight: active ? 600 : 400,
                    color: active ? ACCENT : TXT_3,
                    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                    borderRadius: 3, padding: '3px 8px',
                    cursor: 'pointer', transition: 'all 0.12s ease',
                  }}
                >
                  {iv}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart area with optional sidebars (expanded only) */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: expanded ? 'clamp(340px, 45vh, 480px)' : 220,
        background: BG_CARD,
        overflow: 'hidden',
      }}>
        {/* Left sidebar — Price Context (expanded only) */}
        {expanded && (
          <div style={{
            width: 155, flexShrink: 0,
            borderRight: '2px solid rgba(30,41,59,0.8)',
            background: 'rgba(8,15,26,0.6)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
              letterSpacing: '1.2px', color: TXT_3,
              padding: '8px 12px 6px', flexShrink: 0,
            }}>PRICE DATA</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
              {[
                { label: 'OPEN',     value: fmtPrice(quoteData?.open) },
                { label: 'PREV CL',  value: fmtPrice(quoteData?.prevClose) },
                { label: 'DAY HIGH', value: fmtPrice(quoteData?.dayHigh), color: GREEN },
                { label: 'DAY LOW',  value: fmtPrice(quoteData?.dayLow),  color: RED },
                { label: '52W HIGH', value: fmtPrice(quoteData?.w52High), color: GREEN },
                { label: '52W LOW',  value: fmtPrice(quoteData?.w52Low),  color: RED },
                { label: 'VOLUME',   value: fmtVol(quoteData?.volume) },
                { label: 'MKT CAP',  value: fmtLarge(quoteData?.marketCap) },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0 10px 0 12px', paddingRight: 14,
                  borderBottom: i < 7 ? '1px solid rgba(30,41,59,0.15)' : 'none',
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TXT_3, letterSpacing: '0.04em' }}>
                    {item.label}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: item.color || TXT_1 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER — Chart canvas (direct flex child for correct sizing) */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
          {/* Loading / error overlays */}
          {chartLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: ACCENT, animation: 'add-pulse 1.2s ease-in-out infinite',
              }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3 }}>
                LOADING
              </span>
            </div>
          )}
          {chartError && !chartLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: RED }}>
                ⚠ {chartError}
              </span>
            </div>
          )}
          {/* lightweight-charts mounts here */}
          <div
            ref={chartContainerRef}
            style={{
              position: 'absolute', inset: 0,
              opacity: (chartLoading || chartError) ? 0 : 1,
              transition: 'opacity 0.2s',
            }}
          />
        </div>

        {/* Right sidebar — Fundamentals Snapshot (expanded + equity only) */}
        {expanded && isEquity && (
          <div style={{
            width: 165, flexShrink: 0,
            borderLeft: `1px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
              letterSpacing: '1.2px', color: TXT_3,
              padding: '8px 12px 6px', flexShrink: 0,
            }}>FUNDAMENTALS</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
              {(() => {
                const divYld = ratiosData?.dividendYield > 0
                  ? fmtPct(ratiosData.dividendYield)
                  : profileData?.lastDiv > 0 && quoteData?.price > 0
                    ? `${((profileData.lastDiv / quoteData.price) * 100).toFixed(2)}%`
                    : null;
                const items = [
                  { label: 'P/E',       value: fmtNum(profileData?.pe ?? ratiosData?.peRatio, 1), color: metricColor('pe', profileData?.pe ?? ratiosData?.peRatio) },
                  { label: 'EV/EBITDA', value: fmtNum(ratiosData?.evToEbitda, 1), color: metricColor('evToEbitda', ratiosData?.evToEbitda) },
                  { label: 'NET MRG',   value: fmtPct(ratiosData?.profitMargin), color: metricColor('profitMargin', ratiosData?.profitMargin) },
                  { label: 'ROE',       value: fmtPct(ratiosData?.roe), color: metricColor('roe', ratiosData?.roe) },
                  { label: 'D/E',       value: fmtNum(ratiosData?.debtEquity, 2), color: metricColor('debtEquity', ratiosData?.debtEquity) },
                  ...(divYld ? [{ label: 'DIV YLD', value: divYld, color: TXT_1 }] : []),
                ];
                return items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0 12px',
                    borderBottom: i < items.length - 1 ? '1px solid rgba(30,41,59,0.15)' : 'none',
                  }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TXT_3, letterSpacing: '0.04em' }}>
                      {item.label}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: item.color || TXT_1 }}>
                      {item.value}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </CardWrap>
  );

  // ── Section: news ─────────────────────────────────────────────────────────
  const newsSection = isEquity ? (
    <CardWrap>
      <SectionTitle>News</SectionTitle>
      {!hasFinnhubKey() ? (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
          Finnhub key required for news
        </div>
      ) : loadingNews ? (
        [...Array(3)].map((_, i) => <Skeleton key={i} height={48} width="100%" mb={8} />)
      ) : newsData?.length > 0 ? (
        <div>
          {newsData.slice(0, isAuthenticated ? 5 : 3).map((item, i) => {
            const limit = isAuthenticated ? 5 : 3;
            return (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block', padding: '8px 0',
                  borderBottom: i < Math.min(newsData.length, limit) - 1
                    ? `1px solid rgba(30,41,59,0.45)` : 'none',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12, color: TXT_1, lineHeight: 1.4, marginBottom: 4,
                }}>
                  {item.headline}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SourceBadge source={item.source} />
                  {item.datetime != null && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, color: TXT_3,
                    }}>
                      {timeAgo(item.datetime)}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
          {!isAuthenticated && newsData.length > 3 && (
            <button
              onClick={() => openAuthPanel('news')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: TXT_3,
                padding: '8px 0',
                width: '100%',
                textAlign: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = TXT_1}
              onMouseLeave={e => e.currentTarget.style.color = TXT_3}
            >
              Ver mais notícias →
            </button>
          )}
        </div>
      ) : (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3 }}>
          No news available
        </div>
      )}
    </CardWrap>
  ) : null;

  // ── Section: fundamentals ─────────────────────────────────────────────────
  const fundamentalsSection = isEquity ? (
    <CardWrap>
      <SectionTitle>Fundamentals</SectionTitle>
      {!hasFmpKey() ? (
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12, color: TXT_3, fontStyle: 'italic', lineHeight: 1.6,
        }}>
          FMP key not configured.<br />
          Add{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
            VITE_FMP_KEY=your_key
          </span>{' '}
          to your{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>
            .env
          </span>{' '}
          file and restart the dev server.
        </div>
      ) : loadingFunds ? (
        <>
          <Skeleton width="80%" height={12} mb={8} />
          <Skeleton width="60%" height={12} mb={8} />
          <Skeleton width="70%" height={12} mb={8} />
          <Skeleton width="50%" height={12} mb={8} />
        </>
      ) : (
        <>
          <SidebarRow label="P/E Ratio"   value={fmtNum(profileData?.pe ?? ratiosData?.peRatio, 1)} />
          <SidebarRow label="EPS"         value={fmtNum(profileData?.eps, 2)} />
          <SidebarRow label="Mkt Cap"     value={fmtLarge(profileData?.marketCap)} />
          <SidebarRow label="Beta"        value={fmtNum(profileData?.beta, 2)} />
          <SidebarRow label="Net Margin"  value={fmtPct(ratiosData?.profitMargin)} />
          <SidebarRow label="Debt/Equity" value={fmtNum(ratiosData?.debtEquity, 2)} />
          <SidebarRow label="ROE"         value={fmtPct(ratiosData?.roe)} />
          <SidebarRow label="Curr. Ratio" value={fmtNum(ratiosData?.currentRatio, 2)} />
        </>
      )}
    </CardWrap>
  ) : null;

  // ── Section: analyst consensus ────────────────────────────────────────────
  const analystSection = isEquity ? (
    <CardWrap>
      <SectionTitle>Analyst Consensus</SectionTitle>
      {!hasFinnhubKey() ? (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic' }}>
          Finnhub key required — set{' '}
          <code style={{ color: TXT_2, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            VITE_FINNHUB_KEY
          </code>{' '}
          in{' '}
          <code style={{ color: TXT_2, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>.env.local</code>
        </div>
      ) : loadingRec ? (
        <>
          <Skeleton height={22} width="100%" mb={8} />
          <Skeleton height={12} width="60%"  mb={12} />
          <Skeleton height={36} width="40%"  mb={0} />
        </>
      ) : recData ? (
        (() => {
          const buy   = (recData.strongBuy  || 0) + (recData.buy  || 0);
          const hold  =  recData.hold || 0;
          const sell  = (recData.strongSell || 0) + (recData.sell || 0);
          const total = buy + hold + sell;
          if (!total) return (
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3 }}>
              No analyst data available
            </div>
          );
          const consensus = buy > sell && buy > hold ? 'BUY'
            : sell > buy && sell > hold ? 'SELL'
            : 'HOLD';
          const consensusColor = consensus === 'BUY' ? GREEN
            : consensus === 'SELL' ? RED
            : TXT_2;
          return (
            <>
              {/* 3-segment bar */}
              <div style={{
                display: 'flex', height: 22,
                borderRadius: 4, overflow: 'hidden', marginBottom: 6,
              }}>
                {buy  > 0 && <div style={{ flex: buy,  background: GREEN }} title={`Buy: ${buy}`}   />}
                {hold > 0 && <div style={{ flex: hold, background: TXT_3 }} title={`Hold: ${hold}`} />}
                {sell > 0 && <div style={{ flex: sell, background: RED   }} title={`Sell: ${sell}`} />}
              </div>

              {/* Label row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                marginBottom: 10,
              }}>
                <span style={{ color: GREEN }}>Buy {buy}</span>
                <span style={{ color: TXT_3 }}>Hold {hold}</span>
                <span style={{ color: RED   }}>Sell {sell}</span>
              </div>

              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: TXT_3, marginBottom: 12,
              }}>
                Based on {total} analyst{total !== 1 ? 's' : ''}
              </div>

              {/* Consensus badge */}
              <div style={{
                display: 'inline-block',
                background: `${consensusColor}18`,
                border: `1px solid ${consensusColor}44`,
                borderRadius: 6, padding: '8px 16px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14, fontWeight: 700,
                color: consensusColor, letterSpacing: '0.08em',
              }}>
                {consensus}
              </div>
            </>
          );
        })()
      ) : (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3 }}>
          No analyst data available
        </div>
      )}
    </CardWrap>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes add-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes add-slideIn { from{transform:translateX(100%);opacity:0.8} to{transform:translateX(0);opacity:1} }
        @keyframes add-slideOut { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:0.8} }
        @keyframes add-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes add-fadeOut { from{opacity:1} to{opacity:0} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 400,
          animation: closing
            ? 'add-fadeOut 200ms ease-in forwards'
            : 'add-fadeIn 250ms ease-out forwards',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: expanded ? 'min(95vw, 1100px)' : 520,
        background: BG_DRAWER,
        borderLeft: `1px solid ${BORDER}`,
        zIndex: 401,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        animation: closing
          ? 'add-slideOut 200ms ease-in forwards'
          : 'add-slideIn 250ms cubic-bezier(0.4,0,0.2,1) both',
      }}>

        {/* ─── Sticky header ─────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          background: BG_DRAWER,
          borderBottom: `1px solid ${BORDER}`,
          padding: '12px 16px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stack.length > 1 && (
              <button
                onClick={handleBack}
                style={{
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  borderRadius: 4, cursor: 'pointer', color: TXT_2,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
                  padding: '3px 8px', transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = TXT_1; e.currentTarget.style.borderColor = TXT_3; }}
                onMouseLeave={e => { e.currentTarget.style.color = TXT_2; e.currentTarget.style.borderColor = BORDER; }}
              >
                ← Back
              </button>
            )}

            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 15, fontWeight: 700, color: TXT_1, letterSpacing: '0.06em',
            }}>
              {currentSymbol}
            </div>

            {exchangeLabel && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', color: ACCENT,
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 3, padding: '2px 6px',
              }}>
                {exchangeLabel}
              </span>
            )}

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setExpanded(e => !e)}
              title={expanded ? 'Collapse' : 'Expand'}
              style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: 4, cursor: 'pointer', color: TXT_3,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                letterSpacing: '0.06em', padding: '3px 8px',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = TXT_2; e.currentTarget.style.borderColor = TXT_3; }}
              onMouseLeave={e => { e.currentTarget.style.color = TXT_3; e.currentTarget.style.borderColor = BORDER; }}
            >
              {expanded ? '⟨ COLLAPSE' : 'EXPAND ⟩'}
            </button>

            <button
              onClick={handleClose}
              style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: 4, cursor: 'pointer', color: TXT_2,
                fontSize: 15, padding: '2px 8px',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = RED; }}
              onMouseLeave={e => { e.currentTarget.style.color = TXT_2; e.currentTarget.style.borderColor = BORDER; }}
            >
              ✕
            </button>
          </div>

          {assetInfo?.name && (
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12, color: TXT_3, marginTop: 5,
            }}>
              {assetInfo.name}
              {assetInfo.subgroup_id && (
                <span style={{ marginLeft: 6 }}>
                  · {assetInfo.subgroup_id.replace(/-/g, ' ').toUpperCase()}
                </span>
              )}
            </div>
          )}

          {stack.length > 1 && (
            <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
              {stack.map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 2, flex: 1, borderRadius: 2,
                    background: i === stack.length - 1 ? ACCENT : 'rgba(59,130,246,0.25)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Asset navigation strip (siblings in same subgroup) */}
          {(prevAsset || nextAsset) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 8, padding: '4px 0 0',
              borderTop: `1px solid ${BORDER}`,
            }}>
              <button
                onClick={() => prevAsset && onSymbolChange?.(prevAsset.symbol)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: prevAsset ? TXT_3 : 'transparent',
                  background: 'transparent', border: 'none',
                  cursor: prevAsset ? 'pointer' : 'default',
                  padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'color 0.12s ease',
                }}
                onMouseEnter={e => { if (prevAsset) e.currentTarget.style.color = TXT_2; }}
                onMouseLeave={e => { if (prevAsset) e.currentTarget.style.color = TXT_3; }}
              >
                ← {prevAsset?.symbol}
              </button>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                color: TXT_3, letterSpacing: '0.1em',
              }}>
                {siblingIndex >= 0 ? `${siblingIndex + 1} / ${siblingCount}` : ''}
              </span>
              <button
                onClick={() => nextAsset && onSymbolChange?.(nextAsset.symbol)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: nextAsset ? TXT_3 : 'transparent',
                  background: 'transparent', border: 'none',
                  cursor: nextAsset ? 'pointer' : 'default',
                  padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'color 0.12s ease',
                }}
                onMouseEnter={e => { if (nextAsset) e.currentTarget.style.color = TXT_2; }}
                onMouseLeave={e => { if (nextAsset) e.currentTarget.style.color = TXT_3; }}
              >
                {nextAsset?.symbol} →
              </button>
            </div>
          )}
        </div>

        {/* ─── Content ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Price header — always visible */}
          <div style={{ flexShrink: 0, padding: '16px 16px 8px' }}>
            {priceHeaderSection}
          </div>

          {/* ── TAB BAR — always visible, right below price ──────── */}
          {(() => {
            const tabs = [
              { key: 'overview', label: 'Overview' },
              ...(isEquity ? [
                { key: 'fundamentals', label: 'Fundamentals' },
                { key: 'analyst',      label: 'Analyst' },
                { key: 'news',         label: 'News' },
              ] : []),
            ];
            // Hide tab bar if only 1 tab
            if (tabs.length <= 1) return null;
            return (
              <div style={{
                display: 'flex', gap: 0,
                borderBottom: `1px solid ${BORDER}`,
                borderTop: `1px solid ${BORDER}`,
                padding: '0 16px',
                background: BG_DRAWER,
                flexShrink: 0,
              }}>
                {tabs.map(tab => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10, fontWeight: active ? 600 : 400,
                        letterSpacing: '0.05em',
                        color: active ? GREEN : TXT_3,
                        background: 'transparent', border: 'none',
                        borderBottom: `2px solid ${active ? GREEN : 'transparent'}`,
                        padding: '10px 14px 8px',
                        cursor: 'pointer', transition: 'all 0.12s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ── TAB CONTENT ──────────────────────────────────────── */}

          {/* OVERVIEW TAB — chart + stats (always rendered, hidden via display) */}
          <div style={{
            display: activeTab === 'overview' ? 'flex' : 'none',
            flex: 1, flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Chart section (toolbar + chart with sidebars) */}
            <div style={{ flexShrink: 0 }}>
              {chartSection}
            </div>

            {/* Below-chart content */}
            <div style={{ padding: '12px 16px 24px' }}>
              {/* Key Stats grid */}
              {quoteData && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '1px', background: BORDER,
                  border: `1px solid ${BORDER}`, borderRadius: 6,
                  overflow: 'hidden', marginBottom: 10,
                }}>
                  {[
                    { label: 'OPEN',     value: fmtPrice(quoteData.open) },
                    { label: 'PREV CL',  value: fmtPrice(quoteData.prevClose) },
                    { label: 'DAY HIGH', value: fmtPrice(quoteData.dayHigh), color: GREEN },
                    { label: 'DAY LOW',  value: fmtPrice(quoteData.dayLow),  color: RED },
                    { label: '52W HIGH', value: fmtPrice(quoteData.w52High), color: GREEN },
                    { label: '52W LOW',  value: fmtPrice(quoteData.w52Low),  color: RED },
                    { label: 'VOLUME',   value: fmtVol(quoteData.volume) },
                    { label: 'MKT CAP',  value: fmtLarge(quoteData.marketCap) },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: BG_CARD, padding: '5px 10px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.06em', color: TXT_3 }}>
                        {item.label}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, color: item.color || TXT_1 }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 52-week range bar */}
              {quoteData?.w52High != null && quoteData?.w52Low != null && quoteData?.price != null && (
                <FiftyTwoWeekBar
                  current={Number(quoteData.price)}
                  low={Number(quoteData.w52Low)}
                  high={Number(quoteData.w52High)}
                />
              )}

              {/* Quick analyst line (equity only, if loaded) */}
              {isEquity && recData && (() => {
                const buy  = (recData.strongBuy || 0) + (recData.buy || 0);
                const hold = recData.hold || 0;
                const sell = (recData.strongSell || 0) + (recData.sell || 0);
                if (!buy && !hold && !sell) return null;
                return (
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_2,
                    marginTop: 8, padding: '6px 10px',
                    background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 4,
                  }}>
                    Analyst:{' '}
                    <span style={{ color: GREEN, fontWeight: 600 }}>BUY {buy}</span>{' · '}
                    <span style={{ color: TXT_3 }}>HOLD {hold}</span>{' · '}
                    <span style={{ color: RED }}>SELL {sell}</span>
                  </div>
                );
              })()}

              {/* Company profile (expanded only — keeps collapsed lean) */}
              {expanded && profileData && (
                <CardWrap style={{ marginTop: 10 }}>
                  <SectionTitle>Company Profile</SectionTitle>
                  {(profileData.sector || profileData.industry) && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      {profileData.sector && (
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                          color: ACCENT, background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.25)',
                          borderRadius: 3, padding: '2px 8px',
                        }}>{profileData.sector}</span>
                      )}
                      {profileData.industry && (
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                          color: TXT_2, background: BG_CARD,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 3, padding: '2px 8px',
                        }}>{profileData.industry}</span>
                      )}
                    </div>
                  )}
                  {profileData.description && (
                    <div style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 12, color: TXT_2, lineHeight: 1.6, marginBottom: 10,
                    }}>{profileData.description}</div>
                  )}
                  <div style={{
                    display: 'flex', gap: 16, flexWrap: 'wrap',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3,
                  }}>
                    {profileData.ceo && <span>CEO: <span style={{ color: TXT_2 }}>{profileData.ceo}</span></span>}
                    {profileData.employees && <span>Employees: <span style={{ color: TXT_2 }}>{Number(profileData.employees).toLocaleString()}</span></span>}
                    {profileData.ipoDate && <span>IPO: <span style={{ color: TXT_2 }}>{profileData.ipoDate}</span></span>}
                    {profileData.country && <span>{profileData.country}</span>}
                  </div>
                </CardWrap>
              )}

              {/* Company one-liner (collapsed only) */}
              {!expanded && profileData?.description && (
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11,
                  color: TXT_3, lineHeight: 1.5, marginTop: 8,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{profileData.description}</div>
              )}
            </div>
          </div>

          {/* FUNDAMENTALS TAB */}
          {activeTab === 'fundamentals' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
              {!isAuthenticated ? (
                <LockedTabCard
                  featureName="fundamentals"
                  title="Dados fundamentalistas"
                  description="P/L, EPS, ROE, EBITDA e recomendações de analistas — disponível para membros."
                  onUnlock={() => openAuthPanel('fundamentals')}
                />
              ) : !hasFmpKey() ? (
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12, color: TXT_3, fontStyle: 'italic', lineHeight: 1.6, padding: '20px 0',
                }}>
                  FMP key not configured. Add{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>VITE_FMP_KEY=your_key</span>{' '}
                  to your <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TXT_2 }}>.env</span> file and restart.
                </div>
              ) : loadingFunds ? (
                <CardWrap>{[...Array(8)].map((_, i) => <Skeleton key={i} height={20} width="100%" mb={6} />)}</CardWrap>
              ) : (
                <>
                  <CardWrap>
                    <SectionTitle>Valuation</SectionTitle>
                    <SidebarRow label="P/E Ratio" value={fmtNum(profileData?.pe ?? ratiosData?.peRatio, 1)} valueColor={metricColor('pe', profileData?.pe ?? ratiosData?.peRatio)} />
                    <SidebarRow label="P/B Ratio" value={fmtNum(ratiosData?.priceToBook, 1)} valueColor={metricColor('priceToBook', ratiosData?.priceToBook)} />
                    <SidebarRow label="P/S Ratio" value={fmtNum(ratiosData?.priceToSales, 1)} />
                    <SidebarRow label="EV/EBITDA" value={fmtNum(ratiosData?.evToEbitda, 1)} valueColor={metricColor('evToEbitda', ratiosData?.evToEbitda)} />
                    <SidebarRow label="P/FCF"     value={fmtNum(ratiosData?.priceToFreeCashFlow, 1)} />
                    <SidebarRow label="EPS"       value={profileData?.eps != null ? `$${fmtNum(profileData.eps, 2)}` : '—'} />
                    <SidebarRow label="Mkt Cap"   value={fmtLarge(profileData?.marketCap)} />
                  </CardWrap>
                  <CardWrap>
                    <SectionTitle>Profitability</SectionTitle>
                    <SidebarRow label="Gross Margin"     value={fmtPct(ratiosData?.grossMargin)} valueColor={metricColor('grossMargin', ratiosData?.grossMargin)} />
                    <SidebarRow label="Operating Margin" value={fmtPct(ratiosData?.operatingMargin)} valueColor={metricColor('operatingMargin', ratiosData?.operatingMargin)} />
                    <SidebarRow label="Net Margin"       value={fmtPct(ratiosData?.profitMargin)} valueColor={metricColor('profitMargin', ratiosData?.profitMargin)} />
                    <SidebarRow label="ROE"              value={fmtPct(ratiosData?.roe)} valueColor={metricColor('roe', ratiosData?.roe)} />
                    <SidebarRow label="ROA"              value={fmtPct(ratiosData?.roa)} valueColor={metricColor('roa', ratiosData?.roa)} />
                  </CardWrap>
                  <CardWrap>
                    <SectionTitle>Leverage & Liquidity</SectionTitle>
                    <SidebarRow label="Debt/Equity"       value={fmtNum(ratiosData?.debtEquity, 2)} valueColor={metricColor('debtEquity', ratiosData?.debtEquity)} />
                    <SidebarRow label="Debt/Assets"       value={fmtNum(ratiosData?.debtToAssets, 2)} />
                    <SidebarRow label="Current Ratio"     value={fmtNum(ratiosData?.currentRatio, 2)} valueColor={metricColor('currentRatio', ratiosData?.currentRatio)} />
                    <SidebarRow label="Quick Ratio"       value={fmtNum(ratiosData?.quickRatio, 2)} />
                    <SidebarRow label="Interest Coverage" value={fmtNum(ratiosData?.interestCoverage, 1)} valueColor={metricColor('interestCoverage', ratiosData?.interestCoverage)} />
                    <SidebarRow label="Beta"              value={fmtNum(profileData?.beta, 2)} />
                  </CardWrap>
                  {(ratiosData?.dividendYield > 0 || profileData?.lastDiv > 0) && (
                    <CardWrap>
                      <SectionTitle>Dividend</SectionTitle>
                      {ratiosData?.dividendYield != null && <SidebarRow label="Dividend Yield" value={fmtPct(ratiosData.dividendYield)} />}
                      {ratiosData?.payoutRatio != null && <SidebarRow label="Payout Ratio" value={fmtPct(ratiosData.payoutRatio)} />}
                      {profileData?.lastDiv > 0 && <SidebarRow label="Last Dividend" value={`$${Number(profileData.lastDiv).toFixed(2)}`} />}
                    </CardWrap>
                  )}
                </>
              )}

              {/* Compare with peers */}
              {peerSymbols.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                  <button
                    onClick={() => {
                      const symbols = [currentSymbol, ...peerSymbols].join(',');
                      navigate(`/markets/fundamentals?symbols=${symbols}`);
                    }}
                    style={{
                      width: '100%', padding: '10px 16px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                      color: ACCENT, background: 'rgba(59,130,246,0.08)',
                      border: '1px solid rgba(59,130,246,0.25)',
                      borderRadius: 6, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; }}
                  >
                    Compare with peers →
                  </button>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[currentSymbol, ...peerSymbols].map((sym, i) => (
                      <span key={sym} style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        color: i === 0 ? GREEN : TXT_3,
                        background: i === 0 ? 'rgba(0,230,118,0.08)' : 'transparent',
                        border: `1px solid ${i === 0 ? 'rgba(0,230,118,0.25)' : BORDER}`,
                        borderRadius: 3, padding: '2px 6px',
                      }}>{sym}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANALYST TAB */}
          {activeTab === 'analyst' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
              {!isAuthenticated ? (
                <LockedTabCard
                  featureName="signals"
                  title="Sinais técnicos"
                  description="RSI, MACD e análise técnica em tempo real — disponível para membros."
                  onUnlock={() => openAuthPanel('signals')}
                />
              ) : (
                analystSection
              )}
            </div>
          )}

          {/* NEWS TAB */}
          {activeTab === 'news' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
              {newsSection}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
