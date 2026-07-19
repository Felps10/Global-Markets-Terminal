// AssetDetailDrawer — Overview stats follow the chart timeframe.
// Mounts the real drawer (PriceChart stubbed for jsdom) and asserts that the
// key-stats grid and the header period-return chip react to timeframe
// switches, that 1D and chart failures stay quote-based, and that proxied
// symbols never show candle-derived levels.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    assets: [
      {
        symbol: 'ENPH', name: 'Enphase Energy', type: 'stock',
        exchange: 'NASDAQ', subgroup_id: 'clean-energy', meta: {},
      },
      {
        symbol: 'RUN', name: 'Sunrun', type: 'stock',
        exchange: 'NASDAQ', subgroup_id: 'clean-energy', meta: {},
      },
    ],
  }),
}));

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: () => ({ isAuthenticated: authState.isAuthenticated, openAuthPanel: vi.fn() }),
}));

vi.mock('../../context/AlertsContext.jsx', () => ({
  useAlerts: () => ({ createAlert: vi.fn() }),
}));

const fmpFlag = vi.hoisted(() => ({ on: false }));

vi.mock('../../dataServices.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchQuote: vi.fn(),
    fmpOHLCV: vi.fn(),
    fmpProfile: vi.fn(),
    fmpRatios: vi.fn(),
    fmpGradesConsensus: vi.fn(),
    fmpPriceTarget: vi.fn(),
    fmpAnalystEstimates: vi.fn(),
    hasFmpKey: () => fmpFlag.on,
    hasFinnhubKey: () => false,
  };
});

import AssetDetailDrawer from '../AssetDetailDrawer.jsx';
import { fetchQuote, fmpOHLCV, fmpProfile, fmpGradesConsensus } from '../../dataServices.js';
// Shared fixtures: QUOTE + candles(n, base) — default candles() is 11 daily
// bars, closes 100→110 (+10%), extremes 112/98.
import { QUOTE, candles } from '../../test/marketFixtures.js';

function renderDrawer(symbol = 'ENPH', { onSymbolChange = () => {} } = {}) {
  return render(
    <MemoryRouter>
      <AssetDetailDrawer symbol={symbol} onClose={() => {}} onSymbolChange={onSymbolChange} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.isAuthenticated = false;
  fmpFlag.on = false;
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

describe('AssetDetailDrawer hygiene', () => {
  it('arrow keys navigate siblings — but never while typing in an input', async () => {
    authState.isAuthenticated = true;
    const onSymbolChange = vi.fn();
    renderDrawer('ENPH', { onSymbolChange });
    await screen.findByText('1M HIGH');

    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(onSymbolChange).toHaveBeenCalledWith('RUN'); // clean-energy sibling

    onSymbolChange.mockClear();
    fireEvent.click(screen.getByText('SET ALERT'));
    const input = document.querySelector('input');
    expect(input).toBeTruthy();
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    fireEvent.keyDown(input, { key: 'ArrowLeft' });
    expect(onSymbolChange).not.toHaveBeenCalled();
  });

  it('fetches tab data (profile/analyst) without requiring an expand', async () => {
    authState.isAuthenticated = true;
    fmpFlag.on = true;
    fmpProfile.mockResolvedValue({ description: 'Solar company', sector: 'Energy' });
    fmpGradesConsensus.mockResolvedValue({ buy: 10, hold: 5, sell: 1 });
    renderDrawer();
    await screen.findByText('1M HIGH');
    // Collapsed mode, no expand click — the data fetches must fire anyway.
    await waitFor(() => expect(fmpProfile).toHaveBeenCalledWith('ENPH'));
    expect(fmpGradesConsensus).toHaveBeenCalledWith('ENPH');
  });

  it('persists timeframe across symbol changes (sibling comparison)', async () => {
    const { rerender } = renderDrawer('ENPH');
    await screen.findByText('1M HIGH');
    fireEvent.click(screen.getByText('1Y'));
    await screen.findByText('1Y HIGH');

    // Same mounted drawer, symbol prop changes — timeframe must survive.
    rerender(
      <MemoryRouter>
        <AssetDetailDrawer symbol="RUN" onClose={() => {}} onSymbolChange={() => {}} />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(fmpOHLCV).toHaveBeenLastCalledWith('RUN', '1Y', expect.anything())
    );
  });

  it('locked Analyst card describes analyst content in English (guest view)', async () => {
    renderDrawer(); // guest
    await screen.findByText('1M HIGH');
    fireEvent.click(screen.getByText('Analyst'));
    expect(screen.getByText('Analyst consensus')).toBeTruthy();
    expect(screen.getByText('Create free account →')).toBeTruthy();
    expect(screen.queryByText(/RSI, MACD/)).toBeNull();
  });

  it('refreshes the quote every 30s while open, silently', async () => {
    vi.useFakeTimers();
    try {
      renderDrawer();
      await vi.advanceTimersByTimeAsync(0); // flush initial fetch
      expect(fetchQuote).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchQuote).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchQuote).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
