// PriceChart — no vendor attribution on charts.
// Mounts the real PriceChart with lightweight-charts mocked and asserts that
// createChart is always called with layout.attributionLogo: false, so the
// library's default TradingView logo/link never renders on any chart surface
// (drawer, Chart Research, or future consumers of this shared component).
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import PriceChart from '../PriceChart.jsx';

vi.mock('lightweight-charts', () => {
  const fakeSeries = () => ({ setData: vi.fn() });
  const fakeChart = () => ({
    remove: vi.fn(),
    addSeries: vi.fn(() => fakeSeries()),
    removeSeries: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
    timeScale: vi.fn(() => ({
      fitContent: vi.fn(),
      getVisibleLogicalRange: vi.fn(() => null),
      setVisibleLogicalRange: vi.fn(),
      subscribeVisibleLogicalRangeChange: vi.fn(),
      unsubscribeVisibleLogicalRangeChange: vi.fn(),
      scrollToRealTime: vi.fn(),
    })),
    panes: vi.fn(() => [{}]),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
    subscribeDblClick: vi.fn(),
    unsubscribeDblClick: vi.fn(),
  });
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

const DATA = [
  { time: 1751328000, open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
  { time: 1751414400, open: 10.5, high: 12, low: 10, close: 11.2, volume: 120 },
];

describe('PriceChart — vendor attribution logo', () => {
  it('disables the lightweight-charts attribution logo on every chart', () => {
    render(<PriceChart data={DATA} symbol="TEST" seriesType="candle" />);
    expect(createChart).toHaveBeenCalled();
    for (const call of createChart.mock.calls) {
      expect(call[1].layout.attributionLogo).toBe(false);
    }
  });
});
