import { useState } from 'react'
import GlobalMarketsTerminal from './GlobalMarketsTerminal'
import CatalogPage from './CatalogPage'
import NewsPage from './NewsPage'
import MarketHeatmapPage from './MarketHeatmapPage'

export default function App() {
  const [view, setView] = useState("dashboard");
  return (
    <GlobalMarketsTerminal
      currentView={view}
      onNavigate={setView}
      catalogPage={<CatalogPage />}
      newsPage={<NewsPage />}
      heatmapPage={<MarketHeatmapPage onNavigate={setView} />}
    />
  );
}
