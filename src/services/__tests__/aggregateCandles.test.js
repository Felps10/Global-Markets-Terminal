// aggregateCandles — daily → weekly ('1wk', ISO weeks) / monthly ('1mo')
// buckets. Pure math over the fmpOHLCV candle shape; both time formats
// ('YYYY-MM-DD' strings and Unix seconds) must group identically.
// aggregateForDisplay — the chart-facing wrapper: aggregated buckets when
// they yield a chartable series, the raw dailies otherwise.
import { describe, it, expect } from 'vitest';
import { aggregateCandles, aggregateForDisplay } from '../../dataServices.js';

const day = (date, open, high, low, close, volume = 100) =>
  ({ time: date, open, high, low, close, volume });

describe('aggregateCandles', () => {
  it('passes through empty/unknown input unchanged', () => {
    expect(aggregateCandles(null, '1wk')).toBeNull();
    expect(aggregateCandles([], '1mo')).toEqual([]);
    const c = [day('2026-06-01', 1, 2, 0, 1)];
    expect(aggregateCandles(c, '5m')).toBe(c); // not an aggregation bucket
  });

  it('groups a week of dailies into one OHLC bar (open=first, close=last, extremes, vol sum)', () => {
    // 2026-06-01 is a Monday; 06-05 is the Friday of the same ISO week.
    const out = aggregateCandles([
      day('2026-06-01', 10, 12, 9, 11),
      day('2026-06-02', 11, 15, 10, 14),
      day('2026-06-03', 14, 14, 7, 8),
      day('2026-06-04', 8, 9, 7.5, 9),
      day('2026-06-05', 9, 10, 8, 9.5),
    ], '1wk');
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ time: '2026-06-01', open: 10, high: 15, low: 7, close: 9.5, volume: 500 });
  });

  it('splits ISO weeks at the Monday boundary', () => {
    const out = aggregateCandles([
      day('2026-06-05', 1, 2, 1, 2),  // Friday, week A
      day('2026-06-08', 3, 4, 3, 4),  // Monday, week B
      day('2026-06-09', 4, 5, 4, 5),
    ], '1wk');
    expect(out).toHaveLength(2);
    expect(out[0].close).toBe(2);
    expect(out[1].open).toBe(3);
    expect(out[1].close).toBe(5);
  });

  it('keeps a Sunday with the preceding Monday-started ISO week', () => {
    const out = aggregateCandles([
      day('2026-06-01', 1, 1, 1, 1), // Monday
      day('2026-06-07', 2, 2, 2, 2), // Sunday, same ISO week
      day('2026-06-08', 3, 3, 3, 3), // next Monday
    ], '1wk');
    expect(out).toHaveLength(2);
    expect(out[0].close).toBe(2);
  });

  it('groups by calendar month for 1mo, across year boundaries', () => {
    const out = aggregateCandles([
      day('2025-12-30', 1, 2, 1, 2),
      day('2025-12-31', 2, 3, 2, 3),
      day('2026-01-02', 5, 6, 4, 5),
      day('2026-01-30', 5, 8, 5, 7),
    ], '1mo');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ time: '2025-12-30', open: 1, high: 3, low: 1, close: 3 });
    expect(out[1]).toMatchObject({ time: '2026-01-02', open: 5, high: 8, low: 4, close: 7 });
  });

  it('handles Unix-second times identically to date strings', () => {
    const ts = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);
    const out = aggregateCandles([
      day(ts('2026-06-05'), 1, 2, 1, 2),
      day(ts('2026-06-08'), 3, 4, 3, 4),
    ], '1wk');
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe(ts('2026-06-05'));
  });

  it('skips candles with unparseable times instead of crashing', () => {
    const out = aggregateCandles([
      day('garbage', 1, 2, 1, 2),
      day('2026-06-08', 3, 4, 3, 4),
    ], '1wk');
    expect(out).toHaveLength(1);
    expect(out[0].open).toBe(3);
  });

  it('ignores non-finite highs/lows instead of poisoning the bucket extremes', () => {
    const out = aggregateCandles([
      day('2026-06-01', 10, 12, 9, 11),
      { time: '2026-06-02', open: 11, high: undefined, low: null, close: 12, volume: 50 },
    ], '1wk');
    expect(out).toHaveLength(1);
    expect(out[0].high).toBe(12);
    expect(out[0].low).toBe(9);
  });
});

describe('aggregateForDisplay', () => {
  it('returns aggregated buckets when there are at least 2', () => {
    const out = aggregateForDisplay([
      day('2026-06-05', 1, 2, 1, 2),
      day('2026-06-08', 3, 4, 3, 4),
    ], '1wk');
    expect(out).toHaveLength(2);
  });

  it('falls back to the raw dailies when aggregation yields <2 buckets', () => {
    // A young listing on MAX ('1mo' default): 3 dailies, one calendar month.
    const dailies = [
      day('2026-06-01', 1, 2, 1, 2),
      day('2026-06-02', 2, 3, 2, 3),
      day('2026-06-03', 3, 4, 3, 4),
    ];
    expect(aggregateForDisplay(dailies, '1mo')).toBe(dailies);
  });

  it('passes through null and non-aggregation buckets', () => {
    expect(aggregateForDisplay(null, '1wk')).toBeNull();
    const dailies = [day('2026-06-01', 1, 2, 1, 2)];
    expect(aggregateForDisplay(dailies, '5m')).toBe(dailies);
  });
});
