import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import MarketsPageLayout from '../../components/MarketsPageLayout.jsx';
import { useTaxonomy } from '../../context/TaxonomyContext.jsx';
import { alphaVantageRSI, alphaVantageMACD, hasAlphaVantageKey } from '../../dataServices.js';
import { quotaTracker, isExhausted } from '../../services/quotaTracker.js';

// ─── Colours ──────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));
const mono  = { fontFamily: "'JetBrains Mono', monospace" };
const sans  = { fontFamily: "'IBM Plex Sans', sans-serif" };

function fmtDate(d) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
}

function getRsiStatus(value) {
  if (value == null || isNaN(value)) return { signal: 'NO DATA', color: TXT_3, text: '' };
  const v = Number(value);
  if (v >= 70) return {
    signal: 'OVERBOUGHT', color: RED,
    text: `RSI at ${v.toFixed(1)} — overbought territory. Momentum may be exhausted. Watch for reversal or pullback signals.`,
  };
  if (v <= 30) return {
    signal: 'OVERSOLD', color: GREEN,
    text: `RSI at ${v.toFixed(1)} — oversold territory. Potential mean-reversion opportunity. Confirm with volume and trend direction before acting.`,
  };
  if (v >= 60) return {
    signal: 'ELEVATED', color: ORANGE,
    text: `RSI at ${v.toFixed(1)} — elevated but not overbought. Momentum is bullish. Monitor for continuation or distribution signals.`,
  };
  if (v <= 40) return {
    signal: 'WEAK', color: ORANGE,
    text: `RSI at ${v.toFixed(1)} — below midpoint. Momentum is bearish. Watch for support levels and potential stabilization.`,
  };
  return {
    signal: 'NEUTRAL', color: TXT_2,
    text: `RSI at ${v.toFixed(1)} — neutral range. No strong momentum signal. Price action and volume provide better direction here.`,
  };
}

function getMacdSummary(macdData) {
  if (!macdData || macdData.length < 2) return '';
  // newest-first: [0] = most recent
  const h0 = macdData[0]?.hist;
  const h1 = macdData[1]?.hist;
  let text = '';
  if (h0 != null && h1 != null) {
    if      (h0 > 0 && h0 > h1) text = 'MACD histogram expanding above zero — bullish momentum strengthening.';
    else if (h0 > 0 && h0 < h1) text = 'MACD histogram contracting above zero — bullish momentum may be fading.';
    else if (h0 < 0 && h0 < h1) text = 'MACD histogram expanding below zero — bearish momentum strengthening.';
    else if (h0 < 0 && h0 > h1) text = 'MACD histogram contracting below zero — bearish pressure may be easing.';
    else text = 'MACD near zero line — no clear directional bias.';
  }
  // crossover detection in last 3 points (newest-first)
  for (let i = 0; i < Math.min(3, macdData.length - 1); i++) {
    const curr = macdData[i];
    const prev = macdData[i + 1];
    if (curr.macd > curr.signal && prev.macd <= prev.signal) {
      text += ' Recent bullish MACD crossover detected.'; break;
    } else if (curr.macd < curr.signal && prev.macd >= prev.signal) {
      text += ' Recent bearish MACD crossover detected.'; break;
    }
  }
  return text;
}

