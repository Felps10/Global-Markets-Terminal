// Regression: brazil-highlights duplicate-symbol collision (2026-07-14).
// 20 headline B3 tickers exist twice in assets.js (br-acoes + brazil-highlights).
// STATIC_ASSETS_MAP is keyed by symbol with last-write-wins, so a highlights row
// without meta.isB3 silently erased the flag — bare-symbol quote/chart 502s and
// the tickers dropped from the Brazil terminal grid. These tests pin the invariant
// that duplicate rows can never disagree on B3 identity again.
import { describe, it, expect } from 'vitest';
import { ASSETS } from '../../data/assets.js';
import { STATIC_ASSETS_MAP, buildStaticAssetsMap } from '../gmtConfig.js';
import { SECTOR_META } from '../../data/b3Sectors.js';

// The 20 symbols that lost isB3 in the original incident.
const HEADLINE_B3 = [
  'ITUB4', 'BBDC4', 'BBAS3', 'BPAC11', 'B3SA3', 'PETR4', 'VALE3', 'GGBR4',
  'JBSS3', 'LREN3', 'MGLU3', 'ABEV3', 'EQTL3', 'RENT3', 'WEGE3', 'EMBR3',
  'RDOR3', 'TOTS3', 'SUZB3', '^BVSP',
];

// The Brazil grid silently drops any equity-br entry whose sector is not a
// SECTOR_META key — imported from the shared data module, not transcribed.
const GRID_SECTORS = Object.keys(SECTOR_META);

// B3-exchange rows that are legitimately NOT BRAPI-quotable (no isB3):
// the DI1 futures curve rows.
const NON_QUOTABLE_B3_TYPES = new Set(['rate']);

const rowsBySymbol = new Map();
for (const a of ASSETS) {
  if (!rowsBySymbol.has(a.symbol)) rowsBySymbol.set(a.symbol, []);
  rowsBySymbol.get(a.symbol).push(a);
}

