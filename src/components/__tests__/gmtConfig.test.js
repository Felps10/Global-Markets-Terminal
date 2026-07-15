// Regression: brazil-highlights duplicate-symbol collision (2026-07-14).
// 20 headline B3 tickers exist twice in assets.js (br-acoes + brazil-highlights).
// STATIC_ASSETS_MAP is keyed by symbol with last-write-wins, so a highlights row
// without meta.isB3 silently erased the flag — bare-symbol quote/chart 502s and
// the tickers dropped from the Brazil terminal grid. These tests pin the invariant
// that duplicate rows can never disagree on B3 identity again.
import { describe, it, expect } from 'vitest';
import { ASSETS } from '../../data/assets.js';
import { STATIC_ASSETS_MAP } from '../gmtConfig.js';

// The 20 symbols that lost isB3 in the original incident.
const HEADLINE_B3 = [
  'ITUB4', 'BBDC4', 'BBAS3', 'BPAC11', 'B3SA3', 'PETR4', 'VALE3', 'GGBR4',
  'JBSS3', 'LREN3', 'MGLU3', 'ABEV3', 'EQTL3', 'RENT3', 'WEGE3', 'EMBR3',
  'RDOR3', 'TOTS3', 'SUZB3', '^BVSP',
];

// Keys of SECTOR_META in src/BrazilTerminal.jsx — the Brazil grid silently
// drops any equity-br entry whose sector is not one of these.
const GRID_SECTORS = [
  'Bancos', 'Petróleo', 'Mineração', 'Agronegócio', 'Varejo', 'Utilities',
  'Transporte', 'Indústria', 'Construção', 'Saúde', 'Telecom', 'Outros',
];

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
