import { describe, it, expect } from 'vitest';
import { validateConfig } from '../dataSourceConfigSchema.js';

describe('validateConfig', () => {
  it('accepts a valid config and returns the normalized shape', () => {
    const out = validateConfig({
      version: 1,
      global: ['eodhd', 'yahoo'],
      groups: { 'br-mercado': ['brapi', 'yahoo'] },
      subgroups: { crypto: ['coingecko'] },
    });
    expect(out).toEqual({
      version: 1,
      global: ['eodhd', 'yahoo'],
      groups: { 'br-mercado': ['brapi', 'yahoo'] },
      subgroups: { crypto: ['coingecko'] },
    });
  });

  it('accepts an empty object as pure recommended defaults', () => {
    expect(validateConfig({})).toEqual({ version: 1, global: [], groups: {}, subgroups: {} });
  });

  it('rejects an unknown provider id', () => {
    expect(() => validateConfig({ global: ['eodhd', 'bloomberg'] })).toThrow(/unknown provider "bloomberg"/);
    expect(() => validateConfig({ subgroups: { crypto: ['nasdaq'] } })).toThrow(/subgroups\.crypto: unknown provider/);
  });

  it('rejects duplicate providers in an order', () => {
    expect(() => validateConfig({ global: ['yahoo', 'yahoo'] })).toThrow(/duplicate/);
  });

  it('rejects a non-array order', () => {
    expect(() => validateConfig({ global: 'yahoo' })).toThrow(/global must be an array/);
    expect(() => validateConfig({ groups: { 'br-mercado': 'brapi' } })).toThrow(/groups\.br-mercado must be an array/);
  });

  it('rejects a non-object groups/subgroups', () => {
    expect(() => validateConfig({ groups: ['x'] })).toThrow(/groups must be an object/);
  });

  it('rejects non-object input', () => {
    expect(() => validateConfig(null)).toThrow(/config must be an object/);
    expect(() => validateConfig(['yahoo'])).toThrow(/config must be an object/);
  });

  it('drops empty override arrays during normalization', () => {
    // an empty order for a key carries no override → normalized away
    expect(validateConfig({ subgroups: { crypto: [] } }).subgroups).toEqual({});
  });
});
