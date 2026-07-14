// computeMacd — MACD from daily closes (12/26/9). Pure math; replaces AlphaVantage MACD.
import { describe, it, expect } from 'vitest';
import { computeMacd } from '../../dataServices.js';

const ramp = (n, start = 1, step = 1) => Array.from({ length: n }, (_, i) => start + i * step);

describe('computeMacd', () => {
  it('returns [] when there are too few closes', () => {
    expect(computeMacd(ramp(10))).toEqual([]);       // < slow+signal (35)
    expect(computeMacd([])).toEqual([]);
    expect(computeMacd(null)).toEqual([]);
  });

  it('emits N − slow − signal + 2 rows (first row where both MACD and its signal EMA exist)', () => {
    const rows = computeMacd(ramp(50)); // 50 − 26 − 9 + 2 = 17
    expect(rows.length).toBe(17);
    // `i` indexes back into the input; the first defined signal is at index slow-1 + signal-1 = 33.
    expect(rows[0].i).toBe(33);
    expect(rows[rows.length - 1].i).toBe(49);
  });

  it('histogram always equals macd − signal', () => {
    for (const r of computeMacd(ramp(60))) {
      expect(r.hist).toBeCloseTo(r.macd - r.signal, 10);
    }
  });

  it('is ~0 across the board for a flat series (fast EMA === slow EMA)', () => {
    for (const r of computeMacd(Array(60).fill(100))) {
      expect(r.macd).toBeCloseTo(0, 9);
      expect(r.signal).toBeCloseTo(0, 9);
      expect(r.hist).toBeCloseTo(0, 9);
    }
  });

  it('is positive on a steadily rising series (fast EMA leads above slow EMA)', () => {
    const rows = computeMacd(ramp(80));
    expect(rows[rows.length - 1].macd).toBeGreaterThan(0);
  });

  it('is negative on a steadily falling series', () => {
    const rows = computeMacd(ramp(80, 200, -1)); // 200,199,…
    expect(rows[rows.length - 1].macd).toBeLessThan(0);
  });

  it('honors custom periods', () => {
    const rows = computeMacd(ramp(40), { fast: 5, slow: 10, signal: 4 }); // 40 − 10 − 4 + 2 = 28
    expect(rows.length).toBe(28);
    expect(rows[0].i).toBe(12); // (10-1) + (4-1)
  });
});
