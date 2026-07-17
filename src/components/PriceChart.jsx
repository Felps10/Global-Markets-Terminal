import { useRef, useEffect, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  HistogramSeries,
  createTextWatermark,
  LineStyle,
  PriceScaleMode,
} from 'lightweight-charts';

/**
 * Shared price chart — the single lightweight-charts v5 surface used by the
 * AssetDetailDrawer and ChartResearchPage. Owns createChart + the series
 * lifecycle (candle / area / line, volume, %-normalized comparison) PLUS the
 * pro-terminal polish (crosshair OHLC legend, last-price line, dashed
 * crosshair, ticker watermark). Data fetching, timeframe/type controls, and
 * loading/error overlays stay in the parent.
 *
 * Props
 *   data            [{ time, open, high, low, close, volume }] ascending
 *   seriesType      'area' | 'candle' | 'line'
 *   showVolume      volume histogram (candle mode)
 *   comparison      [{ data, color }] → main + comps as normalized %-change lines
 *   height          container height (px); else fills parent
 *   crosshairMode   0 Normal / 1 Magnet
 *   areaDirectional area line color follows up/down (drawer) vs fixed accent
 *   candleBorders   draw candle borders
 *   areaTopColor    explicit area fill (else derived from the line color)
 *   colors          { up, down, accent, bg, text, grid, border }
 *   recreateKey     changing it tears down + recreates the chart
 *   refitKey        changing it refits content after a layout transition
 *   symbol          ticker for the legend + watermark
 *   intervalLabel   e.g. '1M' / '5m' — shown after the ticker in the legend
 *   showLegend      crosshair OHLC legend overlay (default true)
 *   showWatermark   faint centered ticker watermark (default true)
 *   lastPriceLine   dashed last-price line + right-axis badge (default true)
 *   scaleMode       PriceScaleMode 0 linear / 1 log / 2 percent (default 0)
 *   watermarkColor  watermark text color
 */

const DEFAULTS = {
  up:     '#00E676',
  down:   '#ff5252',
  accent: '#3b82f6',
  bg:     '#0d1824',
  text:   '#94a3b8',
  grid:   'rgba(30,41,59,0.4)',
  border: 'rgba(30,41,59,0.6)',
};

function fmtN(v) {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toFixed(2);
}

// Build the legend row from a data / crosshair bar.
function makeLegend(bar, seriesType, base) {
  if (!bar) return null;
  if (seriesType === 'candle' && bar.open != null) {
    const cl = bar.close;
    return { ohlc: true, o: bar.open, h: bar.high, l: bar.low, c: cl, up: cl >= bar.open,
      chg: bar.open ? ((cl - bar.open) / bar.open) * 100 : null };
  }
  const cl = bar.close ?? bar.value;
  const chg = base ? ((cl - base) / base) * 100 : null;
  return { ohlc: false, c: cl, up: (chg ?? 0) >= 0, chg };
}

// Simple moving average over the candle closes (rolling sum, O(n)).
function sma(pts, period) {
  if (!pts || pts.length < period) return [];
  const out = [];
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    sum += pts[i].close;
    if (i >= period) sum -= pts[i - period].close;
    if (i >= period - 1) out.push({ time: pts[i].time, value: sum / period });
  }
  return out;
}

