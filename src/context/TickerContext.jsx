import { createContext, useContext, useState } from 'react';

const TickerContext = createContext([]);

export function TickerProvider({ children }) {
  const [tickerItems, setTickerItems] = useState([]);
  return (
    <TickerContext.Provider value={{ tickerItems, setTickerItems }}>
      {children}
    </TickerContext.Provider>
  );
}

export function useTicker() {
  return useContext(TickerContext);
}
