import './i18n.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TaxonomyProvider } from './context/TaxonomyContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import { AlertsProvider } from './context/AlertsContext.jsx'
import { MarketDataProvider } from './context/MarketDataContext.jsx'
import './index.css'
import { initAnalytics } from './services/analytics.js'

initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MarketDataProvider>
    <AuthProvider>
      <TaxonomyProvider>
        <PreferencesProvider>
          <WatchlistProvider>
            <AlertsProvider>
              <App />
            </AlertsProvider>
          </WatchlistProvider>
        </PreferencesProvider>
      </TaxonomyProvider>
    </AuthProvider>
    </MarketDataProvider>
  </React.StrictMode>,
)
