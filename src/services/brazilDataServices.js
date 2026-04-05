// brazilDataServices.js
// Brazil Terminal data providers: BRAPI, BCB SGS
// (via /api/v1/brazil/macro), AwesomeAPI.
//
// SCOPE RULE: This file must never import from
// globalDataServices.js or call Yahoo Finance,
// Finnhub, FMP, FRED, AlphaVantage, or CoinGecko.
//
// fetchBrazilMacro() calls the Express endpoint
// which handles BCB+AwesomeAPI server-side.

import { supabase } from '../lib/supabase.js';

// ── BRAPI (re-exported from legacy dataServices) ────
export {
  hasBrapiToken,
  brapiQuote,
  fetchB3MarketData,
} from '../dataServices.js';

// ── Auth helpers (same pattern as taxonomyService.js) ──
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── BCB + AwesomeAPI (via Express endpoint) ─────────
/**
 * Fetch Brazil macro data from the backend endpoint
 * built in Prompt 2 (server/routes/brazilMacro.js).
 *
 * Returns { bcb: {...}, fx: {...}, timestamp, errors }
 * or null on complete failure.
 */
export async function fetchBrazilMacro() {
  const base = import.meta.env.VITE_API_URL || '';
  const headers = await authHeaders();
  try {
    const res = await fetch(`${base}/api/v1/brazil/macro`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
