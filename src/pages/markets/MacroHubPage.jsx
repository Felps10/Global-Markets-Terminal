import { useState, useEffect, useMemo } from 'react';
import MarketsPageLayout from '../../components/MarketsPageLayout.jsx';
import {
  fredAllMacro,
  bcbMacro,
  awesomeFx,
  fredReleaseDates,
  hasFredKey,
} from '../../dataServices.js';

// ─── Colors ───────────────────────────────────────────────────────────────────
const BORDER  = 'rgba(30,41,59,0.8)';
const BORDER2 = 'rgba(51,65,85,0.5)';
const BG_PAGE = '#080f1a';
const BG_HEAD = '#0a1628';
const BG_CARD = '#0d1824';
const TXT_1   = '#e2e8f0';
const TXT_2   = '#94a3b8';
const TXT_3   = '#475569';
const ACCENT  = 'var(--c-accent)';
const GREEN   = '#00E676';
const RED     = 'var(--c-error)';
const AMBER   = '#fbbf24';

// ─── Module-level data cache (survives tab switches) ──────────────────────────
let _usMacroCache   = null;
let _usMacroCacheTs = 0;
let _brMacroCache   = null;  // { bcb, fx }
let _brMacroCacheTs = 0;
const MACRO_TTL_MS  = 10 * 60 * 1000; // 10 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(v, d = 2) {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
}

function formatMonthYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCalDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// Returns { arrow, text, positive } or null if no change data
function fmtChange(change, unit) {
  if (change == null || isNaN(Number(change))) return null;
  const n    = Number(change);
  const pos  = n >= 0;
  const abs  = Math.abs(n);
  const arrow = pos ? '▲' : '▼';
  const pfx   = pos ? '+' : '-';

  let text;
  if (unit === '%')   text = `${pfx}${abs.toFixed(2)}pp`;
  else if (unit === 'Index') text = `${pfx}${abs.toFixed(1)}`;
  else if (unit === '$B') text = abs >= 1000 ? `${pfx}$${(abs/1000).toFixed(1)}T` : `${pfx}$${abs.toFixed(0)}B`;
  else if (unit === '$M') text = abs >= 1e6 ? `${pfx}$${(abs/1e6).toFixed(1)}T` : abs >= 1000 ? `${pfx}$${(abs/1000).toFixed(1)}B` : `${pfx}$${abs.toFixed(0)}M`;
  else text = `${pfx}${abs.toFixed(2)}`;

  return { arrow, text, positive: pos };
}

// ─── US indicator display config ──────────────────────────────────────────────
// keys match FRED_SERIES keys from dataServices.js
const US_INDICATORS = [
  {
    key: 'fedRate',
    label: 'Fed Funds Rate',
    colorRule: v => v > 5 ? AMBER : null,
    desc: 'Federal Reserve target rate',
    fmt: v => `${fmtNum(v, 2)}%`,
  },
  {
    key: 'cpi',
    label: 'CPI Index',
    colorRule: null,
    desc: 'Consumer Price Index (All Urban)',
    fmt: v => fmtNum(v, 1),
  },
  {
    key: 'unemployment',
    label: 'Unemployment Rate',
    colorRule: v => v > 7 ? RED : v > 5 ? AMBER : null,
    desc: 'U-3 civilian unemployment rate',
    fmt: v => `${fmtNum(v, 1)}%`,
  },
  {
    key: 'treasury10y',
    label: '10Y Treasury',
    colorRule: null,
    desc: '10-year constant maturity yield',
    fmt: v => `${fmtNum(v, 2)}%`,
  },
  {
    key: 'treasury2y',
    label: '2Y Treasury',
    colorRule: null,
    desc: '2-year constant maturity yield',
    fmt: v => `${fmtNum(v, 2)}%`,
  },
  {
    key: 'gdp',
    label: 'GDP',
    colorRule: null,
    desc: 'US Gross Domestic Product',
    // value is in $B from FRED — convert to $T for display
    fmt: v => `$${(Number(v) / 1000).toFixed(1)}T`,
  },
  {
    key: 'consumerSentiment',
    label: 'Consumer Sentiment',
    colorRule: v => v < 70 ? RED : v > 90 ? GREEN : null,
    desc: 'University of Michigan index',
    fmt: v => fmtNum(v, 1),
  },
  {
    key: 'retailSales',
    label: 'Retail Sales',
    colorRule: null,
    desc: 'Monthly advance retail trade',
    // value is in $M — convert to $B or $T
    fmt: v => {
      const n = Number(v);
      if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}T`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}B`;
      return `$${n.toFixed(0)}M`;
    },
  },
];

