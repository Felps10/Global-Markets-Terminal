// VITE_API_BASE_URL — set in Cloudflare Pages build environment vars.
// In dev, leave unset (defaults to '') so proxy rules handle /api/* paths.
// In production, set to your Railway backend URL:
//   e.g. https://gmt-production.up.railway.app
// The React app reads this via: import.meta.env.VITE_API_BASE_URL || ''

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // --- Yahoo Finance (existing) ---
      '/api/yahoo': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },

      // --- Finnhub: real-time quotes, earnings, news, insider sentiment ---
      // Free: 60 calls/min | https://finnhub.io
      '/api/finnhub': {
        target: 'https://finnhub.io/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/finnhub/, ''),
      },

      // --- Alpha Vantage: technicals (RSI, MACD), fundamentals, forex ---
      // Free: 25 calls/day | https://www.alphavantage.co
      '/api/alphavantage': {
        target: 'https://www.alphavantage.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/alphavantage/, ''),
      },

      // --- FRED: macro data (CPI, GDP, interest rates, unemployment) ---
      // Free: unlimited | https://fred.stlouisfed.org/docs/api/api_key.html
      '/api/fred': {
        target: 'https://api.stlouisfed.org/fred',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, ''),
      },

      // --- CoinGecko: crypto prices, market cap, trending — no key needed ---
      // Free: ~30 calls/min | https://www.coingecko.com/api/documentation
      '/api/coingecko': {
        target: 'https://api.coingecko.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },

      // --- Financial Modeling Prep: DCF, income statements, peer comparison ---
      // Free: 250 calls/day | https://financialmodelingprep.com/developer
      // NOTE: /api/v3 was deprecated Aug 2025. Free tier now uses /stable/.
      '/api/fmp': {
        target: 'https://financialmodelingprep.com/stable',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fmp/, ''),
      },

      // --- BRAPI: Brazilian B3 equity data (quotes, fundamentals) ---
      // Free tier | https://brapi.dev
      '/api/brapi': {
        target: 'https://brapi.dev/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/brapi/, ''),
      },

      // --- BCB: Brazilian Central Bank macro data (SELIC, IPCA, CDI) — no key ---
      // Free: unlimited | https://dadosabertos.bcb.gov.br
      '/api/bcb': {
        target: 'https://api.bcb.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bcb/, ''),
      },

      // --- AwesomeAPI: Brazilian Real FX rates (USD/BRL, EUR/BRL) — no key ---
      // Free: unlimited | https://docs.awesomeapi.com.br
      '/api/awesomeapi': {
        target: 'https://economia.awesomeapi.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/awesomeapi/, ''),
      },

      // --- Admin API: taxonomy management backend (local) ---
      '/api/v1': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
