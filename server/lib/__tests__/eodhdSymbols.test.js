import { describe, it, expect } from 'vitest';
import { yahooToEodhd } from '../eodhdSymbols.js';

describe('yahooToEodhd', () => {
  it('maps plain US equities/ETFs/ADRs to .US', () => {
    expect(yahooToEodhd('AAPL')).toBe('AAPL.US');
    expect(yahooToEodhd('JPM')).toBe('JPM.US');
    expect(yahooToEodhd('TSM')).toBe('TSM.US');    // NYSE ADR
    expect(yahooToEodhd('ASML')).toBe('ASML.US');  // Nasdaq ADR (not the .AS home line)
    expect(yahooToEodhd('LVMUY')).toBe('LVMUY.US'); // OTC ADR
  });

  it('preserves dashes/dots in equity tickers', () => {
    expect(yahooToEodhd('BRK-B')).toBe('BRK-B.US');
  });

  it('maps indices ^ROOT → ROOT.INDX', () => {
    expect(yahooToEodhd('^GSPC')).toBe('GSPC.INDX');
    expect(yahooToEodhd('^DJI')).toBe('DJI.INDX');
    expect(yahooToEodhd('^VIX')).toBe('VIX.INDX');   // live-verified on paid key
    expect(yahooToEodhd('^AXJO')).toBe('AXJO.INDX'); // live-verified on paid key
    expect(yahooToEodhd('^KS11')).toBe('KS11.INDX'); // live-verified on paid key
  });

  it('maps FX PAIR=X → PAIR.FOREX', () => {
    expect(yahooToEodhd('EURUSD=X')).toBe('EURUSD.FOREX');
    expect(yahooToEodhd('NZDUSD=X')).toBe('NZDUSD.FOREX');
    expect(yahooToEodhd('USDBRL=X')).toBe('USDBRL.FOREX');
  });

  it('treats B3 .SA as identity', () => {
    expect(yahooToEodhd('PETR4.SA')).toBe('PETR4.SA');
    expect(yahooToEodhd('VALE3.SA')).toBe('VALE3.SA');
  });

  it('returns null for commodity futures (EODHD has no commodities exchange)', () => {
    expect(yahooToEodhd('CL=F')).toBeNull();
    expect(yahooToEodhd('NG=F')).toBeNull();
    expect(yahooToEodhd('GC=F')).toBeNull();
    expect(yahooToEodhd('SI=F')).toBeNull();
  });

  it('honors an explicit meta.eodhdSymbol override', () => {
    expect(yahooToEodhd('AAPL', { eodhdSymbol: 'AAPL.US' })).toBe('AAPL.US');
    expect(yahooToEodhd('WEIRD', { eodhdSymbol: 'REAL.INDX' })).toBe('REAL.INDX');
  });

  it('returns null for empty/invalid input', () => {
    expect(yahooToEodhd('')).toBeNull();
    expect(yahooToEodhd(null)).toBeNull();
    expect(yahooToEodhd(undefined)).toBeNull();
  });
});