// ─── Brazil indicator display config ─────────────────────────────────────────
const BRAZIL_INDICATORS = [
  {
    key: 'selic',
    src: 'BCB',
    label: 'SELIC Rate',
    getValue: (bcb) => bcb?.selic,
    getPct:   null,
    fmt: v => `${fmtNum(v, 2)}%`,
    colorRule: v => v > 10 ? AMBER : null,
    desc: 'Banco Central do Brasil overnight rate',
  },
  {
    key: 'ipca',
    src: 'BCB',
    label: 'IPCA Inflation',
    getValue: (bcb) => bcb?.ipca,
    getPct:   null,
    fmt: v => `${fmtNum(v, 2)}%`,
    colorRule: v => v > 8 ? RED : v > 5 ? AMBER : null,
    desc: 'Índice Nacional de Preços ao Consumidor',
  },
  {
    key: 'cdi',
    src: 'BCB',
    label: 'CDI Rate',
    getValue: (bcb) => bcb?.cdi,
    getPct:   null,
    fmt: v => `${fmtNum(v, 2)}%`,
    colorRule: null,
    desc: 'Certificado de Depósito Interbancário',
  },
  {
    key: 'usdBrl',
    src: 'AWESOME',
    label: 'USD / BRL',
    getValue: (_bcb, fx) => fx?.usdBrl,
    getPct:   (_bcb, fx) => fx?.usdBrlPct,
    fmt: v => `R$ ${fmtNum(v, 2)}`,
    colorRule: null,
    desc: 'US Dollar to Brazilian Real',
  },
  {
    key: 'eurBrl',
    src: 'AWESOME',
    label: 'EUR / BRL',
    getValue: (_bcb, fx) => fx?.eurBrl,
    getPct:   (_bcb, fx) => fx?.eurBrlPct,
    fmt: v => `R$ ${fmtNum(v, 2)}`,
    colorRule: null,
    desc: 'Euro to Brazilian Real',
  },
];

// ─── Calendar knowledge base ──────────────────────────────────────────────────
const KNOWN_RELEASES = {
  'Consumer Price Index':                            { category: 'inflation',   desc: 'CPI — measures retail price changes' },
  'Employment Situation':                            { category: 'employment',  desc: 'NFP — monthly jobs report' },
  'Gross Domestic Product':                          { category: 'growth',      desc: 'GDP growth rate' },
  'Federal Funds Target Rate Range - Upper Limit':   { category: 'rates',       desc: 'FOMC rate decision' },
  'Producer Price Index':                            { category: 'inflation',   desc: 'PPI — wholesale price changes' },
  'Retail Sales':                                    { category: 'growth',      desc: 'Consumer spending indicator' },
  'Industrial Production and Capacity Utilization':  { category: 'growth',      desc: 'Factory output' },
  'New Residential Construction':                    { category: 'housing',     desc: 'Housing starts and permits' },
  'Existing Home Sales':                             { category: 'housing',     desc: 'NAR existing home sales' },
  'Consumer Sentiment':                              { category: 'growth',      desc: 'UMich consumer confidence' },
  'Unemployment Insurance Weekly Claims':            { category: 'employment',  desc: 'Initial jobless claims' },
};

// Maps release_name → fredAllMacro key for actual value lookup
const RELEASE_TO_FRED_KEY = {
  'Consumer Price Index':                          'cpi',
  'Employment Situation':                          'unemployment',
  'Gross Domestic Product':                        'gdp',
  'Federal Funds Target Rate Range - Upper Limit': 'fedRate',
  'Retail Sales':                                  'retailSales',
  'Consumer Sentiment':                            'consumerSentiment',
};

const CATEGORY_COLORS = {
  inflation:  AMBER,
  employment: 'var(--c-accent)',
  growth:     GREEN,
  rates:      '#a855f7',
  housing:    '#fb923c',
  other:      TXT_3,
};

const FILTERS       = ['all', 'inflation', 'employment', 'growth', 'rates', 'housing', 'other'];
const FILTER_LABELS = { all: 'All', inflation: 'Inflation', employment: 'Employment', growth: 'Growth', rates: 'Rates', housing: 'Housing', other: 'Other' };