// ─── RSI Chart ────────────────────────────────────────────────────────────────
function RsiChart({ data, period, loading, error, onRetry }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(420);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const SVG_H = 220, padTop = 12, padRight = 16, padBottom = 28, padLeft = 44;
  const chartW = Math.max(10, width - padLeft - padRight);
  const chartH = SVG_H - padTop - padBottom;
  const yScale = v => padTop + chartH * (1 - v / 100);

  // Data: newest-first → reverse to oldest-first, take last 60
  const pts = useMemo(() => {
    if (!data) return [];
    return [...data].reverse().slice(-60).filter(p => !isNaN(Number(p.value)));
  }, [data]);

  const latestVal = pts.length > 0 ? Number(pts[pts.length - 1].value) : null;
  const lineColor = latestVal == null ? ACCENT : latestVal >= 70 ? RED : latestVal <= 30 ? GREEN : ACCENT;
  const xScale = i => padLeft + (pts.length > 1 ? (i / (pts.length - 1)) * chartW : chartW / 2);
  const linePoints = pts.map((p, i) => `${xScale(i)},${yScale(Number(p.value))}`).join(' ');

  const placeholderStyle = { height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  if (loading) {
    return (
      <div ref={containerRef} style={{ ...placeholderStyle, flexDirection: 'column', gap: 8 }}>
        <div style={{ ...mono, fontSize: 11, color: TXT_3 }}>Loading RSI...</div>
        <div style={{ width: 120, height: 3, background: BORDER2, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: ACCENT, borderRadius: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div ref={containerRef} style={{ ...placeholderStyle, flexDirection: 'column', gap: 8 }}>
        <div style={{ ...mono, fontSize: 11, color: RED }}>{error}</div>
        {onRetry && <button onClick={onRetry} style={{ ...mono, fontSize: 11, color: ACCENT, background: 'transparent', border: `1px solid ${ACCENT}`, borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Retry</button>}
      </div>
    );
  }
  if (!pts.length) {
    return <div ref={containerRef} style={{ ...placeholderStyle }}><span style={{ ...sans, fontSize: 13, color: TXT_3, fontStyle: 'italic' }}>No RSI data available.</span></div>;
  }

  const GRIDLINES = [0, 30, 50, 70, 100];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={SVG_H} style={{ display: 'block' }}>
        {/* Overbought zone */}
        <rect x={padLeft} y={yScale(100)} width={chartW} height={yScale(70) - yScale(100)} fill="rgba(255,82,82,0.07)" />
        {/* Oversold zone */}
        <rect x={padLeft} y={yScale(30)} width={chartW} height={yScale(0) - yScale(30)} fill="rgba(0,230,118,0.07)" />

        {/* Gridlines + Y labels */}
        {GRIDLINES.map(v => (
          <g key={v}>
            <line
              x1={padLeft} x2={padLeft + chartW} y1={yScale(v)} y2={yScale(v)}
              stroke={v === 70 ? RED + '50' : v === 30 ? GREEN + '50' : TXT_3 + '30'}
              strokeWidth={1}
              strokeDasharray={v === 70 || v === 30 ? '4,3' : undefined}
            />
            <text x={padLeft - 4} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{v}</text>
          </g>
        ))}

        {/* Zone labels */}
        <text x={padLeft + chartW - 2} y={yScale(85) + 4} textAnchor="end" fontSize={9} fill={TXT_3 + 'cc'} fontFamily="'JetBrains Mono', monospace">OVERBOUGHT</text>
        <text x={padLeft + chartW - 2} y={yScale(15) + 4} textAnchor="end" fontSize={9} fill={TXT_3 + 'cc'} fontFamily="'JetBrains Mono', monospace">OVERSOLD</text>

        {/* RSI line */}
        {pts.length > 1 && <polyline points={linePoints} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

        {/* Current value indicator */}
        {latestVal != null && (() => {
          const cy = yScale(latestVal);
          const pillX = padLeft + chartW - 32;
          return (
            <>
              <line x1={padLeft} x2={pillX - 2} y1={cy} y2={cy} stroke={lineColor} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
              <rect x={pillX} y={cy - 8} width={32} height={16} rx={3} fill={BG_PAGE} stroke={lineColor} strokeWidth={1} />
              <text x={pillX + 16} y={cy + 4} textAnchor="middle" fontSize={10} fill={lineColor} fontFamily="'JetBrains Mono', monospace">{latestVal.toFixed(1)}</text>
            </>
          );
        })()}

        {/* X axis dates */}
        <text x={padLeft} y={SVG_H - 6} textAnchor="start" fontSize={10} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{fmtDate(pts[0]?.date)}</text>
        <text x={padLeft + chartW} y={SVG_H - 6} textAnchor="end" fontSize={10} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{fmtDate(pts[pts.length - 1]?.date)}</text>
      </svg>
    </div>
  );
}

// ─── MACD Chart ───────────────────────────────────────────────────────────────
function MacdChart({ data, loading, error, onRetry }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(420);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const SVG_H = 220, padTop = 12, padRight = 16, padBottom = 28, padLeft = 44;
  const chartW = Math.max(10, width - padLeft - padRight);
  const totalH = SVG_H - padTop - padBottom;
  const topH = Math.floor(totalH * 0.6);
  const botH = totalH - topH - 4;
  const topY0 = padTop, topY1 = padTop + topH;
  const botY0 = topY1 + 4;

  // newest-first → reverse to oldest-first, take last 60
  const pts = useMemo(() => {
    if (!data) return [];
    return [...data].reverse().slice(-60).filter(p => !isNaN(p.macd) && !isNaN(p.signal));
  }, [data]);

  const topVals = pts.flatMap(p => [p.macd, p.signal]);
  const topMin = topVals.length ? Math.min(...topVals) : -1;
  const topMax = topVals.length ? Math.max(...topVals) : 1;
  const topRange = topMax - topMin || 1;
  const topScale = v => topY0 + topH * (1 - (v - topMin) / topRange);

  const histVals = pts.map(p => p.hist).filter(v => !isNaN(v));
  const histAbsMax = histVals.length ? Math.max(...histVals.map(Math.abs), 0.0001) : 0.0001;
  const zeroYBot = botY0 + botH / 2;

  const xScale = i => padLeft + (pts.length > 1 ? (i / (pts.length - 1)) * chartW : chartW / 2);
  const barW = pts.length > 1 ? Math.max(1, (chartW / pts.length) - 1) : 4;

  const macdLine   = pts.map((p, i) => `${xScale(i)},${topScale(p.macd)}`).join(' ');
  const signalLine = pts.map((p, i) => `${xScale(i)},${topScale(p.signal)}`).join(' ');
  const latest = pts[pts.length - 1];

  const placeholderStyle = { height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  if (loading) {
    return (
      <div ref={containerRef} style={{ ...placeholderStyle, flexDirection: 'column', gap: 8 }}>
        <div style={{ ...mono, fontSize: 11, color: TXT_3 }}>Loading MACD...</div>
        <div style={{ width: 120, height: 3, background: BORDER2, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '40%', height: '100%', background: ORANGE, borderRadius: 2 }} />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div ref={containerRef} style={{ ...placeholderStyle, flexDirection: 'column', gap: 8 }}>
        <div style={{ ...mono, fontSize: 11, color: RED }}>{error}</div>
        {onRetry && <button onClick={onRetry} style={{ ...mono, fontSize: 11, color: ACCENT, background: 'transparent', border: `1px solid ${ACCENT}`, borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Retry</button>}
      </div>
    );
  }
  if (!pts.length) {
    return <div ref={containerRef} style={{ ...placeholderStyle }}><span style={{ ...sans, fontSize: 13, color: TXT_3, fontStyle: 'italic' }}>No MACD data available.</span></div>;
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={SVG_H} style={{ display: 'block' }}>
        {/* Top zero line */}
        {topMin <= 0 && topMax >= 0 && (
          <line x1={padLeft} x2={padLeft + chartW} y1={topScale(0)} y2={topScale(0)} stroke={TXT_3 + '35'} strokeWidth={1} />
        )}
        {/* Top Y labels */}
        <text x={padLeft - 4} y={topY0 + 10} textAnchor="end" fontSize={9} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{topMax.toFixed(3)}</text>
        <text x={padLeft - 4} y={topY1 - 2} textAnchor="end" fontSize={9} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{topMin.toFixed(3)}</text>

        {/* Legend */}
        <text x={padLeft + 6} y={topY0 + 14} fontSize={9} fill={ACCENT} fontFamily="'JetBrains Mono', monospace">— MACD</text>
        <text x={padLeft + 6} y={topY0 + 26} fontSize={9} fill={ORANGE} fontFamily="'JetBrains Mono', monospace">- - Signal</text>

        {/* MACD line */}
        {pts.length > 1 && <polyline points={macdLine} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {/* Signal line */}
        {pts.length > 1 && <polyline points={signalLine} fill="none" stroke={ORANGE} strokeWidth={1.5} strokeDasharray="4,3" strokeLinecap="round" />}

        {/* Section separator */}
        <line x1={padLeft} x2={padLeft + chartW} y1={topY1 + 2} y2={topY1 + 2} stroke={BORDER} strokeWidth={1} />

        {/* Bottom zero line */}
        <line x1={padLeft} x2={padLeft + chartW} y1={zeroYBot} y2={zeroYBot} stroke={TXT_3 + '35'} strokeWidth={1} />

        {/* Histogram bars */}
        {pts.map((p, i) => {
          const bH = Math.max(1, (Math.abs(p.hist) / histAbsMax) * (botH / 2) * 0.9);
          const bX = xScale(i) - barW / 2;
          return (
            <rect key={i} x={bX} y={p.hist >= 0 ? zeroYBot - bH : zeroYBot} width={barW} height={bH}
              fill={p.hist >= 0 ? GREEN + '80' : RED + '80'} />
          );
        })}

        {/* X axis dates */}
        <text x={padLeft} y={SVG_H - 6} textAnchor="start" fontSize={10} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{fmtDate(pts[0]?.date)}</text>
        <text x={padLeft + chartW} y={SVG_H - 6} textAnchor="end" fontSize={10} fill={TXT_3} fontFamily="'JetBrains Mono', monospace">{fmtDate(pts[pts.length - 1]?.date)}</text>
      </svg>

      {/* Current values row */}
      {latest && (
        <div style={{ display: 'flex', gap: 16, padding: '8px 12px', borderTop: `1px solid ${BORDER}` }}>
          {[
            { label: 'MACD',      value: latest.macd?.toFixed(4),   color: ACCENT },
            { label: 'Signal',    value: latest.signal?.toFixed(4), color: ORANGE },
            { label: 'Histogram', value: latest.hist?.toFixed(4),   color: latest.hist >= 0 ? GREEN : RED },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ ...mono, fontSize: 9, color: TXT_3 }}>{label}</span>
              <span style={{ ...mono, fontSize: 12, color }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Signal Summary Card ──────────────────────────────────────────────────────
function SignalSummaryCard({ rsiData, macdData, symbol, loadingRsi, loadingMacd, mode, scanResults, scanSubgroupName, scanLoading }) {
  const cardStyle = {
    background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, marginBottom: 16,
  };

  if (mode === 'scanner') {
    if (scanLoading) {
      return (
        <div style={cardStyle}>
          <div style={{ ...mono, fontSize: 10, color: TXT_3, marginBottom: 8 }}>SIGNAL SUMMARY</div>
          <div style={{ ...sans, fontSize: 13, color: TXT_3, fontStyle: 'italic' }}>Scanner running...</div>
        </div>
      );
    }
    if (!scanResults.length) {
      return (
        <div style={cardStyle}>
          <div style={{ ...mono, fontSize: 10, color: TXT_3, marginBottom: 8 }}>SIGNAL SUMMARY</div>
          <div style={{ ...sans, fontSize: 13, color: TXT_3, fontStyle: 'italic' }}>Select a subgroup and run the scanner to see results.</div>
        </div>
      );
    }
    const overbought = scanResults.filter(r => r.rsi != null && r.rsi >= 70);
    const oversold   = scanResults.filter(r => r.rsi != null && r.rsi <= 30);
    const neutral    = scanResults.filter(r => r.rsi != null && r.rsi > 30 && r.rsi < 70);
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ ...mono, fontSize: 10, color: TXT_3 }}>SIGNAL SUMMARY</span>
          <span style={{ ...mono, fontSize: 12, color: TXT_1 }}>SCANNER — {scanSubgroupName || '—'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          <div style={{ ...mono, fontSize: 12, color: RED }}>{overbought.length} overbought (RSI ≥ 70)</div>
          <div style={{ ...mono, fontSize: 12, color: GREEN }}>{oversold.length} oversold (RSI ≤ 30)</div>
          <div style={{ ...mono, fontSize: 12, color: TXT_3 }}>{neutral.length} neutral</div>
        </div>
        {overbought.length > 0 && (
          <div style={{ ...sans, fontSize: 13, color: RED, marginBottom: 4 }}>Overbought: {overbought.map(r => r.symbol).join(', ')}</div>
        )}
        {oversold.length > 0 && (
          <div style={{ ...sans, fontSize: 13, color: GREEN, marginBottom: 4 }}>Oversold: {oversold.map(r => r.symbol).join(', ')}</div>
        )}
        <div style={{ ...sans, fontSize: 11, color: TXT_3, fontStyle: 'italic', marginTop: 8 }}>
          Signal interpretation is algorithmic and informational only. Not financial advice. Always validate signals with additional context before making decisions.
        </div>
      </div>
    );
  }

  // Single mode
  if (loadingRsi || loadingMacd) {
    return (
      <div style={cardStyle}>
        <div style={{ ...mono, fontSize: 10, color: TXT_3, marginBottom: 8 }}>SIGNAL SUMMARY</div>
        <div style={{ height: 60, background: BORDER, borderRadius: 4, opacity: 0.5 }} />
      </div>
    );
  }

  if (!rsiData && !macdData) {
    return (
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
        <span style={{ ...sans, fontSize: 13, color: TXT_3, fontStyle: 'italic' }}>Select an asset on the left to generate a technical signal analysis.</span>
      </div>
    );
  }

  // rsiData is newest-first; [0] = most recent
  const latestRsi = rsiData?.[0]?.value != null ? Number(rsiData[0].value) : null;
  const rsiStatus = getRsiStatus(latestRsi);
  const macdText  = getMacdSummary(macdData);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...mono, fontSize: 10, color: TXT_3 }}>SIGNAL SUMMARY</span>
        <span style={{ ...mono, fontSize: 12, color: TXT_1 }}>{symbol}</span>
      </div>

      {/* RSI signal badge */}
      {latestRsi != null && (
        <div style={{
          display: 'inline-block',
          background: rsiStatus.color + '18', border: `1px solid ${rsiStatus.color}44`,
          borderRadius: 4, padding: '4px 12px', marginBottom: 10,
        }}>
          <span style={{ ...mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: rsiStatus.color }}>
            {rsiStatus.signal}
          </span>
        </div>
      )}

      {rsiStatus.text && (
        <div style={{ ...sans, fontSize: 13, color: TXT_2, lineHeight: 1.6, marginBottom: macdText ? 12 : 0 }}>
          {rsiStatus.text}
        </div>
      )}

      {macdText && (
        <>
          <div style={{ height: 1, background: BORDER, margin: '10px 0' }} />
          <div style={{ ...sans, fontSize: 13, color: TXT_2, lineHeight: 1.6 }}>{macdText}</div>
        </>
      )}

      <div style={{ ...sans, fontSize: 11, color: TXT_3, fontStyle: 'italic', marginTop: 12 }}>
        Signal interpretation is algorithmic and informational only. Not financial advice. Always validate signals with additional context before making decisions.
      </div>
    </div>
  );
}

// ─── Scanner Results Card ─────────────────────────────────────────────────────
function ScannerResultsCard({ results, scanLoading, scanProgress, totalToScan, subgroupName, scanError, onScanAgain }) {
  const cardStyle = { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 };

  const signalIcon = status => {
    if (!status) return '⚪';
    if (status.signal === 'OVERBOUGHT') return '🔴';
    if (status.signal === 'OVERSOLD')   return '🟢';
    return '⚪';
  };

  return (
    <div style={cardStyle}>
      <div style={{ ...mono, fontSize: 10, color: TXT_3, marginBottom: 12, letterSpacing: '0.1em' }}>
        RSI SCAN — {subgroupName || '—'}
      </div>

      {scanLoading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...mono, fontSize: 12, color: TXT_2, marginBottom: 8 }}>
            Scanning {totalToScan} assets... ({scanProgress}/{totalToScan})
          </div>
          <div style={{ width: '100%', height: 3, background: BORDER2, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${(scanProgress / totalToScan) * 100}%`, height: '100%', background: ACCENT, borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ ...sans, fontSize: 11, color: TXT_3 }}>
            Each call takes ~12s to respect rate limits. Est. {(totalToScan - 1) * 12}s total.
          </div>
        </div>
      )}

      {scanError && !scanLoading && (
        <div style={{ ...mono, fontSize: 12, color: RED, marginBottom: 12 }}>{scanError}</div>
      )}

      {results.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr>
              {['#', 'Symbol', 'Name', 'RSI', 'Signal', ''].map((h, i) => (
                <th key={i} style={{ ...mono, fontSize: 10, color: TXT_3, textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => {
              const isLowest  = r.rsi != null && r.rsi === Math.min(...results.filter(x => x.rsi != null).map(x => x.rsi));
              const isHighest = r.rsi != null && r.rsi === Math.max(...results.filter(x => x.rsi != null).map(x => x.rsi));
              const rowBorderLeft = isLowest ? `2px solid ${GREEN}` : isHighest ? `2px solid ${RED}` : `2px solid transparent`;
              const rsiColor = r.rsi == null ? TXT_3 : r.rsi >= 70 ? RED : r.rsi <= 30 ? GREEN : TXT_1;
              return (
                <tr key={r.symbol} style={{ borderLeft: rowBorderLeft }}>
                  <td style={{ ...mono, fontSize: 11, color: TXT_3, padding: '6px 8px' }}>{idx + 1}</td>
                  <td style={{ ...mono, fontSize: 13, color: TXT_1, fontWeight: 700, padding: '6px 8px', whiteSpace: 'nowrap' }}>{r.symbol}</td>
                  <td style={{ ...sans, fontSize: 12, color: TXT_3, padding: '6px 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td style={{ ...mono, fontSize: 14, color: rsiColor, padding: '6px 8px' }}>
                    {r.error ? 'Error' : r.rsi != null ? r.rsi.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {r.status && (
                      <span style={{
                        ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        color: r.status.color,
                        background: r.status.color + '18',
                        border: `1px solid ${r.status.color}44`,
                        borderRadius: 3, padding: '2px 7px',
                      }}>{r.status.signal}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 14 }}>{signalIcon(r.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!scanLoading && (results.length > 0 || scanError) && (
        <button
          onClick={onScanAgain}
          style={{ ...mono, fontSize: 12, fontWeight: 700, width: '100%', padding: '10px 0', background: ACCENT, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Scan Again →
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SignalEnginePage() {
  const { assets, subgroups } = useTaxonomy();

  // Mode
  const [mode, setMode] = useState('single');

  // Single asset
  const [activeSymbol, setActiveSymbol] = useState('SPY');
  const [activeAsset, setActiveAsset]   = useState(null);
  const [rsiPeriod, setRsiPeriod]       = useState(14);
  const [rsiData, setRsiData]           = useState(null);
  const [macdData, setMacdData]         = useState(null);
  const [loadingRsi, setLoadingRsi]     = useState(false);
  const [loadingMacd, setLoadingMacd]   = useState(false);
  const [rsiError, setRsiError]         = useState(null);
  const [macdError, setMacdError]       = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchRef = useRef(null);

  // Scanner
  const [scanSubgroupId, setScanSubgroupId] = useState(null);
  const [scanResults, setScanResults]       = useState([]);
  const [scanLoading, setScanLoading]       = useState(false);
  const [scanError, setScanError]           = useState(null);
  const [scanProgress, setScanProgress]     = useState(0);

  // Quota
  const [avQuotaWarning, setAvQuotaWarning]   = useState(false);
  const [quotaRemaining, setQuotaRemaining]   = useState(null);

  // Mobile
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Quota badge refresh ────────────────────────────────────────────────────
  const refreshQuota = useCallback(() => {
    const status = quotaTracker.getRemainingQuota('alphaVantage');
    setQuotaRemaining(status.perDayRemaining);
    if (isExhausted('alphaVantage')) setAvQuotaWarning(true);
  }, []);

  useEffect(() => {
    refreshQuota();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [refreshQuota]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Track active asset from taxonomy
  useEffect(() => {
    if (!activeSymbol || !assets.length) return;
    const found = assets.find(a => a.symbol === activeSymbol);
    setActiveAsset(found || null);
  }, [activeSymbol, assets]);

  // ── Fetch RSI + MACD ───────────────────────────────────────────────────────
  const fetchSignals = useCallback(async (symbol, period) => {
    if (!hasAlphaVantageKey()) {
      const msg = 'Alpha Vantage API key not configured. Set VITE_ALPHAVANTAGE_KEY in .env.local.';
      setRsiError(msg); setMacdError(msg); return;
    }
    if (isExhausted('alphaVantage')) {
      setAvQuotaWarning(true);
      const msg = 'Alpha Vantage daily quota exhausted (25 req/day). Resets at midnight UTC.';
      setRsiError(msg); setMacdError(msg); return;
    }

    setLoadingRsi(true); setLoadingMacd(true);
    setRsiError(null);   setMacdError(null);
    setRsiData(null);    setMacdData(null);

    const [rsiResult, macdResult] = await Promise.allSettled([
      alphaVantageRSI(symbol, 'daily', period),
      alphaVantageMACD(symbol, 'daily'),
    ]);

    if (rsiResult.status === 'fulfilled' && rsiResult.value) {
      setRsiData(rsiResult.value);
    } else {
      setRsiError('Failed to load RSI data. Check your API key or daily quota.');
    }
    setLoadingRsi(false);

    if (macdResult.status === 'fulfilled' && macdResult.value) {
      setMacdData(macdResult.value);
    } else {
      setMacdError('Failed to load MACD data. Check your API key or daily quota.');
    }
    setLoadingMacd(false);
    refreshQuota();
  }, [refreshQuota]);

  // Auto-fetch on mount (SPY default) and when symbol/period changes
  const fetchedRef = useRef(new Set());
  useEffect(() => {
    if (mode !== 'single' || !activeSymbol) return;
    const key = `${activeSymbol}:${rsiPeriod}`;
    if (fetchedRef.current.has(key)) return;
    fetchedRef.current.add(key);
    fetchSignals(activeSymbol, rsiPeriod);
  }, [activeSymbol, rsiPeriod, mode, fetchSignals]);

  // ── Scanner ────────────────────────────────────────────────────────────────
  const activeSubgroup = useMemo(() => subgroups.find(s => s.id === scanSubgroupId), [subgroups, scanSubgroupId]);

  const runScan = useCallback(async () => {
    if (!scanSubgroupId || !activeSubgroup) return;
    if (isExhausted('alphaVantage')) {
      setScanError('Alpha Vantage daily quota exhausted (25 req/day). Resets at midnight UTC.');
      setAvQuotaWarning(true); return;
    }
    const assetsToScan = (activeSubgroup.assets || []).slice(0, 5);
    if (!assetsToScan.length) { setScanError('No assets in this subgroup.'); return; }

    setScanLoading(true); setScanError(null); setScanResults([]); setScanProgress(0);
    const results = [];
    for (let i = 0; i < assetsToScan.length; i++) {
      const asset = assetsToScan[i];
      try {
        const rsi = await alphaVantageRSI(asset.symbol, 'daily', 14);
        // newest-first: rsi[0] is most recent
        const rsiValue = rsi?.[0]?.value != null ? Number(rsi[0].value) : null;
        const status = rsiValue != null ? getRsiStatus(rsiValue) : null;
        results.push({ symbol: asset.symbol, name: asset.name, rsi: rsiValue, status, error: null });
      } catch (err) {
        results.push({ symbol: asset.symbol, name: asset.name, rsi: null, status: null, error: err.message });
      }
      setScanProgress(i + 1);
      if (i < assetsToScan.length - 1) await delay(12000);
    }
    results.sort((a, b) => {
      if (a.rsi == null && b.rsi == null) return 0;
      if (a.rsi == null) return 1;
      if (b.rsi == null) return -1;
      return a.rsi - b.rsi;
    });
    setScanResults(results);
    setScanLoading(false);
    refreshQuota();
  }, [scanSubgroupId, activeSubgroup, refreshQuota]);

  // ── Search results ─────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return assets.filter(a => a.symbol.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, assets]);

  const selectAsset = (symbol) => {
    setActiveSymbol(symbol);
    setSearchQuery('');
    setSearchOpen(false);
    setRsiData(null); setMacdData(null);
    setRsiError(null); setMacdError(null);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setScanResults([]); setScanError(null); setScanProgress(0);
    if (newMode === 'single') { setRsiData(null); setMacdData(null); setRsiError(null); setMacdError(null); }
  };

  // ── Quota badge ────────────────────────────────────────────────────────────
  const exhausted = isExhausted('alphaVantage');
  const QuotaBadge = () => {
    const bg     = exhausted ? '#3a0000' : quotaRemaining != null && quotaRemaining <= 5 ? 'rgba(245,158,11,0.08)' : 'rgba(51,65,85,0.3)';
    const border = exhausted ? `1px solid ${RED}55` : quotaRemaining != null && quotaRemaining <= 5 ? `1px solid rgba(245,158,11,0.35)` : `1px solid ${BORDER}`;
    const color  = exhausted ? RED : quotaRemaining != null && quotaRemaining <= 5 ? AMBER : TXT_3;
    const label  = exhausted ? 'AV QUOTA EXHAUSTED' : quotaRemaining != null && quotaRemaining <= 5 ? `AV: ${quotaRemaining} CALLS LEFT` : `AV: ${quotaRemaining ?? 25}/25 DAILY`;
    return (
      <div
        title="Alpha Vantage free tier: 25 requests per day. Resets at midnight UTC."
        style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color, background: bg, border, borderRadius: 4, padding: '4px 10px', cursor: 'default' }}
      >
        {label}
      </div>
    );
  };

  // ── Left panel content ─────────────────────────────────────────────────────
  const renderPanel = (withClose) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {withClose && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ ...mono, fontSize: 11, color: TXT_2 }}>CONFIGURE</span>
          <button onClick={() => setPanelOpen(false)} style={{ background: 'transparent', border: 'none', color: TXT_3, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ padding: '12px 12px 0' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[{ id: 'single', label: 'Single Asset' }, { id: 'scanner', label: 'Scanner' }].map(({ id, label }) => (
            <button key={id} onClick={() => switchMode(id)} style={{
              flex: 1, padding: '7px 0', ...mono, fontSize: 11, cursor: 'pointer', borderRadius: 0,
              background: mode === id ? `rgba(59,130,246,0.15)` : 'transparent',
              border: `1px solid ${mode === id ? ACCENT : BORDER}`,
              color: mode === id ? TXT_1 : TXT_3,
              borderLeft: id === 'scanner' ? 'none' : undefined,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {mode === 'single' ? (
        <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search asset..."
              style={{ width: '100%', boxSizing: 'border-box', background: BG_PAGE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '7px 10px', ...mono, fontSize: 12, color: TXT_1, outline: 'none' }}
            />
            {searchOpen && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 4, zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(a => (
                  <div key={a.id} onClick={() => selectAsset(a.symbol)}
                    style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = BORDER}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ ...mono, fontSize: 12, color: TXT_1 }}>{a.symbol}</span>
                    <span style={{ ...sans, fontSize: 11, color: TXT_3, marginLeft: 8 }}>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active asset display */}
          {activeSymbol && (
            <div style={{ background: BG_PAGE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: TXT_1 }}>{activeSymbol}</div>
              {activeAsset && (
                <>
                  <div style={{ ...sans, fontSize: 12, color: TXT_3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeAsset.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: TXT_3, marginTop: 4, textTransform: 'uppercase' }}>{activeAsset.subgroupDisplayName}</div>
                </>
              )}
            </div>
          )}

          {/* RSI period selector */}
          <div>
            <div style={{ ...mono, fontSize: 10, color: TXT_3, marginBottom: 6 }}>RSI PERIOD</div>
            <div style={{ display: 'flex', gap: 0 }}>
              {[9, 14, 21].map(p => (
                <button key={p} onClick={() => setRsiPeriod(p)} style={{
                  flex: 1, padding: '6px 0', ...mono, fontSize: 11, cursor: 'pointer',
                  background: rsiPeriod === p ? `rgba(59,130,246,0.15)` : 'transparent',
                  border: `1px solid ${rsiPeriod === p ? ACCENT : BORDER}`,
                  borderLeft: p !== 9 ? 'none' : undefined,
                  color: rsiPeriod === p ? TXT_1 : TXT_3,
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Data source note */}
          <div style={{ ...sans, fontSize: 11, color: TXT_3, lineHeight: 1.5 }}>
            RSI and MACD via Alpha Vantage.<br />Free tier: 25 req/day.
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Subgroup picker */}
          <div>
            <div style={{ ...mono, fontSize: 10, color: TXT_3, marginBottom: 6 }}>SELECT SUBGROUP</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 4 }}>
              {subgroups.map(sg => (
                <div
                  key={sg.id}
                  onClick={() => setScanSubgroupId(sg.id)}
                  style={{
                    padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    borderLeft: scanSubgroupId === sg.id ? `2px solid ${ACCENT}` : '2px solid transparent',
                    background: scanSubgroupId === sg.id ? `rgba(59,130,246,0.06)` : 'transparent',
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  {sg.icon && <span style={{ fontSize: 14 }}>{sg.icon}</span>}
                  <span style={{ ...mono, fontSize: 12, color: TXT_2 }}>{sg.display_name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Asset count note */}
          {activeSubgroup && (
            <div style={{ ...sans, fontSize: 11, color: TXT_3 }}>
              {activeSubgroup.assets?.length ?? 0} assets in this subgroup
              {(activeSubgroup.assets?.length ?? 0) > 5 && (
                <div style={{ color: AMBER, marginTop: 4 }}>
                  Scanner limited to 5 assets. First 5 will be scanned to preserve daily quota.
                </div>
              )}
            </div>
          )}

          {/* Run scan button */}
          <button
            onClick={runScan}
            disabled={!scanSubgroupId || scanLoading || exhausted}
            style={{
              width: '100%', padding: '10px 0', ...mono, fontSize: 12, fontWeight: 700,
              background: !scanSubgroupId || scanLoading || exhausted ? '#334155' : ACCENT,
              color: '#fff', border: 'none', borderRadius: 4, cursor: !scanSubgroupId || scanLoading || exhausted ? 'not-allowed' : 'pointer',
            }}
          >
            {exhausted ? 'Quota Exhausted' : scanLoading ? 'Scanning...' : 'Run RSI Scan →'}
          </button>

          {/* Quota warning */}
          {avQuotaWarning && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 4, padding: '8px 10px', ...sans, fontSize: 11, color: AMBER }}>
              ⚠ Alpha Vantage free tier: 25 req/day. Each scan uses 1 call per asset (max 5 calls).
            </div>
          )}

          <div style={{ ...sans, fontSize: 11, color: TXT_3, lineHeight: 1.5 }}>
            RSI scanner via Alpha Vantage.<br />Free tier: 25 req/day.
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const statusControls = (
    <>
      {isMobile && (
        <button onClick={() => setPanelOpen(true)} style={{ ...mono, fontSize: 11, color: TXT_2, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>⚙ Configure</button>
      )}
      <QuotaBadge />
    </>
  );

  return (
    <MarketsPageLayout moduleTitle="Signal Engine" moduleIcon="⚡" rightControls={statusControls}>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel (desktop) */}
        {!isMobile && (
          <div style={{ width: 260, minWidth: 260, background: BG_SIDE, borderRight: `1px solid ${BORDER}`, overflowY: 'auto' }}>
            {renderPanel(false)}
          </div>
        )}

        {/* Right area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Signal summary */}
          <SignalSummaryCard
            rsiData={rsiData} macdData={macdData}
            symbol={activeSymbol} loadingRsi={loadingRsi} loadingMacd={loadingMacd}
            mode={mode} scanResults={scanResults}
            scanSubgroupName={activeSubgroup?.display_name}
            scanLoading={scanLoading}
          />

          {/* Single mode: RSI + MACD panels */}
          {mode === 'single' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              {/* RSI panel */}
              <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...mono, fontSize: 11, color: TXT_2, fontWeight: 700 }}>RSI ({rsiPeriod})</span>
                  {rsiData && <span style={{ ...mono, fontSize: 10, color: TXT_3 }}>· {rsiData.length} points</span>}
                </div>
                <div style={{ padding: '8px 0 8px' }}>
                  <RsiChart
                    data={rsiData} period={rsiPeriod}
                    loading={loadingRsi} error={rsiError}
                    onRetry={() => fetchSignals(activeSymbol, rsiPeriod)}
                  />
                </div>
              </div>

              {/* MACD panel */}
              <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...mono, fontSize: 11, color: TXT_2, fontWeight: 700 }}>MACD (12, 26, 9)</span>
                  {macdData && <span style={{ ...mono, fontSize: 10, color: TXT_3 }}>· {macdData.length} points</span>}
                </div>
                <div style={{ padding: '8px 0 8px' }}>
                  <MacdChart
                    data={macdData}
                    loading={loadingMacd} error={macdError}
                    onRetry={() => fetchSignals(activeSymbol, rsiPeriod)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scanner mode: results card */}
          {mode === 'scanner' && (
            <ScannerResultsCard
              results={scanResults}
              scanLoading={scanLoading}
              scanProgress={scanProgress}
              totalToScan={Math.min((activeSubgroup?.assets?.length ?? 0), 5)}
              subgroupName={activeSubgroup?.display_name}
              scanError={scanError}
              onScanAgain={() => { setScanResults([]); setScanError(null); runScan(); }}
            />
          )}
        </div>
      </div>

      {/* Mobile slide-over panel */}
      {isMobile && panelOpen && (
        <>
          <div onClick={() => setPanelOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, background: BG_SIDE, zIndex: 50, overflowY: 'auto' }}>
            {renderPanel(true)}
          </div>
        </>
      )}
    </MarketsPageLayout>
  );
}