describe('STATIC_ASSETS_MAP — B3 identity survives duplicate-symbol rows', () => {
  it('keeps isB3 in the built map for every symbol that declares it in any row', () => {
    for (const [symbol, rows] of rowsBySymbol) {
      if (rows.some((r) => r.meta?.isB3)) {
        expect(STATIC_ASSETS_MAP[symbol]?.isB3, `${symbol} lost isB3 in the built map`).toBe(true);
      }
    }
  });

  it('never lets duplicate rows of one symbol disagree on isB3', () => {
    // Protects the DB taxonomy consumers too: AssetDetailDrawer resolves
    // duplicates first-match while FundamentalLab/ChartResearch use
    // last-write-wins, so ANY disagreement breaks one surface or the other.
    for (const [symbol, rows] of rowsBySymbol) {
      if (rows.length < 2) continue;
      const flags = new Set(rows.map((r) => !!r.meta?.isB3));
      expect(flags.size, `${symbol} has duplicate rows disagreeing on meta.isB3`).toBe(1);
    }
  });

  it('never lets duplicate rows of a B3 symbol disagree on type or sector', () => {
    // The Brazil grid gates on type + sector as well as isB3; a mirror row
    // that drifts on either silently drops the ticker or splits the taxonomy
    // between first-match and last-write-wins consumers.
    for (const [symbol, rows] of rowsBySymbol) {
      if (rows.length < 2 || !rows.some((r) => r.meta?.isB3)) continue;
      expect(new Set(rows.map((r) => r.type)).size, `${symbol} duplicate rows disagree on type`).toBe(1);
      expect(new Set(rows.map((r) => r.sector)).size, `${symbol} duplicate rows disagree on sector`).toBe(1);
    }
  });

  it('never marks yahooSymbol alias entries as B3 grid members', () => {
    // Alias keys ('PETR4.SA' → _displaySymbol) are provider-payload shims; if
    // they carried isB3 they would enter getB3AssetEntries and the grid
    // section scans as phantom duplicates (wrong ticker counts, dead fetches).
    for (const [sym, entry] of Object.entries(STATIC_ASSETS_MAP)) {
      if (entry._displaySymbol) {
        expect(entry.isB3, `alias entry ${sym} must not carry isB3`).toBeFalsy();
      }
    }
  });

  it('builder keeps isB3 sticky across duplicate rows in either order', () => {
    // Synthetic fixtures — the guard must hold regardless of which row of a
    // duplicated symbol comes last (the incident was flag-row-first order).
    const flagged  = { symbol: 'DUP1', name: 'x', subgroup_id: 'br-acoes', type: 'equity-br', sector: 'Bancos', exchange: 'B3', meta: { isB3: true } };
    const flagless = { symbol: 'DUP1', name: 'x', subgroup_id: 'brazil-highlights', type: 'equity-br', sector: 'Bancos', exchange: 'B3', meta: { yahooSymbol: 'DUP1.SA' } };
    expect(buildStaticAssetsMap([flagged, flagless]).DUP1.isB3).toBe(true);
    expect(buildStaticAssetsMap([flagless, flagged]).DUP1.isB3).toBe(true);
  });

  it('builder never lets a yahooSymbol alias clobber a real entry or carry isB3', () => {
    const real  = { symbol: 'PBR', name: 'real', subgroup_id: 'oil-gas', type: 'equity', exchange: 'NYSE', meta: null };
    const other = { symbol: 'XYZ4', name: 'x', subgroup_id: 'br-acoes', type: 'equity-br', sector: 'Bancos', exchange: 'B3', meta: { isB3: true, yahooSymbol: 'PBR' } };
    const map = buildStaticAssetsMap([real, other]);
    expect(map.PBR.name, 'alias must not clobber the real PBR entry').toBe('real');
    const map2 = buildStaticAssetsMap([other]);
    expect(map2.PBR._displaySymbol).toBe('XYZ4');
    expect(map2.PBR.isB3, 'alias entries never carry isB3').toBeFalsy();
    // Remaining alias branches: a real row arriving after an alias reclaims the
    // key (and the alias contributes no sticky identity), and a later alias may
    // replace an earlier alias.
    const map3 = buildStaticAssetsMap([other, real]);
    expect(map3.PBR.name, 'a later real row reclaims the key from an alias').toBe('real');
    expect(map3.PBR.isB3, 'alias isB3:false must not stick onto the real row').toBeFalsy();
    const other2 = { ...other, symbol: 'ZZZ4', name: 'z' };
    expect(buildStaticAssetsMap([other, other2]).PBR._displaySymbol, 'alias may replace alias').toBe('ZZZ4');
  });

  it('builder skips active:false rows (parity with the taxonomy API filter)', () => {
    const activeRow   = { symbol: 'ACT', name: 'live', subgroup_id: 'financials', type: 'equity', exchange: 'NASDAQ', meta: null };
    const retiredRow  = { symbol: 'ACT', name: 'dead', subgroup_id: 'br-cambio', type: 'macro-indicator', exchange: 'BCB', active: false, meta: { bcbSeries: 1 } };
    const soloRetired = { symbol: 'GONE', name: 'x', subgroup_id: 'br-juros', type: 'rate', exchange: 'BCB', active: false, meta: null };
    expect(buildStaticAssetsMap([activeRow, retiredRow]).ACT.name, 'inactive row must not clobber').toBe('live');
    expect(buildStaticAssetsMap([retiredRow, activeRow]).ACT.name).toBe('live');
    expect(buildStaticAssetsMap([soloRetired]).GONE).toBeUndefined();
  });

  it('restores the real identities the inactive-row collisions were erasing', () => {
    // IEP: the NASDAQ Icahn Enterprises row was overwritten by an inactive
    // BCB macro row; IPCA's active br-indices row by an inactive macro twin.
    expect(STATIC_ASSETS_MAP.IEP.exchange).toBe('NASDAQ');
    expect(STATIC_ASSETS_MAP.IEP.name).toBe('Icahn Enterprises');
    expect(STATIC_ASSETS_MAP.IPCA.cat).toBe('br-indices');
    expect(STATIC_ASSETS_MAP['NTN-B-5'], 'both NTN-B rows are inactive').toBeUndefined();
  });

  it('never lets ACTIVE duplicate rows disagree on type or sector', () => {
    // With inactive rows out of the map, any remaining disagreement is a real
    // split-brain (the DEV warn in the builder fires for it) — enforce at CI.
    for (const [symbol, rows] of rowsBySymbol) {
      const live = rows.filter((r) => r.active !== false);
      if (live.length < 2) continue;
      expect(new Set(live.map((r) => r.type)).size, `${symbol} active rows disagree on type`).toBe(1);
      expect(new Set(live.map((r) => r.sector)).size, `${symbol} active rows disagree on sector`).toBe(1);
    }
  });

  it('builder keeps last-write-wins for non-flag fields of duplicates (documented semantics)', () => {
    // Only isB3 is sticky; cat/type/sector stay last-write-wins (the DEV warn
    // flags disagreements). Pins the semantics so a future "helpful" change to
    // full-merge is a conscious decision, not an accident.
    const first  = { symbol: 'DUP2', name: 'a', subgroup_id: 'catA', type: 't1', sector: 's1', exchange: 'B3', meta: { isB3: true } };
    const second = { symbol: 'DUP2', name: 'b', subgroup_id: 'catB', type: 't2', sector: 's2', exchange: 'B3', meta: null };
    const entry = buildStaticAssetsMap([first, second]).DUP2;
    expect(entry.cat).toBe('catB');
    expect(entry.type).toBe('t2');
    expect(entry.sector).toBe('s2');
    expect(entry.isB3, 'flag survives the last-write row').toBe(true);
  });

  it('gives every active equity-br row a sector the grid can render', () => {
    // Generalizes the headline check: the sector gate applies to ALL br-acoes
    // tickers, and a plausible-looking but unknown sector silently drops the
    // asset from the grid with no error.
    for (const a of ASSETS) {
      if (a.type !== 'equity-br' || a.active === false) continue;
      expect(GRID_SECTORS, `${a.id} (${a.symbol}) sector "${a.sector}" not in SECTOR_META`).toContain(a.sector);
    }
  });

  it('declares isB3 on every quotable exchange:"B3" row', () => {
    for (const a of ASSETS) {
      if (a.exchange !== 'B3' || NON_QUOTABLE_B3_TYPES.has(a.type)) continue;
      expect(!!a.meta?.isB3, `${a.id} (${a.symbol}) is exchange:B3 but lacks meta.isB3`).toBe(true);
    }
  });

  it('keeps the 20 headline tickers eligible for the Brazil terminal grid', () => {
    // Mirrors the three gates in BrazilTerminal.jsx: getB3AssetEntries (isB3),
    // section grouping (type), and SECTOR_META membership (sector).
    for (const symbol of HEADLINE_B3) {
      const entry = STATIC_ASSETS_MAP[symbol];
      expect(entry?.isB3, `${symbol} missing isB3`).toBe(true);
      if (symbol === '^BVSP') {
        expect(entry.type, '^BVSP must group under Índices & Benchmarks').toBe('index-br');
        expect(entry.display, '^BVSP must keep its IBOV display identity').toBe('IBOV');
      } else {
        expect(entry.type, `${symbol} must group under Ações B3`).toBe('equity-br');
        expect(GRID_SECTORS, `${symbol} sector "${entry.sector}" not in SECTOR_META`).toContain(entry.sector);
      }
    }
  });
});
