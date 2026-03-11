import { useState } from 'react'
import GlobalMarketsTerminal from './GlobalMarketsTerminal'
import CatalogPage from './CatalogPage'

export default function App() {
  const [view, setView] = useState("dashboard");
  return (
    <GlobalMarketsTerminal
      currentView={view}
      onNavigate={setView}
      catalogPage={<CatalogPage />}
    />
  );
}
