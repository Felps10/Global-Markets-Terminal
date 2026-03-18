import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TaxonomyProvider } from './context/TaxonomyContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <TaxonomyProvider>
        <PreferencesProvider>
          <WatchlistProvider>
            <App />
          </WatchlistProvider>
        </PreferencesProvider>
      </TaxonomyProvider>
    </AuthProvider>
  </React.StrictMode>,
)
