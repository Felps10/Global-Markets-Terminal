// Shared market-data fixtures for component tests (asset drawer, Chart &
// Research page). vi.mock factories can't be shared across files (vitest
// hoists them per-file), but the data they return can — keep quote fields and
// candle shapes identical everywhere so cross-surface assertions stay honest.

export const QUOTE = {
  price: 41.08, change: -2.97, changePct: -6.74,
  open: 42.67, prevClose: 44.05, dayHigh: 43.23, dayLow: 40.95,
  w52High: 73.74, w52Low: 25.78, volume: 3_800_000, avgVolume: 4_000_000,
  marketCap: 5_410_000_000, timestamp: 1752696000,
};

// n ascending daily candles: closes base→base+n−1, highs +2, lows −2.
export const candles = (n = 11, base = 100) => Array.from({ length: n }, (_, i) => ({
  time: `2026-06-${String(i + 1).padStart(2, '0')}`,
  open: base + i, high: base + i + 2, low: base + i - 2,
  close: base + i, volume: 1_000_000,
}));