export default function PriceChart({
  data,
  seriesType = 'area',
  showVolume = false,
  comparison = null,
  height,
  crosshairMode = 0,
  areaDirectional = false,
  candleBorders = true,
  areaTopColor,
  colors,
  recreateKey,
  refitKey,
  symbol,
  intervalLabel,
  showLegend = true,
  showWatermark = true,
  lastPriceLine = true,
  scaleMode = 0,
  movingAverages = null,
  watermarkColor = 'rgba(255,255,255,0.045)',
}) {
  const c = { ...DEFAULTS, ...(colors || {}) };
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const mainRef      = useRef(null);
  const volRef       = useRef(null);
  const compRefs     = useRef([]);
  const maRefs       = useRef([]);
  const [gen, setGen] = useState(0);
  const [legend, setLegend] = useState(null);

  const hasComparison = !!(comparison && comparison.length);

  // ── Create / recreate the chart instance ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    chartRef.current?.remove();
    mainRef.current = null; volRef.current = null; compRefs.current = [];

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: c.bg }, textColor: c.text, fontFamily: "'JetBrains Mono', monospace", attributionLogo: false },
      grid:   { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: {
        mode: crosshairMode,
        vertLine: { color: 'rgba(148,152,161,0.35)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e2d3d' },
        horzLine: { color: 'rgba(148,152,161,0.35)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e2d3d' },
      },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { mouseWheel: true, pinch: true },
    });
    chartRef.current = chart;
    setGen(g => g + 1); // bridge: signal the series effect to (re)render

    return () => {
      chart.remove();
      chartRef.current = null; mainRef.current = null; volRef.current = null; compRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recreateKey, crosshairMode, c.bg, c.text, c.grid, c.border]);

  // ── Price-scale mode (linear / log / percent) — no recreate needed ────────
  // In comparison mode the right scale switches to native Percentage so every
  // series rebaselines to the first *visible* bar (rebases on zoom/scroll) —
  // the standard charting-platform %-comparison behavior, replacing the old
  // fixed-baseline normalizeToPercent transform.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const mode = hasComparison ? PriceScaleMode.Percentage : scaleMode;
    try { chart.priceScale('right').applyOptions({ mode }); } catch (_) {}
  }, [scaleMode, hasComparison, gen]);

  // ── Ticker watermark (faint, centered) ────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !showWatermark || !symbol) return;
    let wm;
    try {
      wm = createTextWatermark(chart.panes()[0], {
        horzAlign: 'center', vertAlign: 'center',
        lines: [{ text: symbol, color: watermarkColor, fontSize: 44, fontFamily: "'JetBrains Mono', monospace", fontStyle: 'bold' }],
      });
    } catch (_) {}
    return () => { try { wm?.detach(); } catch (_) {} };
  }, [symbol, showWatermark, watermarkColor, gen]);

  // ── Render series when data / type / comparison change ────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainRef.current) { try { chart.removeSeries(mainRef.current); } catch (_) {} mainRef.current = null; }
    if (volRef.current)  { try { chart.removeSeries(volRef.current);  } catch (_) {} volRef.current  = null; }
    compRefs.current.forEach(s => { try { chart.removeSeries(s); } catch (_) {} });
    compRefs.current = [];
    maRefs.current.forEach(s => { try { chart.removeSeries(s); } catch (_) {} });
    maRefs.current = [];

    const pts = data;
    if (!pts?.length) { setLegend(null); return; }

    const isUp = pts[pts.length - 1].close >= pts[0].close;
    const lastLineOpts = lastPriceLine
      ? { priceLineVisible: true, lastValueVisible: true, priceLineStyle: LineStyle.Dashed, priceLineColor: isUp ? c.up : c.down }
      : { priceLineVisible: false, lastValueVisible: false };

    const comps = (comparison || []).filter(x => x?.data?.length);

    if (comps.length) {
      // Raw closes on a Percentage-mode price scale (set in the scale-mode
      // effect) → lightweight-charts rebaselines each line to its first visible
      // value, so the axis reads % and comparison rebases as you zoom/scroll.
      const toClose = arr => arr.map(p => ({ time: p.time, value: p.close ?? p.value }));
      const main = chart.addSeries(LineSeries, { color: c.accent, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      main.setData(toClose(pts));
      mainRef.current = main;
      comps.forEach(cmp => {
        const s = chart.addSeries(LineSeries, { color: cmp.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
        s.setData(toClose(cmp.data));
        compRefs.current.push(s);
      });
    } else if (seriesType === 'candle') {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down,
        borderVisible: candleBorders, borderUpColor: c.up, borderDownColor: c.down,
        ...lastLineOpts,
      });
      s.setData(pts);
      mainRef.current = s;
    } else if (seriesType === 'line') {
      const s = chart.addSeries(LineSeries, { color: c.accent, lineWidth: 2, ...lastLineOpts });
      s.setData(pts.map(p => ({ time: p.time, value: p.close })));
      mainRef.current = s;
    } else {
      const lineColor = areaDirectional ? (isUp ? c.up : c.down) : c.accent;
      const s = chart.addSeries(AreaSeries, {
        lineColor, topColor: areaTopColor || (lineColor + '30'), bottomColor: 'rgba(0,0,0,0)', lineWidth: 2, ...lastLineOpts,
      });
      s.setData(pts.map(p => ({ time: p.time, value: p.close })));
      mainRef.current = s;
    }

    // Volume histogram (bottom overlay, any series type; single-asset only).
    if (!comps.length && showVolume && pts.some(p => p.volume > 0)) {
      const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vs.setData(pts.map(p => ({ time: p.time, value: p.volume, color: (p.close >= p.open ? c.up : c.down) + '40' })));
      volRef.current = vs;
    }

    // Moving-average overlays on the price scale (single-asset only). SMA computed
    // client-side from closes — free, works for every timeframe/class; a longer MA
    // simply doesn't render when there aren't enough bars.
    if (!comps.length && movingAverages?.length) {
      for (const ma of movingAverages) {
        const line = sma(pts, ma.period);
        if (line.length < 2) continue;
        const s = chart.addSeries(LineSeries, {
          color: ma.color, lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        s.setData(line);
        maRefs.current.push(s);
      }
    }

    chart.timeScale().fitContent();

    // Crosshair legend: hovered bar (falls back to the last bar), single-asset only.
    const base = pts[0].close ?? pts[0].value;
    setLegend(hasComparison ? null : makeLegend(pts[pts.length - 1], seriesType, base));
    const onMove = (param) => {
      if (hasComparison) { setLegend(null); return; }
      const s = mainRef.current;
      const point = s ? param?.seriesData?.get(s) : null;
      setLegend(makeLegend(point || pts[pts.length - 1], seriesType, base));
    };
    chart.subscribeCrosshairMove(onMove);
    return () => { try { chart.unsubscribeCrosshairMove(onMove); } catch (_) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, seriesType, showVolume, comparison, movingAverages, gen, candleBorders, areaDirectional, areaTopColor, lastPriceLine, c.up, c.down, c.accent]);

  // ── Refit after a layout transition (expand/collapse) ─────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const t = setTimeout(() => { chartRef.current?.timeScale().fitContent(); }, 350);
    return () => clearTimeout(t);
  }, [refitKey]);

  return (
    <div style={{ position: 'relative', width: '100%', height: height ?? '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {showLegend && legend && (
        <div style={{
          position: 'absolute', top: 8, left: 10, zIndex: 3, pointerEvents: 'none',
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5,
        }}>
          {symbol && (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: c.text, letterSpacing: '0.02em' }}>
              {symbol}{intervalLabel ? ` · ${intervalLabel}` : ''}
            </div>
          )}
          <div style={{ fontSize: 11, color: legend.up ? c.up : c.down }}>
            {legend.ohlc ? (
              <>
                <span style={{ color: c.text }}>O</span> {fmtN(legend.o)}{'  '}
                <span style={{ color: c.text }}>H</span> {fmtN(legend.h)}{'  '}
                <span style={{ color: c.text }}>L</span> {fmtN(legend.l)}{'  '}
                <span style={{ color: c.text }}>C</span> {fmtN(legend.c)}
                {legend.chg != null && <>{'  '}{legend.chg >= 0 ? '+' : ''}{legend.chg.toFixed(2)}%</>}
              </>
            ) : (
              <>
                <span style={{ fontWeight: 700 }}>{fmtN(legend.c)}</span>
                {legend.chg != null && <>{'  '}{legend.chg >= 0 ? '+' : ''}{legend.chg.toFixed(2)}%</>}
              </>
            )}
          </div>
          {movingAverages?.length > 0 && !hasComparison && (
            <div style={{ display: 'flex', gap: 10, marginTop: 2, fontSize: 10 }}>
              {/* Only label MAs that actually rendered — sma() needs period+1
                  bars, so e.g. MA200 has no line on a 52-bar weekly series. */}
              {movingAverages.filter(ma => (data?.length || 0) >= ma.period + 1).map(ma => (
                <span key={ma.period} style={{ color: ma.color }}>MA{ma.period}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
