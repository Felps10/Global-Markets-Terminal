// PriceChart — zoom/viewport model (PR-C):
// - the visible range survives config-only series rebuilds and refits only
//   when the data array itself changes;
// - display-only mounts (interactive:false) get no wheel/drag handlers;
// - zoom is bounded via the timeScale options;
// - fitSignal forces a fit-all.
// lightweight-charts is mocked; each fake chart exposes stable, inspectable
// timeScale/priceScale objects.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import PriceChart from '../PriceChart.jsx';

const charts = vi.hoisted(() => []);

vi.mock('lightweight-charts', () => {
  const fakeSeries = () => ({ setData: vi.fn() });
  const fakeChart = () => {
    const timeScale = {
      fitContent: vi.fn(),
      getVisibleLogicalRange: vi.fn(() => ({ from: 3, to: 7 })),
      setVisibleLogicalRange: vi.fn(),
      subscribeVisibleLogicalRangeChange: vi.fn(),
      unsubscribeVisibleLogicalRangeChange: vi.fn(),
      scrollToRealTime: vi.fn(),
    };
    const chart = {
      remove: vi.fn(),
      addSeries: vi.fn(() => fakeSeries()),
      removeSeries: vi.fn(),
      priceScale: vi.fn(() => ({ applyOptions: vi.fn(), width: vi.fn(() => 70) })),
      timeScale: vi.fn(() => timeScale),
      _timeScale: timeScale,
      panes: vi.fn(() => [{}]),
      subscribeCrosshairMove: vi.fn(),
      unsubscribeCrosshairMove: vi.fn(),
      subscribeDblClick: vi.fn(),
      unsubscribeDblClick: vi.fn(),
    };
    charts.push(chart);
    return chart;
  };
  return {
    createChart: vi.fn(() => fakeChart()),
    createTextWatermark: vi.fn(() => ({ detach: vi.fn() })),
    CandlestickSeries: 'CandlestickSeries',
    AreaSeries: 'AreaSeries',
    LineSeries: 'LineSeries',
    HistogramSeries: 'HistogramSeries',
    LineStyle: { Solid: 0, Dashed: 2 },
    PriceScaleMode: { Normal: 0, Logarithmic: 1, Percentage: 2 },
  };
});

const candles = (n = 5, base = 10) => Array.from({ length: n }, (_, i) => ({
  time: 1751328000 + i * 86400, open: base + i, high: base + i + 1, low: base + i - 1,
  close: base + i + 0.5, volume: 100,
}));

beforeEach(() => {
  vi.clearAllMocks();
  charts.length = 0;
});

describe('PriceChart viewport model', () => {
  it('fits on first data, preserves the visible range on config-only rebuilds', () => {
    const data = candles();
    const { rerender } = render(<PriceChart data={data} seriesType="area" />);
    const ts = charts[0]._timeScale;
    expect(ts.fitContent).toHaveBeenCalledTimes(1); // initial dataset

    rerender(<PriceChart data={data} seriesType="candle" />); // config toggle, same array
    expect(ts.fitContent).toHaveBeenCalledTimes(1); // NOT refit
    expect(ts.setVisibleLogicalRange).toHaveBeenCalledWith({ from: 3, to: 7 }); // restored

    rerender(<PriceChart data={candles(8, 50)} seriesType="candle" />); // new dataset
    expect(ts.fitContent).toHaveBeenCalledTimes(2); // refit for new data
  });

  it('disables scroll/scale handlers and reset gestures when interactive is false', () => {
    render(<PriceChart data={candles()} interactive={false} />);
    const opts = createChart.mock.calls[0][1];
    expect(opts.handleScroll).toBe(false);
    expect(opts.handleScale).toBe(false);
    expect(charts[0].subscribeDblClick).not.toHaveBeenCalled();
    expect(charts[0]._timeScale.subscribeVisibleLogicalRangeChange).not.toHaveBeenCalled();
  });

  it('wires reset gestures and bounded zoom options when interactive', () => {
    render(<PriceChart data={candles()} />);
    const opts = createChart.mock.calls[0][1];
    expect(opts.timeScale).toMatchObject({ fixLeftEdge: true, rightOffset: 5 });
    // maxBarSpacing/lockVisibleTimeRangeOnResize must stay UNSET: the former
    // caps fitContent (few-bar series cram into a left sliver), the latter
    // fights fixLeftEdge on width resizes.
    expect(opts.timeScale.maxBarSpacing).toBeUndefined();
    expect(opts.timeScale.lockVisibleTimeRangeOnResize).toBeUndefined();
    expect(opts.handleScroll).toMatchObject({ mouseWheel: true });
    expect(charts[0].subscribeDblClick).toHaveBeenCalledTimes(1);
    expect(charts[0]._timeScale.subscribeVisibleLogicalRangeChange).toHaveBeenCalledTimes(1);
  });

  it('refits (not restores) when the comparison set changes — union indices remap', () => {
    const data = candles();
    const { rerender } = render(<PriceChart data={data} />);
    const ts = charts[0]._timeScale;
    expect(ts.fitContent).toHaveBeenCalledTimes(1);
    const comparison = [{ data: candles(7, 30), color: '#f59e0b' }];
    rerender(<PriceChart data={data} comparison={comparison} />);
    expect(ts.fitContent).toHaveBeenCalledTimes(2); // refit, not restore
    rerender(<PriceChart data={data} comparison={comparison} showVolume />); // same set → preserve
    expect(ts.fitContent).toHaveBeenCalledTimes(2);
  });

  it('fitSignal increments force a fit-all', () => {
    const data = candles();
    const { rerender } = render(<PriceChart data={data} fitSignal={0} />);
    const ts = charts[0]._timeScale;
    expect(ts.fitContent).toHaveBeenCalledTimes(1);
    rerender(<PriceChart data={data} fitSignal={1} />);
    expect(ts.fitContent).toHaveBeenCalledTimes(2);
  });
});
