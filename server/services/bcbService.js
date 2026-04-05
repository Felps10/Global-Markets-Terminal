// server/services/bcbService.js
// BCB SGS batch service + AwesomeAPI FX rates for Brazil macro data.
// Queries Supabase for assets with meta.bcbSeries, fetches them in parallel.

import { supabase } from '../db.js';

// ── TTL caches ──────────────────────────────────────────────────────────────
const _bcbCache = { data: null, ts: 0 };
const _fxCache  = { data: null, ts: 0 };
const TTL_MS = 60_000;

// ── fetchBCBMacro ───────────────────────────────────────────────────────────
export async function fetchBCBMacro() {
  if (_bcbCache.data && (Date.now() - _bcbCache.ts) < TTL_MS) {
    return _bcbCache.data;
  }

  // 1. Query Supabase for all BCB assets with a series number
  const { data: rows, error: dbError } = await supabase
    .from('assets')
    .select('id, symbol, name, subgroup_id, meta')
    .eq('exchange', 'BCB')
    .not('meta->bcbSeries', 'is', null);

  if (dbError) {
    console.error('[bcbService] Supabase query failed:', dbError.message);
    return null;
  }

  if (!rows || rows.length === 0) {
    console.error('[bcbService] No BCB assets found in database');
    return null;
  }

  // 2. Fetch all series in parallel
  const fetches = rows.map(async (row) => {
    const meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
    const seriesId = meta?.bcbSeries;
    if (!seriesId) return { symbol: row.symbol, value: null, date: null, error: true, seriesId: null, name: row.name, subgroup_id: row.subgroup_id, category: meta?.sector || null };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/1?formato=json`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        console.error(`[bcbService] BCB series ${seriesId} (${row.symbol}) HTTP ${res.status}`);
        return { symbol: row.symbol, value: null, date: null, error: true, seriesId, name: row.name, subgroup_id: row.subgroup_id, category: meta?.sector || null };
      }

      const data = await res.json();
      if (!Array.isArray(data) || !data[0]?.valor) {
        return { symbol: row.symbol, value: null, date: null, error: true, seriesId, name: row.name, subgroup_id: row.subgroup_id, category: meta?.sector || null };
      }

      return {
        symbol: row.symbol,
        value: parseFloat(data[0].valor),
        date: data[0].data,
        seriesId,
        name: row.name,
        subgroup_id: row.subgroup_id,
        category: meta?.sector || null,
      };
    } catch (err) {
      clearTimeout(timeout);
      console.error(`[bcbService] BCB series ${seriesId} (${row.symbol}) failed:`, err.message);
      return { symbol: row.symbol, value: null, date: null, error: true, seriesId, name: row.name, subgroup_id: row.subgroup_id, category: meta?.sector || null };
    }
  });

  const results = await Promise.allSettled(fetches);

  // 3. Build result object keyed by symbol
  const output = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      const { symbol, ...rest } = r.value;
      output[symbol] = rest;
    }
  }

  if (Object.keys(output).length > 0) {
    _bcbCache.data = output;
    _bcbCache.ts = Date.now();
  }

  return Object.keys(output).length > 0 ? output : null;
}

// ── fetchBRLRates ───────────────────────────────────────────────────────────
export async function fetchBRLRates() {
  if (_fxCache.data && (Date.now() - _fxCache.ts) < TTL_MS) {
    return _fxCache.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL',
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[bcbService] AwesomeAPI HTTP ${res.status}`);
      return {};
    }

    const data = await res.json();
    const result = {};

    const pairs = { USDBRL: 'USD-BRL', EURBRL: 'EUR-BRL', GBPBRL: 'GBP-BRL' };
    for (const [apiKey, displayKey] of Object.entries(pairs)) {
      if (data?.[apiKey]) {
        result[displayKey] = {
          value: parseFloat(data[apiKey].bid),
          change: parseFloat(data[apiKey].pctChange),
          changePct: parseFloat(data[apiKey].pctChange),
          unit: 'BRL',
        };
      }
    }

    if (Object.keys(result).length > 0) {
      _fxCache.data = result;
      _fxCache.ts = Date.now();
    }

    return result;
  } catch (err) {
    clearTimeout(timeout);
    console.error('[bcbService] AwesomeAPI failed:', err.message);
    return {};
  }
}
