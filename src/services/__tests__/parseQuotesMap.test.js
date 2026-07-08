// parseQuotesMap sparkline sourcing (C3-4): real server series → prev-roll → synthetic seed.
import { describe, it, expect } from 'vitest';
import { parseQuotesMap } from '../../dataServices.js';

const ASSETS = { AAPL: { cat: 'us_equity' } };
const VOL = { us_equity: 0.02 };

describe('parseQuotesMap — sparkline sourcing', () => {
  it('uses the server close series with the live price as the fresh tail', () => {
    const series = [10, 11, 12, 13, 14]; // real ascending closes
    const quotes = { AAPL: { price: 15, changePct: 1, prevClose: 14, sparkline: series } };
    const out = parseQuotesMap(quotes, null, ASSETS, VOL);
    // Real closes preserved + live price appended as the last point.
    expect(out.AAPL.sparkline).toEqual([10, 11, 12, 13, 14, 15]);
    expect(out.AAPL.sparkline.at(-1)).toBe(15);
  });

  it('caps a full 30-point server series at 30 (drops oldest, live price is the tail)', () => {
    const series = Array.from({ length: 30 }, (_, i) => 100 + i); // 100..129
    const quotes = { AAPL: { price: 200, changePct: 0, prevClose: 129, sparkline: series } };
    const out = parseQuotesMap(quotes, null, ASSETS, VOL);
    expect(out.AAPL.sparkline).toHaveLength(30);
    expect(out.AAPL.sparkline.at(-1)).toBe(200);   // live tail
    expect(out.AAPL.sparkline[0]).toBe(101);        // oldest (100) dropped
  });

  it('ignores a degenerate (<2 point) server series and falls back', () => {
    const quotes = { AAPL: { price: 15, changePct: 1, prevClose: 14, sparkline: [15] } };
    const prev = { AAPL: { sparkline: Array.from({ length: 30 }, (_, i) => i) } }; // 0..29
    const out = parseQuotesMap(quotes, prev, ASSETS, VOL);
    // Rolled the previous sparkline: drop the head, append live price.
    expect(out.AAPL.sparkline).toHaveLength(30);
    expect(out.AAPL.sparkline.at(-1)).toBe(15);
    expect(out.AAPL.sparkline[0]).toBe(1); // 0 shifted off
  });

  it('rolls the previous sparkline when no server series is present', () => {
    const quotes = { AAPL: { price: 42, changePct: 1, prevClose: 41 } }; // no sparkline
    const prev = { AAPL: { sparkline: Array.from({ length: 30 }, (_, i) => i) } };
    const out = parseQuotesMap(quotes, prev, ASSETS, VOL);
    expect(out.AAPL.sparkline).toHaveLength(30);
    expect(out.AAPL.sparkline.at(-1)).toBe(42);
    expect(out.AAPL.sparkline[0]).toBe(1);
  });

  it('synthesizes a seed (finite, live-price tail) when neither server nor prev series exists', () => {
    const quotes = { AAPL: { price: 42, changePct: 1, prevClose: 41 } };
    const out = parseQuotesMap(quotes, null, ASSETS, VOL);
    expect(out.AAPL.sparkline).toHaveLength(30);
    expect(out.AAPL.sparkline.at(-1)).toBe(42); // live tail
    expect(out.AAPL.sparkline.every((n) => Number.isFinite(n))).toBe(true);
  });
});
