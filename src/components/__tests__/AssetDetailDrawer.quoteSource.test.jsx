// Regression: quote-source provenance pill in the drawer price header (2026-07-16).
// /api/v1/quote tags each response with the provider that won the server-side
// resolution (FMP/EODHD/BRAPI). ChartResearchPage already surfaced it via
// SourcePill + quoteSrcLabel; the drawer showed nothing, leaving the two
// surfaces inconsistent about data provenance. These tests pin the shared
// helper's contract and that the drawer header actually renders the pill.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { quoteSrcLabel } from '../../dataServices.js';

vi.mock('../PriceChart.jsx', () => ({ default: () => null }));
vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: () => ({ isAuthenticated: false, openAuthPanel: () => {} }),
}));
vi.mock('../../context/AlertsContext.jsx', () => ({
  useAlerts: () => ({ createAlert: async () => {} }),
}));
vi.mock('../../context/TaxonomyContext.jsx', () => ({
  useTaxonomy: () => ({ assets: [] }),
}));
vi.mock('../../dataServices.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchQuote: vi.fn(async () => ({
      price: 333.26, change: 5.76, changePct: 1.76,
      volume: 62673782, timestamp: 1784232001, source: 'fmp',
    })),
    fmpOHLCV: vi.fn(async () => []),
  };
});

import AssetDetailDrawer from '../AssetDetailDrawer.jsx';

describe('quoteSrcLabel — shared provenance label helper', () => {
  it('uppercases the winning provider', () => {
    expect(quoteSrcLabel({ source: 'fmp' })).toBe('FMP');
    expect(quoteSrcLabel({ source: 'brapi' })).toBe('BRAPI');
  });

  it('falls back to LIVE when the response carries no source', () => {
    expect(quoteSrcLabel({})).toBe('LIVE');
    expect(quoteSrcLabel(null)).toBe('LIVE');
  });
});

describe('AssetDetailDrawer — quote source pill', () => {
  it('renders the provider pill in the price header', async () => {
    render(
      <MemoryRouter>
        <AssetDetailDrawer symbol="AAPL" onClose={() => {}} />
      </MemoryRouter>
    );
    expect(await screen.findByText('FMP')).toBeInTheDocument();
    expect(screen.getByText('333.26')).toBeInTheDocument();
  });
});
