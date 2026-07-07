import { describe, it, expect } from 'vitest';
import { yahooToFmp, isFmpSingleQuote } from '../fmpSymbols.js';

describe('yahooToFmp', () => {
  it('maps the two Premium-available metal futures to XXUSD', () => {
    expect(yahooToFmp('GC=F')).toBe('GCUSD'); // gold
    expect(yahooToFmp('SI=F')).toBe('SIUSD'); // silver
  });

  it('returns null for WTI/natgas (gated above Premium → ETF proxies)', () => {
    expect(yahooToFmp('CL=F')).toBeNull();
    expect(yahooToFmp('NG=F')).toBeNull();
  });

  it('maps ^FTSE (the EODHD "NA" hole) to ^FTSE', () => {
    expect(yahooToFmp('^FTSE')).toBe('^FTSE');
  });

  it('returns null for indices EODHD already serves (FMP must not fetch them)', () => {
    expect(yahooToFmp('^GSPC')).toBeNull();
    expect(yahooToFmp('^GDAXI')).toBeNull(); // also gated on Premium
    expect(yahooToFmp('^N225')).toBeNull();
  });

  it('maps US equities/ETFs/ADRs to the bare ticker (FMP-primary, Stage 2)', () => {
    expect(yahooToFmp('AAPL')).toBe('AAPL');
    expect(yahooToFmp('TSM')).toBe('TSM');   // ADR
    expect(yahooToFmp('EWZ')).toBe('EWZ');   // ETF
  });

  it('maps FX PAIR=X to the bare pair', () => {
    expect(yahooToFmp('EURUSD=X')).toBe('EURUSD');
    expect(yahooToFmp('USDJPY=X')).toBe('USDJPY');
    expect(yahooToFmp('NZDUSD=X')).toBe('NZDUSD');
  });

  it('returns null for B3 (.SA) — BRAPI Pro stays primary', () => {
    expect(yahooToFmp('PETR4.SA')).toBeNull();
    expect(yahooToFmp('VALE3.SA')).toBeNull();
  });

  it('honors an explicit meta.fmpSymbol override', () => {
    expect(yahooToFmp('WEIRD', { fmpSymbol: 'BZUSD' })).toBe('BZUSD');
    expect(yahooToFmp('CL=F', { fmpSymbol: 'CLUSD' })).toBe('CLUSD'); // override can force a gated symbol
  });

  it('returns null for empty/invalid input', () => {
    expect(yahooToFmp('')).toBeNull();
    expect(yahooToFmp(null)).toBeNull();
    expect(yahooToFmp(undefined)).toBeNull();
  });
});

describe('isFmpSingleQuote', () => {
  it('routes ^ index codes to the single-quote endpoint', () => {
    expect(isFmpSingleQuote('^FTSE')).toBe(true);
  });
  it('routes commodity/equity codes to batch-quote', () => {
    expect(isFmpSingleQuote('GCUSD')).toBe(false);
    expect(isFmpSingleQuote('AAPL')).toBe(false);
    expect(isFmpSingleQuote(null)).toBe(false);
  });
});
