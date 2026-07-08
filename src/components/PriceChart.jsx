import { useRef, useEffect, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';

/**
 * Shared price chart — the single lightweight-charts v5 surface used by both the
 * AssetDetailDrawer and ChartResearchPage. Extracted from the two (previously
 * duplicated) implementations. This owns ONLY the chart rendering: createChart +
 * the series lifecycle (candle / area / line, volume histogram, %-normalized
 * comparison). Data fetching, timeframe/chart-type controls, and loading/error
 * overlays stay in the parent, which renders those over this component.
 *
 * Props
 *   data            [{ time, open, high, low, close, volume }] ascending
 *   seriesType      'area' | 'candle' | 'line'
 *   showVolume      draw a volume histogram (candle mode)
 *   comparison      [{ data, color }] → renders main + comps as normalized %-change lines
 *   height          container height in px (else fills parent)
 *   crosshairMode   lightweight-charts CrosshairMode (0 Normal / 1 Magnet)
 *   areaDirectional area line color follows up/down (drawer) vs fixed accent (research)
 *   candleBorders   draw candle borders (drawer true / research false)
 *   colors          { up, down, accent, bg, text, grid, border }
 *   recreateKey     changing it tears down + recreates the chart instance
 *   refitKey        changing it refits content after a layout transition
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

// Normalize a candle/line series to %-change from the first point (comparison mode).
function normalizeToPercent(candles) {
  if (!candles || candles.length === 0) return [];
  const first = candles[0].close ?? candles[0].value;
  if (!first) return [];
  return candles.map(c => ({
    time:  c.time,
    value: (((c.close ?? c.value) - first) / first) * 100,
  }));
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
}) {
  const c = { ...DEFAULTS, ...(colors || {}) };
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const mainRef      = useRef(null);
  const volRef       = useRef(null);
  const compRefs     = useRef([]);
  const [gen, setGen] = useState(0);

  // ── Create / recreate the chart instance ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    chartRef.current?.remove();
    mainRef.current = null; volRef.current = null; compRefs.current = [];

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: c.bg }, textColor: c.text, fontFamily: "'JetBrains Mono', monospace" },
      grid:   { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: { mode: crosshairMode },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { mouseWheel: true, pinch: true },
    });
    chartRef.current = chart;
    setGen(g => g + 1); // bridge: signal the series effect to (re)render after (re)creation

    return () => {
      chart.remove();
      chartRef.current = null; mainRef.current = null; volRef.current = null; compRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recreateKey, crosshairMode, c.bg, c.text, c.grid, c.border]);

  // ── Render series when data / type / comparison change ────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainRef.current) { try { chart.removeSeries(mainRef.current); } catch (_) {} mainRef.current = null; }
    if (volRef.current)  { try { chart.removeSeries(volRef.current);  } catch (_) {} volRef.current  = null; }
    compRefs.current.forEach(s => { try { chart.removeSeries(s); } catch (_) {} });
    compRefs.current = [];

    const pts = data;
    if (!pts?.length) return;

    const comps = (comparison || []).filter(x => x?.data?.length);

    if (comps.length) {
      // Comparison: main + comps as normalized %-change lines.
      const main = chart.addSeries(LineSeries, { color: c.accent, lineWidth: 2 });
      main.setData(normalizeToPercent(pts));
      mainRef.current = main;
      comps.forEach(cmp => {
        const s = chart.addSeries(LineSeries, { color: cmp.color, lineWidth: 2 });
        s.setData(normalizeToPercent(cmp.data));
        compRefs.current.push(s);
      });
    } else if (seriesType === 'candle') {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: c.up, downColor: c.down,
        wickUpColor: c.up, wickDownColor: c.down,
        borderVisible: candleBorders, borderUpColor: c.up, borderDownColor: c.down,
      });
      s.setData(pts);
      mainRef.current = s;

      if (showVolume && pts.some(p => p.volume > 0)) {
        const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
        vs.setData(pts.map(p => ({ time: p.time, value: p.volume, color: (p.close >= p.open ? c.up : c.down) + '40' })));
        volRef.current = vs;
      }
    } else if (seriesType === 'line') {
      const s = chart.addSeries(LineSeries, { color: c.accent, lineWidth: 2 });
      s.setData(pts.map(p => ({ time: p.time, value: p.close })));
      mainRef.current = s;
    } else {
      // Area (default). Directional (drawer) colors by up/down; else fixed accent.
      const isUp = pts[pts.length - 1].close >= pts[0].close;
      const lineColor = areaDirectional ? (isUp ? c.up : c.down) : c.accent;
      const s = chart.addSeries(AreaSeries, {
        lineColor, topColor: areaTopColor || (lineColor + '30'), bottomColor: 'rgba(0,0,0,0)', lineWidth: 2,
      });
      s.setData(pts.map(p => ({ time: p.time, value: p.close })));
      mainRef.current = s;
    }

    chart.timeScale().fitContent();
    // Deps include the stable style primitives (candleBorders/areaDirectional/
    // areaTopColor + colors) so a runtime style change re-renders the series;
    // they are constant per caller today so this adds no re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, seriesType, showVolume, comparison, gen, candleBorders, areaDirectional, areaTopColor, c.up, c.down, c.accent]);

  // ── Refit after a layout transition (expand/collapse) ─────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const t = setTimeout(() => { chartRef.current?.timeScale().fitContent(); }, 350);
    return () => clearTimeout(t);
  }, [refitKey]);

  return <div ref={containerRef} style={{ width: '100%', height: height ?? '100%' }} />;
}