// ─── Sparkline (pure SVG, no library) ────────────────────────────────────────
// observations: descending order from FRED — reversed here for L→R timeline
function Sparkline({ observations }) {
  // Reverse: FRED gives descending (newest first), we want oldest → newest left → right
  const pts  = observations ? [...observations].reverse().slice(-12) : [];
  const vals = pts.map(p => Number(p.value)).filter(v => !isNaN(v));

  if (vals.length < 2) {
    return (
      <svg width="100%" height={48} viewBox="0 0 100 48" preserveAspectRatio="none">
        <line x1="0" y1="24" x2="100" y2="24" stroke={ACCENT} strokeWidth="1.5" opacity="0.35" />
      </svg>
    );
  }

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const pad = 4;
  const W = 100, H = 48;
  const px = i => (i / (vals.length - 1)) * W;
  const py = v => H - pad - ((v - minV) / range) * (H - 2 * pad);

  const linePoints = vals.map((v, i) => `${px(i).toFixed(2)},${py(v).toFixed(2)}`).join(' ');
  const fillPoints = `0,${H} ${linePoints} ${W},${H}`;

  return (
    <svg width="100%" height={48} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={fillPoints} fill="var(--c-accent-muted)" stroke="none" />
      <polyline points={linePoints} fill="none" stroke={ACCENT} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  const bar = (w, h) => (
    <div style={{
      width: w, height: h, background: BORDER2, borderRadius: 2,
      animation: 'mhPulse 1.5s ease-in-out infinite',
    }} />
  );
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, minHeight: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        {bar(80, 10)} {bar(32, 10)}
      </div>
      {bar(100, 28)}
      <div style={{ marginTop: 8, marginBottom: 12 }}>{bar(130, 10)}</div>
      {bar('100%', 48)}
    </div>
  );
}

// ─── US Indicator Card ────────────────────────────────────────────────────────
// seriesData shape: { id, label, unit, observations: [{date, value}] } (descending)
function IndicatorCard({ seriesData, config }) {
  if (!seriesData) {
    return (
      <div style={{
        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
        padding: 16, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, fontStyle: 'italic', textAlign: 'center' }}>
          {config.label} data unavailable
        </span>
      </div>
    );
  }

  const obs        = seriesData.observations ?? [];
  const latest     = obs[0];
  const prev       = obs[1];
  const value      = latest?.value ?? null;
  const change     = latest && prev ? latest.value - prev.value : null;
  const changeInfo = fmtChange(change, seriesData.unit);
  const valueColor = value != null && config.colorRule ? config.colorRule(value) : null;
  const updateDate = latest?.date ? formatMonthYear(latest.date) : null;

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, minHeight: 180, display: 'flex', flexDirection: 'column' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.4 }}>
          {config.label}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginLeft: 6,
          background: 'rgba(59,130,246,0.1)', color: ACCENT, border: '1px solid rgba(59,130,246,0.3)',
        }}>FRED</div>
      </div>

      {/* Value */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700,
        color: valueColor || TXT_1, lineHeight: 1.1, marginBottom: 6,
      }}>
        {value != null ? config.fmt(value) : '—'}
      </div>

      {/* Change row */}
      {changeInfo && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: changeInfo.positive ? GREEN : RED, marginBottom: 6,
        }}>
          {changeInfo.arrow} {changeInfo.text} since last
        </div>
      )}

      {/* Sparkline */}
      <div style={{ marginTop: 'auto', paddingTop: 8, paddingBottom: 6 }}>
        <Sparkline observations={obs} />
      </div>

      {/* Description */}
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, lineHeight: 1.4 }}>
        {config.desc}
      </div>

      {/* Updated date */}
      {updateDate && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, marginTop: 4 }}>
          Updated: {updateDate}
        </div>
      )}
    </div>
  );
}

