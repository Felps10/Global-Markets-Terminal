/**
 * server/lib/terminalSymbols.js
 *
 * Canonical symbol lists for server-side Yahoo/CoinGecko/BRAPI fetching.
 * Shared by:
 *   - scripts/captureSnapshot.js (daily cron)
 *   - server/services/quoteFetchManager.js (live cache)
 */

// Yahoo Finance symbols — covers LandingPage ticker + Terminal Mini
export const YAHOO_SYMBOLS = [
  // Major indices
  '^GSPC', '^DJI', '^IXIC',
  // Blue chips
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
  // FX pairs
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X',
  // Financials / Healthcare / Energy / Semis
  'JPM', 'GS', 'XOM', 'CVX', 'LLY', 'UNH', 'TSM', 'AVGO',
  // International indices
  '^FTSE', '^N225',
  // More FX
  'USDCAD=X', 'AUDUSD=X',
  // Terminal Mini additions
  'AMD', 'AXP', 'ABBV', 'COST', 'AMT', 'BA', 'BE', 'BP',
  'BYDDY', 'BIIB', 'CAT', 'EWY',
  // Commodities / Fixed income ETFs
  'GC=F', 'BNO', 'CANE',
  'DVY', 'HYG', 'BIL', 'AGG',
];

// CoinGecko crypto IDs — key = display symbol, value = CoinGecko ID
export const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

// BRAPI (B3 Brazilian equities)
export const BRAPI_SYMBOLS = ['PETR4', 'ACWI11', 'ALZR11'];
