import { createContext, useContext, useState, useEffect, useRef } from 'react';

const MarketDataContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || '';

export function MarketDataProvider({ children }) {
  const [quotes, setQuotes]           = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const mountedRef                    = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchQuotes() {
      try {
        const res = await fetch(`${API_URL}/api/v1/quotes/live`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mountedRef.current) return;

        // Build from the normalized `quotes` map (Phase C source of truth): it is keyed by
        // display symbol — the same key the Watchlist pins by (item.target_id) — and carries
        // marketCap + the 52-week range that the legacy `yahoo` array drops. Falling back to
        // the legacy array only for symbols the normalized map does not cover also fixes B3
        // (.SA) and crypto rows, which are absent under a bare-display key in `data.yahoo`.
        const map = {};
        if (data.quotes && typeof data.quotes === 'object') {
          for (const [sym, q] of Object.entries(data.quotes)) {
            if (!q) continue;
            map[sym] = {
              price:            q.price ?? null,
              changePct:        q.changePct ?? null,
              marketCap:        q.marketCap ?? null,
              fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
              fiftyTwoWeekLow:  q.fiftyTwoWeekLow ?? null,
            };
          }
        }
        if (Array.isArray(data.yahoo)) {
          data.yahoo.forEach(q => {
            if (q.symbol && !map[q.symbol]) {
              map[q.symbol] = {
                price:            q.regularMarketPrice ?? null,
                changePct:        q.regularMarketChangePercent ?? null,
                marketCap:        null,
                fiftyTwoWeekHigh: null,
                fiftyTwoWeekLow:  null,
              };
            }
          });
        }

        setQuotes(map);
        setLastUpdated(data.meta?.ts ?? Date.now());
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }

    fetchQuotes();
    const id = setInterval(fetchQuotes, 60_000);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, []);

  const value = { quotes, lastUpdated, isLoading };

  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  return useContext(MarketDataContext);
}