// ─── Brazil Indicator Card ────────────────────────────────────────────────────
// BCB/AwesomeFX return scalars only — no history for sparkline → flat dashed line
function BrazilCard({ config, bcbData, fxData }) {
  const value      = config.getValue(bcbData, fxData);
  const pct        = config.getPct ? config.getPct(bcbData, fxData) : null;
  const valueColor = value != null && config.colorRule ? config.colorRule(value) : null;

  const badgeStyle = config.src === 'BCB'
    ? { background: 'rgba(0,230,118,0.08)', color: GREEN, border: '1px solid rgba(0,230,118,0.25)' }
    : { background: 'rgba(245,158,11,0.08)', color: AMBER, border: '1px solid rgba(245,158,11,0.25)' };

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, minHeight: 160, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {config.label}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginLeft: 6, ...badgeStyle,
        }}>{config.src}</div>
      </div>

      {/* Value */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700,
        color: valueColor || TXT_1, lineHeight: 1.1, marginBottom: 6,
      }}>
        {value != null ? config.fmt(value) : '—'}
      </div>

      {/* % change row (FX only) */}
      {pct != null && !isNaN(Number(pct)) && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 6,
          color: Number(pct) >= 0 ? GREEN : RED,
        }}>
          {Number(pct) >= 0 ? '▲' : '▼'} {Math.abs(Number(pct)).toFixed(2)}% today
        </div>
      )}

      {/* Flat sparkline — no history available from BCB/AwesomeAPI */}
      <div style={{ marginTop: 'auto', paddingTop: 8, paddingBottom: 6, opacity: 0.35 }}>
        <svg width="100%" height={32} viewBox="0 0 100 32" preserveAspectRatio="none">
          <line x1="0" y1="16" x2="100" y2="16" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3,2" />
        </svg>
      </div>

      {/* Description */}
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, lineHeight: 1.4 }}>
        {config.desc}
      </div>
    </div>
  );
}

