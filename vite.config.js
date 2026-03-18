// VITE_API_URL — set in Vercel/Railway build environment vars.
// In dev, leave unset (defaults to '') so proxy rules handle /proxy/* paths.
// In production, set to your Railway backend URL:
//   e.g. https://global-markets-terminal.up.railway.app
// The React app reads this via: import.meta.env.VITE_API_URL || ''

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,   // disable in production — reduces bundle size
  },
  server: {
    proxy: {
      // --- Yahoo Finance — dev proxy target is proxy-server.js on :3001 ---
      '/proxy/yahoo': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/yahoo/, ''),
      },

      // --- Finnhub: real-time quotes, earnings, news, insider sentiment ---
      // Free: 60 calls/min | https://finnhub.io
      '/proxy/finnhub': {
        target: 'https://finnhub.io/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/finnhub/, ''),
      },

      // --- Alpha Vantage: technicals (RSI, MACD), fundamentals, forex ---
      // Free: 25 calls/day | https://www.alphavantage.co
      '/proxy/alphavantage': {
        target: 'https://www.alphavantage.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/alphavantage/, ''),
      },

      // --- FRED: macro data (CPI, GDP, interest rates, unemployment) ---
      // Free: unlimited | https://fred.stlouisfed.org/docs/api/api_key.html
      '/proxy/fred': {
        target: 'https://api.stlouisfed.org/fred',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/fred/, ''),
      },

      // --- CoinGecko: crypto prices, market cap, trending — no key needed ---
      // Free: ~30 calls/min | https://www.coingecko.com/api/documentation
      '/proxy/coingecko': {
        target: 'https://api.coingecko.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/coingecko/, ''),
      },

      // --- Financial Modeling Prep: DCF, income statements, peer comparison ---
      // Free: 250 calls/day | https://financialmodelingprep.com/developer
      // NOTE: /api/v3 was deprecated Aug 2025. Free tier now uses /stable/.
      '/proxy/fmp': {
        target: 'https://financialmodelingprep.com/stable',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/fmp/, ''),
      },

      // --- BRAPI: Brazilian B3 equity data (quotes, fundamentals) ---
      // Free tier | https://brapi.dev
      '/proxy/brapi': {
        target: 'https://brapi.dev/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/brapi/, ''),
      },

      // --- BCB: Brazilian Central Bank macro data (SELIC, IPCA, CDI) — no key ---
      // Free: unlimited | https://dadosabertos.bcb.gov.br
      '/proxy/bcb': {
        target: 'https://api.bcb.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/bcb/, ''),
      },

      // --- AwesomeAPI: Brazilian Real FX rates (USD/BRL, EUR/BRL) — no key ---
      // Free: unlimited | https://docs.awesomeapi.com.br
      '/proxy/awesomeapi': {
        target: 'https://economia.awesomeapi.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/awesomeapi/, ''),
      },

      // --- Admin API: taxonomy management backend (local) ---
      '/api/v1': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
