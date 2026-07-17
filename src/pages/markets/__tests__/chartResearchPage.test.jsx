// ChartResearchPage — deep-link seeding, 9-timeframe toolbar, and the
// card-header "Open in …" links. Mounts the real page with PriceChart and
// MarketsPageLayout stubbed for jsdom.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigateSpy,
}));

vi.mock('../../../components/PriceChart.jsx', () => ({
  default: () => <div data-testid="price-chart" />,
}));

vi.mock('../../../components/MarketsPageLayout.jsx', () => ({
  default: ({ children, rightControls }) => <div>{rightControls}{children}</div>,
}));

// Stable references — the real contexts return stable values; fresh objects
// per call would re-trigger effects keyed on `assets` and loop the render.
vi.mock('../../../context/TaxonomyContext.jsx', () => {
  const TAXONOMY = {
    assets: [
      { symbol: 'ENPH',  name: 'Enphase Energy', type: 'stock', exchange: 'NASDAQ', subgroup_id: 'clean-energy', meta: {} },
      { symbol: 'SPY',   name: 'S&P 500 ETF',    type: 'etf',   exchange: 'NYSE',   subgroup_id: 'us-indices',   meta: {} },
      { symbol: '^GSPC', name: 'S&P 500',        type: 'index', exchange: 'INDEX',  subgroup_id: 'us-indices',   meta: {} },
    ],
    subgroups: [],
  };
  return { useTaxonomy: () => TAXONOMY };
});

vi.mock('../../../context/WatchlistContext.jsx', () => {
  const WATCHLIST = { items: [], isPinned: () => false, pin: () => {}, unpin: () => {} };
  return { useWatchlist: () => WATCHLIST };
});

vi.mock('../../../dataServices.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchQuote: vi.fn(),
    fmpOHLCV: vi.fn(),
    hasFmpKey: () => false,
    hasFinnhubKey: () => false,
  };
});

import ChartResearchPage from '../ChartResearchPage.jsx';
import { fetchQuote, fmpOHLCV } from '../../../dataServices.js';
import { QUOTE, candles } from '../../../test/marketFixtures.js';

function renderPage(url = '/markets/research?symbol=ENPH') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ChartResearchPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchQuote.mockResolvedValue(QUOTE);
  fmpOHLCV.mockResolvedValue(candles());
});

describe('ChartResearchPage deep link', () => {
  it('seeds from ?symbol= without fetching the SPY default bundle', async () => {
    renderPage('/markets/research?symbol=ENPH');
    await waitFor(() => expect(fetchQuote).toHaveBeenCalled());
    expect(fetchQuote).toHaveBeenCalledWith('ENPH');
    expect(fetchQuote).not.toHaveBeenCalledWith('SPY');
    await waitFor(() => expect(fmpOHLCV).toHaveBeenCalled());
    for (const call of fmpOHLCV.mock.calls) expect(call[0]).toBe('ENPH');
  });

  it('falls back to SPY for an unknown ?symbol=', async () => {
    renderPage('/markets/research?symbol=NOTREAL');
    // With warm taxonomy one junk-symbol fetch may fire before validation
    // corrects it (same semantics as Signal Engine); SPY must win.
    await waitFor(() => expect(fetchQuote).toHaveBeenCalledWith('SPY'));
    await waitFor(() => expect(fmpOHLCV).toHaveBeenCalledWith('SPY', '3M', expect.anything()));
  });
});

describe('ChartResearchPage toolbar', () => {
  it('offers all 9 timeframes (drawer parity)', async () => {
    renderPage();
    for (const tf of ['1D', '5D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'MAX']) {
      expect(screen.getByText(tf)).toBeTruthy();
    }
  });

  it('fetches the newly selected timeframe', async () => {
    renderPage();
    await waitFor(() => expect(fmpOHLCV).toHaveBeenCalled());
    fireEvent.click(screen.getByText('MAX'));
    await waitFor(() =>
      expect(fmpOHLCV).toHaveBeenLastCalledWith('ENPH', 'MAX', expect.anything())
    );
  });
});

describe('ChartResearchPage card links', () => {
  it('links each research card to its Markets page carrying the symbol', async () => {
    renderPage();
    await waitFor(() => expect(fetchQuote).toHaveBeenCalledWith('ENPH'));
    const cases = [
      ['Open in Fundamental Lab →', '/markets/fundamentals?symbols=ENPH'],
      ['Open in Signal Engine →',   '/markets/signals?symbol=ENPH'],
      ['Open in News →',            '/app/news?symbol=ENPH'],
    ];
    for (const [label, path] of cases) {
      fireEvent.click(screen.getByText(label));
      expect(navigateSpy).toHaveBeenLastCalledWith(path);
    }
  });

  it('hides the card links for non-equity assets (drawer parity)', async () => {
    renderPage('/markets/research?symbol=%5EGSPC'); // ^GSPC, type index
    await waitFor(() => expect(fetchQuote).toHaveBeenCalledWith('^GSPC'));
    expect(screen.queryByText(/Open in /)).toBeNull();
  });
});