// ─── Calendar table ───────────────────────────────────────────────────────────
function CalendarTable({ entries, todayStr, isMobile }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
      {entries.map((entry, i) => {
        const isToday = entry.date === todayStr;
        const isPast  = entry.date < todayStr;
        const catColor = CATEGORY_COLORS[entry.category] ?? TXT_3;
        const changeInfo = entry.momChange != null ? fmtChange(entry.momChange, entry.momUnit) : null;

        return (
          <div
            key={`${entry.date}-${entry.release_name}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '72px 1fr 90px' : '84px 1fr 110px 84px 110px',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderBottom: i < entries.length - 1 ? `1px solid ${BORDER}` : 'none',
              borderLeft: isToday ? `2px solid ${ACCENT}` : '2px solid transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Date */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              color: isPast ? TXT_3 : TXT_2,
            }}>
              {formatCalDate(entry.date)}
            </div>

            {/* Event + description */}
            <div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: TXT_1, lineHeight: 1.3 }}>
                {entry.release_name}
              </div>
              {entry.desc && !isMobile && (
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, marginTop: 2 }}>
                  {entry.desc}
                </div>
              )}
            </div>

            {/* Category pill — hidden on mobile */}
            {!isMobile && (
              <div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 3, textTransform: 'capitalize',
                  background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}40`,
                }}>{entry.category}</span>
              </div>
            )}

            {/* Actual value — hidden on mobile */}
            {!isMobile && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TXT_1, textAlign: 'right',
              }}>
                {entry.actual ?? '—'}
              </div>
            )}

            {/* MoM Change */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textAlign: 'right',
              color: changeInfo ? (changeInfo.positive ? GREEN : RED) : TXT_3,
            }}>
              {changeInfo ? `${changeInfo.arrow} ${changeInfo.text}` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── No-key placeholder ───────────────────────────────────────────────────────
function NoKeyCard({ varName }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: TXT_2, marginBottom: 10 }}>
        FRED API Key Required
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: TXT_3, lineHeight: 1.7 }}>
        Set{' '}
        <code style={{ fontFamily: "'JetBrains Mono', monospace", color: ACCENT }}>{varName}</code>
        {' '}in your <code style={{ fontFamily: "'JetBrains Mono', monospace", color: TXT_2 }}>.env</code> file
        to enable this data.
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MacroHubPage() {
  const [activeTab,       setActiveTab]       = useState('us');
  const [fredData,        setFredData]        = useState(null);
  const [bcbData,         setBcbData]         = useState(null);
  const [fxData,          setFxData]          = useState(null);
  const [calendarData,    setCalendarData]    = useState([]);
  const [loadingUs,       setLoadingUs]       = useState(true);
  const [loadingBrazil,   setLoadingBrazil]   = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [calendarFilter,  setCalendarFilter]  = useState('all');
  const [isMobile,        setIsMobile]        = useState(window.innerWidth < 640);
  const [isTablet,        setIsTablet]        = useState(window.innerWidth < 1024);

  // Stable today string (only changes if user keeps page open past midnight)
  const [todayStr] = useState(() => new Date().toISOString().slice(0, 10));

  // ── CSS keyframes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = 'mh-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `@keyframes mhPulse { 0%,100%{opacity:0.4} 50%{opacity:0.85} }`;
    document.head.appendChild(s);
    return () => document.getElementById(id)?.remove();
  }, []);

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth < 1024);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Parallel data fetch on mount ───────────────────────────────────────────
  useEffect(() => {
    // US macro (10-min module cache)
    if (_usMacroCache && Date.now() - _usMacroCacheTs < MACRO_TTL_MS) {
      setFredData(_usMacroCache);
      setLoadingUs(false);
    } else {
      fredAllMacro()
        .then(d => {
          if (d) { _usMacroCache = d; _usMacroCacheTs = Date.now(); }
          setFredData(d);
          setLoadingUs(false);
        })
        .catch(() => setLoadingUs(false));
    }

    // Brazil (10-min module cache)
    if (_brMacroCache && Date.now() - _brMacroCacheTs < MACRO_TTL_MS) {
      setBcbData(_brMacroCache.bcb);
      setFxData(_brMacroCache.fx);
      setLoadingBrazil(false);
    } else {
      Promise.allSettled([bcbMacro(), awesomeFx()])
        .then(([br, fx]) => {
          const bcb = br.status === 'fulfilled' ? br.value : null;
          const fxv = fx.status === 'fulfilled' ? fx.value : null;
          if (bcb || fxv) { _brMacroCache = { bcb, fx: fxv }; _brMacroCacheTs = Date.now(); }
          setBcbData(bcb);
          setFxData(fxv);
          setLoadingBrazil(false);
        })
        .catch(() => setLoadingBrazil(false));
    }

    // Calendar (no long-term cache — dates change daily)
    const today = new Date();
    const startD = new Date(today); startD.setDate(startD.getDate() - 14);
    const endD   = new Date(today); endD.setDate(endD.getDate() + 30);
    fredReleaseDates(startD.toISOString().slice(0, 10), endD.toISOString().slice(0, 10))
      .then(d => { setCalendarData(d || []); setLoadingCalendar(false); })
      .catch(() => setLoadingCalendar(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: yield spread ──────────────────────────────────────────────────
  const spread = useMemo(() => {
    if (!fredData?.treasury10y || !fredData?.treasury2y) return null;
    const t10 = fredData.treasury10y.observations?.[0]?.value;
    const t2  = fredData.treasury2y.observations?.[0]?.value;
    if (t10 == null || t2 == null) return null;
    return t10 - t2;
  }, [fredData]);

  // ── Derived: enriched calendar ─────────────────────────────────────────────
  const enrichedCalendar = useMemo(() => {
    const seen = new Set();
    const deduped = calendarData.filter(entry => {
      const key = `${entry.date}::${entry.release_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.map(entry => {
      const known   = KNOWN_RELEASES[entry.release_name];
      const fredKey = RELEASE_TO_FRED_KEY[entry.release_name];
      const obs     = fredKey && fredData?.[fredKey]?.observations;
      const unit    = fredKey && fredData?.[fredKey]?.unit;
      const actual  = obs?.[0]?.value;
      const momChange = obs?.length >= 2 ? obs[0].value - obs[1].value : null;
      const cfg     = US_INDICATORS.find(i => i.key === fredKey);
      const fmtActual = actual != null && cfg ? cfg.fmt(actual) : null;
      return {
        ...entry,
        category:   known?.category ?? 'other',
        desc:       known?.desc ?? '',
        actual:     fmtActual,
        momChange,
        momUnit:    unit ?? null,
      };
    });
  }, [calendarData, fredData]);

  const filteredCalendar = useMemo(
    () => calendarFilter === 'all' ? enrichedCalendar : enrichedCalendar.filter(e => e.category === calendarFilter),
    [enrichedCalendar, calendarFilter]
  );

  const upcomingEntries = useMemo(
    () => filteredCalendar.filter(e => e.date >= todayStr).sort((a, b) => a.date < b.date ? -1 : 1),
    [filteredCalendar, todayStr]
  );
  const recentEntries = useMemo(
    () => filteredCalendar.filter(e => e.date < todayStr).sort((a, b) => a.date < b.date ? -1 : 1),
    [filteredCalendar, todayStr]
  );

  // ── Layout helpers ─────────────────────────────────────────────────────────
  const cols   = isMobile ? 1 : isTablet ? 2 : 4;
  const noFred = !hasFredKey();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <MarketsPageLayout moduleTitle="Macro Hub" moduleIcon="🌐">

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div style={{
        height: 40, flexShrink: 0, display: 'flex', alignItems: 'center',
        background: BG_HEAD, borderBottom: `1px solid ${BORDER}`, padding: '0 20px', gap: 0, zIndex: 9,
      }}>
        {[['us', 'US MACRO'], ['brazil', 'BRAZIL'], ['calendar', 'ECONOMIC CALENDAR']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.12em',
              padding: '0 20px', height: 40,
              borderBottom: activeTab === id ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: activeTab === id ? TXT_1 : TXT_3, transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.color = TXT_2; }}
            onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.color = TXT_3; }}
          >{label}</button>
        ))}
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* ── US MACRO TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'us' && (
          <div>
            {noFred ? (
              <NoKeyCard varName="VITE_FRED_KEY" />
            ) : (
              <>
                {/* 8-card grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: 16,
                  marginBottom: 16,
                }}>
                  {US_INDICATORS.map(cfg => (
                    loadingUs
                      ? <SkeletonCard key={cfg.key} />
                      : <IndicatorCard key={cfg.key} seriesData={fredData?.[cfg.key]} config={cfg} />
                  ))}
                </div>

                {/* Yield spread full-width card */}
                {!loadingUs && spread != null && (
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        10Y–2Y Yield Spread
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 3,
                        background: 'rgba(59,130,246,0.1)', color: ACCENT, border: '1px solid rgba(59,130,246,0.3)',
                      }}>FRED</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700,
                        color: spread >= 0 ? GREEN : RED,
                      }}>
                        {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3 }}>
                        Negative spread historically precedes recession
                      </div>
                    </div>

                    {spread < 0 && (
                      <div style={{
                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 4, padding: '8px 12px', marginTop: 4,
                        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: AMBER,
                      }}>
                        ⚠ Inverted yield curve — historically a recession signal
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BRAZIL TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'brazil' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 16,
              marginBottom: 16,
            }}>
              {BRAZIL_INDICATORS.map(cfg => (
                loadingBrazil
                  ? <SkeletonCard key={cfg.key} />
                  : <BrazilCard key={cfg.key} config={cfg} bcbData={bcbData} fxData={fxData} />
              ))}
            </div>

            {/* Context banner */}
            <div style={{
              background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: 6, padding: '12px 16px',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_3, lineHeight: 1.6,
            }}>
              Brazil macro data sourced from Banco Central do Brasil (BCB) SGS API and AwesomeAPI —
              both public, no API key required.
            </div>
          </div>
        )}

        {/* ── ECONOMIC CALENDAR TAB ────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div>
            {/* Filter pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setCalendarFilter(f)}
                  style={{
                    cursor: 'pointer', borderRadius: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    padding: '5px 10px', border: '1px solid', transition: 'all 0.15s',
                    ...(calendarFilter === f
                      ? { background: 'rgba(59,130,246,0.15)', borderColor: ACCENT, color: TXT_1 }
                      : { background: 'transparent', borderColor: BORDER, color: TXT_3 }
                    ),
                  }}
                  onMouseEnter={e => { if (calendarFilter !== f) e.currentTarget.style.color = TXT_2; }}
                  onMouseLeave={e => { if (calendarFilter !== f) e.currentTarget.style.color = TXT_3; }}
                >{FILTER_LABELS[f]}</button>
              ))}
            </div>

            {noFred ? (
              <NoKeyCard varName="VITE_FRED_KEY" />
            ) : loadingCalendar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    height: 64, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 4,
                    animation: 'mhPulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : (
              <>
                {/* UPCOMING section */}
                {upcomingEntries.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3,
                      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
                    }}>Upcoming</div>
                    <CalendarTable entries={upcomingEntries} todayStr={todayStr} isMobile={isMobile} />
                  </div>
                )}

                {/* RECENT section */}
                {recentEntries.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TXT_3,
                      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
                    }}>Recent</div>
                    <CalendarTable entries={recentEntries} todayStr={todayStr} isMobile={isMobile} />
                  </div>
                )}

                {/* Empty state */}
                {upcomingEntries.length === 0 && recentEntries.length === 0 && (
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
                    color: TXT_3, fontStyle: 'italic', padding: '24px 0',
                  }}>
                    No releases found for this category in the selected date range.
                  </div>
                )}

                {/* Data availability note */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
                  padding: '10px 14px', marginTop: 8,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: TXT_3, lineHeight: 1.6,
                }}>
                  Forecast and consensus data require a premium market data subscription (Bloomberg, Refinitiv).
                  Release dates sourced from FRED. Actual values derived from FRED series observations.
                  The MoM Change column shows the direction of the latest observation vs. the prior one.
                </div>
              </>
            )}
          </div>
        )}

      </div>{/* end content area */}
    </MarketsPageLayout>
  );
}
