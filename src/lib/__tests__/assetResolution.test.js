// Duplicate-tolerant taxonomy resolution: whatever order the API returns
// duplicate-symbol rows in, every consumer must pick the same winner (the row
// carrying meta.isB3). Regression guard for the 2026-07-14 incident where
// first-match and last-write-wins consumers disagreed about the same symbol.
import { describe, it, expect } from 'vitest';
import { resolveAsset, buildAssetMap, buildIsB3Map, metaOf } from '../assetResolution.js';

const brRow   = { symbol: 'BBDC4', subgroup_id: 'br-acoes', meta: { isB3: true } };
const glbRow  = { symbol: 'BBDC4', subgroup_id: 'brazil-highlights', meta: { yahooSymbol: 'BBDC4.SA' } };
const plain   = { symbol: 'AAPL', subgroup_id: 'technology', meta: null };

describe('assetResolution', () => {
  it('resolveAsset prefers the isB3 row regardless of order', () => {
    expect(resolveAsset([brRow, glbRow], 'BBDC4')).toBe(brRow);
    expect(resolveAsset([glbRow, brRow], 'BBDC4')).toBe(brRow);
  });

  it('resolveAsset falls back to the first occurrence when no row has isB3', () => {
    const dup1 = { symbol: 'IEP', meta: null };
    const dup2 = { symbol: 'IEP', meta: { bcbSeries: 1 } };
    expect(resolveAsset([dup1, dup2], 'IEP')).toBe(dup1);
    expect(resolveAsset([plain], 'AAPL')).toBe(plain);
    expect(resolveAsset([plain], 'MISSING')).toBeNull();
    expect(resolveAsset(null, 'AAPL')).toBeNull();
  });

  it('buildAssetMap keeps the isB3 row for duplicates, both orders', () => {
    expect(buildAssetMap([brRow, glbRow]).BBDC4).toBe(brRow);
    expect(buildAssetMap([glbRow, brRow]).BBDC4).toBe(brRow);
    expect(buildAssetMap([plain]).AAPL).toBe(plain);
  });

  it('buildIsB3Map is sticky on isB3 across duplicate rows, both orders', () => {
    expect(buildIsB3Map([brRow, glbRow]).BBDC4.isB3).toBe(true);
    expect(buildIsB3Map([glbRow, brRow]).BBDC4.isB3).toBe(true);
    expect(buildIsB3Map([plain]).AAPL.isB3).toBe(false);
  });

  it('agrees across helpers when BOTH duplicate rows carry isB3 (live prod shape after migration 017)', () => {
    const glbFlagged = { ...glbRow, meta: { isB3: true, yahooSymbol: 'BBDC4.SA' } };
    // First flagged row wins in every helper, both orders — resolveAsset and
    // buildAssetMap must return the SAME row so no two consumers disagree.
    expect(resolveAsset([brRow, glbFlagged], 'BBDC4')).toBe(brRow);
    expect(buildAssetMap([brRow, glbFlagged]).BBDC4).toBe(brRow);
    expect(resolveAsset([glbFlagged, brRow], 'BBDC4')).toBe(glbFlagged);
    expect(buildAssetMap([glbFlagged, brRow]).BBDC4).toBe(glbFlagged);
    expect(buildIsB3Map([brRow, glbFlagged]).BBDC4.isB3).toBe(true);
  });

  it('buildAssetMap falls back to the first occurrence for flagless duplicates (agrees with resolveAsset)', () => {
    const dup1 = { symbol: 'IEP', meta: null };
    const dup2 = { symbol: 'IEP', meta: { bcbSeries: 1 } };
    expect(buildAssetMap([dup1, dup2]).IEP).toBe(dup1);
    expect(buildAssetMap([dup2, dup1]).IEP).toBe(dup2);
    expect(buildAssetMap([dup1, dup2]).IEP).toBe(resolveAsset([dup1, dup2], 'IEP'));
  });

  it('metaOf tolerates string meta and null', () => {
    expect(metaOf({ meta: '{"isB3": true}' }).isB3).toBe(true);
    expect(metaOf({ meta: 'not json' })).toEqual({});
    expect(metaOf({ meta: 'null' }), 'JSON null string must not crash callers').toEqual({});
    expect(metaOf({ meta: '42' })).toEqual({});
    expect(metaOf({ meta: null })).toEqual({});
    expect(metaOf(null)).toEqual({});
    expect(resolveAsset([{ symbol: 'X', meta: '{"isB3": true}' }, { symbol: 'X', meta: null }], 'X')?.meta)
      .toBe('{"isB3": true}');
  });
});
