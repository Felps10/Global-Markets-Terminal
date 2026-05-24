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

        const map = {};
        if (Array.isArray(data.yahoo)) {
          data.yahoo.forEach(q => {
            if (q.symbol) {
              map[q.symbol] = {
                price:     q.regularMarketPrice ?? null,
                changePct: q.regularMarketChangePercent ?? null,
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
