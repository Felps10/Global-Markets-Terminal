import { describe, it, expect } from 'vitest';
import { yahooToFmp, isFmpSingleQuote } from '../fmpSymbols.js';

describe('yahooToFmp', () => {
  it('maps the four Premium-available commodity futures to XXUSD', () => {
    expect(yahooToFmp('GC=F')).toBe('GCUSD'); // gold
    expect(yahooToFmp('SI=F')).toBe('SIUSD'); // silver
    expect(yahooToFmp('CL=F')).toBe('CLUSD'); // WTI — quotes un-gated 2026-07-17
    expect(yahooToFmp('NG=F')).toBe('NGUSD'); // natgas — quotes un-gated 2026-07-17
  });

  it('returns null for commodity futures FMP does not serve', () => {
    expect(yahooToFmp('HG=F')).toBeNull(); // copper — not in the served book
    expect(yahooToFmp('BZ=F')).toBeNull(); // brent — not in the served book
  });

  it('maps the 8 FMP-covered indices to their caret symbol (single-quote endpoint)', () => {
    expect(yahooToFmp('^GSPC')).toBe('^GSPC');
    expect(yahooToFmp('^DJI')).toBe('^DJI');
    expect(yahooToFmp('^IXIC')).toBe('^IXIC');
    expect(yahooToFmp('^VIX')).toBe('^VIX');
    expect(yahooToFmp('^FTSE')).toBe('^FTSE'); // also the EODHD "NA" hole
    expect(yahooToFmp('^N225')).toBe('^N225');
    expect(yahooToFmp('^HSI')).toBe('^HSI');
    expect(yahooToFmp('^STOXX50E')).toBe('^STOXX50E');
  });

  it('returns null for indices FMP does not cover (EODHD stays primary)', () => {
    expect(yahooToFmp('^GDAXI')).toBeNull();
    expect(yahooToFmp('^FCHI')).toBeNull();
    expect(yahooToFmp('^BVSP')).toBeNull();
    expect(yahooToFmp('^AXJO')).toBeNull();
    expect(yahooToFmp('^KS11')).toBeNull();
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
    expect(yahooToFmp('HG=F', { fmpSymbol: 'HGUSD' })).toBe('HGUSD'); // override can force an unmapped symbol
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
