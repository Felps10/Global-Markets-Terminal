import React from 'react'
import ReactDOM from 'react-dom/client'
import { createGlobalStyle } from 'styled-components'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TaxonomyProvider } from './context/TaxonomyContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import './index.css'

const GlobalBaseline = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #080C18;
    color: #E8EAF0;
    -webkit-font-smoothing: antialiased;
  }
`

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalBaseline />
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
