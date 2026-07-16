// computePeriodStats — period return / high / low over an ascending OHLCV
// candle array (the fmpOHLCV shape). Pure math, no API calls. No volume stats
// by design: per-candle volume units vary with the bar interval.
import { describe, it, expect } from 'vitest';
import { computePeriodStats } from '../../dataServices.js';

const candle = (open, high, low, close, volume = 0, time = 0) =>
  ({ time, open, high, low, close, volume });

describe('computePeriodStats', () => {
  it('returns null without at least 2 candles', () => {
    expect(computePeriodStats(null)).toBeNull();
    expect(computePeriodStats(undefined)).toBeNull();
    expect(computePeriodStats([])).toBeNull();
    expect(computePeriodStats([candle(10, 11, 9, 10)])).toBeNull();
    expect(computePeriodStats('not-an-array')).toBeNull();
  });

  it('computes return % from first close to last close', () => {
    const stats = computePeriodStats([
      candle(100, 105, 99, 100),
      candle(100, 112, 100, 110),
      candle(110, 126, 108, 125),
    ]);
    expect(stats.returnPct).toBeCloseTo(25, 10); // (125 − 100) / 100
  });

  it('takes high/low across the whole span, not just the endpoints', () => {
    const stats = computePeriodStats([
      candle(100, 101, 98, 100),
      candle(100, 140, 60, 101), // intraperiod extremes
      candle(101, 103, 99, 102),
    ]);
    expect(stats.high).toBe(140);
    expect(stats.low).toBe(60);
  });

  it('nulls returnPct when the first close is 0 or non-finite', () => {
    expect(computePeriodStats([candle(0, 1, 0, 0), candle(1, 2, 1, 2)]).returnPct).toBeNull();
    expect(computePeriodStats([candle(1, 1, 1, null), candle(1, 2, 1, 2)]).returnPct).toBeNull();
  });

  it('nulls returnPct when the last close is null instead of reading it as −100%', () => {
    const stats = computePeriodStats([candle(50, 51, 49, 50), candle(50, 51, 49, null)]);
    expect(stats.returnPct).toBeNull();
  });

  it('skips non-finite highs/lows instead of poisoning the extremes', () => {
    const stats = computePeriodStats([
      candle(10, 12, 9, 11),
      { time: 1, open: 11, high: undefined, low: null, close: 12, volume: 50 },
      candle(12, 13, 10, 12),
    ]);
    expect(stats.high).toBe(13);
    expect(stats.low).toBe(9);
  });

  it('reports negative returns for a falling series', () => {
    const stats = computePeriodStats([candle(50, 51, 49, 50), candle(50, 50, 30, 31)]);
    expect(stats.returnPct).toBeCloseTo(-38, 10);
  });
});
