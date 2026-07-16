// AssetDetailDrawer — Overview stats follow the chart timeframe.
// Mounts the real drawer (PriceChart stubbed for jsdom) and asserts that the
// key-stats grid and the header period-return chip react to timeframe
// switches, that 1D and chart failures stay quote-based, and that proxied
// symbols never show candle-derived levels.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState   = vi.hoisted(() => ({ isAuthenticated: false }));
const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigateSpy,
}));

vi.mock('../PriceChart.jsx', () => ({
  default: () => <div data-testid="price-chart" />,
}));

vi.mock('../../context/TaxonomyContext.jsx', () => ({
  useTaxonomy: () => ({
    assets: [{
      symbol: 'ENPH', name: 'Enphase Energy', type: 'stock',
      exchange: 'NASDAQ', subgroup_id: 'clean-energy', meta: {},
    }],
  }),
}));

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: () => ({ isAuthenticated: authState.isAuthenticated, openAuthPanel: vi.fn() }),
}));

vi.mock('../../context/AlertsContext.jsx', () => ({
  useAlerts: () => ({ createAlert: vi.fn() }),
}));

vi.mock('../../dataServices.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchQuote: vi.fn(),
    fmpOHLCV: vi.fn(),
    hasFmpKey: () => false,
    hasFinnhubKey: () => false,
  };
});

import AssetDetailDrawer from '../AssetDetailDrawer.jsx';
import { fetchQuote, fmpOHLCV } from '../../dataServices.js';

const QUOTE = {
  price: 41.08, change: -2.97, changePct: -6.74,
  open: 42.67, prevClose: 44.05, dayHigh: 43.23, dayLow: 40.95,
  w52High: 73.74, w52Low: 25.78, volume: 3_800_000, avgVolume: 4_000_000,
  marketCap: 5_410_000_000, timestamp: 1752696000,
};

// 11 ascending daily candles: closes 100→110 (+10%), extremes 112/98.
const candles = (n = 11, base = 100) => Array.from({ length: n }, (_, i) => ({
  time: `2026-06-${String(i + 1).padStart(2, '0')}`,
  open: base + i, high: base + i + 2, low: base + i - 2,
  close: base + i, volume: 1_000_000,
}));

function renderDrawer(symbol = 'ENPH') {
  return render(
    <MemoryRouter>
      <AssetDetailDrawer symbol={symbol} onClose={() => {}} onSymbolChange={() => {}} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.isAuthenticated = false;
  fetchQuote.mockResolvedValue(QUOTE);
  fmpOHLCV.mockResolvedValue(candles());
});

describe('AssetDetailDrawer period stats', () => {
  it('shows period-labeled high/low for the default 1M timeframe', async () => {
    renderDrawer();
    expect(await screen.findByText('1M HIGH')).toBeTruthy();
    expect(screen.getByText('1M LOW')).toBeTruthy();
    expect(screen.getByText('112.00')).toBeTruthy(); // max(high)
    expect(screen.getByText('98.00')).toBeTruthy();  // min(low)
    expect(screen.queryByText('DAY HIGH')).toBeNull();
  });

  it('keeps the volume row quote-based (candle volume units vary per interval)', async () => {
    renderDrawer();
    await screen.findByText('1M HIGH');
    expect(screen.getByText('VOLUME')).toBeTruthy();
    expect(screen.getByText('3.8M')).toBeTruthy(); // quote volume, not per-candle math
    expect(screen.queryByText(/AVG VOL/)).toBeNull();
  });

  it('renders the period-return chip from first→last close', async () => {
    renderDrawer();
    const chip = await screen.findByTitle('Return over the charted 1M period');
    expect(chip.textContent).toBe('1M +10.0%');
  });

  it('falls back to quote-based day stats on 1D (no chip)', async () => {
    renderDrawer();
    await screen.findByText('1M HIGH');
    fireEvent.click(screen.getByText('1D'));
    expect(await screen.findByText('DAY HIGH')).toBeTruthy();
    expect(screen.getByText('43.23')).toBeTruthy(); // quote dayHigh
    expect(screen.queryByText(/1D HIGH/)).toBeNull();
    expect(screen.queryByTitle(/Return over the charted/)).toBeNull();
  });

  it('recomputes stats when switching to 1Y', async () => {
    renderDrawer();
    await screen.findByText('1M HIGH');
    fmpOHLCV.mockResolvedValue(candles(11, 50)); // closes 50→60, extremes 62/48
    fireEvent.click(screen.getByText('1Y'));
    expect(await screen.findByText('1Y HIGH')).toBeTruthy();
    expect(screen.getByText('62.00')).toBeTruthy();
    expect(screen.getByText('48.00')).toBeTruthy();
    const chip = await screen.findByTitle('Return over the charted 1Y period');
    expect(chip.textContent).toBe('1Y +20.0%');
    expect(fmpOHLCV).toHaveBeenLastCalledWith('ENPH', '1Y', expect.anything());
  });

  it('keeps quote-based day stats when the candle fetch fails (no permanent dashes)', async () => {
    fmpOHLCV.mockRejectedValue(new Error('Chart unavailable'));
    renderDrawer();
    expect(await screen.findByText('DAY HIGH')).toBeTruthy();
    expect(screen.getByText('43.23')).toBeTruthy();
    expect(screen.getByText('40.95')).toBeTruthy();
    expect(screen.queryByText('1M HIGH')).toBeNull();
    expect(screen.queryByTitle(/Return over the charted/)).toBeNull();
  });

  it('keeps day stats for proxied symbols (CL=F charts USO)', async () => {
    renderDrawer('CL=F');
    expect(await screen.findByText('DAY HIGH')).toBeTruthy();
    expect(screen.queryByText('1M HIGH')).toBeNull();
    expect(screen.queryByTitle(/Return over the charted/)).toBeNull();
  });
});

describe('AssetDetailDrawer open-in-page links', () => {
  it('routes each tab to its Markets page carrying the symbol', async () => {
    authState.isAuthenticated = true;
    renderDrawer();
    await screen.findByText('1M HIGH');

    const cases = [
      ['Overview',     'Open in Chart & Research →', '/markets/research?symbol=ENPH'],
      ['Fundamentals', 'Open in Fundamental Lab →',  '/markets/fundamentals?symbols=ENPH'],
      ['Analyst',      'Open in Signal Engine →',    '/markets/signals?symbol=ENPH'],
      ['News',         'Open in News →',             '/app/news?symbol=ENPH'],
    ];
    for (const [tab, label, path] of cases) {
      fireEvent.click(screen.getByText(tab));
      const btn = screen.getByText(label);
      fireEvent.click(btn);
      expect(navigateSpy).toHaveBeenLastCalledWith(path);
    }
  });

  it('shows the Chart & Research link even without tabs (non-equity assets)', async () => {
    authState.isAuthenticated = true;
    renderDrawer('CL=F'); // not in taxonomy mock → no equity tabs
    expect(await screen.findByText('Open in Chart & Research →')).toBeTruthy();
    fireEvent.click(screen.getByText('Open in Chart & Research →'));
    expect(navigateSpy).toHaveBeenLastCalledWith('/markets/research?symbol=CL%3DF');
  });

  it('hides the link row for guests (target pages are auth-gated)', async () => {
    renderDrawer();
    await screen.findByText('1M HIGH');
    expect(screen.queryByText(/Open in /)).toBeNull();
  });
});
