/**
 * server/lib/dataSourceConfig.js
 *
 * Data Source Engine — Phase B config store access (DB layer).
 *
 * Loads/saves the singleton `data_source_config` row (service role). The loaded config
 * feeds resolvePrecedence(asset, overrides) in providerRouting.js as admin OVERRIDES on
 * top of the baked-in RECOMMENDED_EFFECTIVE defaults.
 *
 * Pure schema/validation lives in dataSourceConfigSchema.js (no DB) so it's unit-testable.
 *
 * Safe-by-default: if the table is missing (migration 016 not yet run) or unreachable,
 * loadConfig() returns EMPTY → the engine transparently runs on recommended defaults.
 */

import { supabase } from '../db.js';
import { EMPTY, normalize, validateConfig } from './dataSourceConfigSchema.js';

export { validateConfig } from './dataSourceConfigSchema.js';

const TTL = 5 * 60_000; // re-read at most every 5 min (matches symbolResolver)

let _cache = { ts: 0, config: null };

/** Clear the cache so the next loadConfig() re-reads (called after a save). */
export function invalidate() {
  _cache = { ts: 0, config: null };
}

/**
 * Current config (cached). Returns EMPTY (= recommended defaults) on any error so a
 * missing/unreachable config never darkens the feed.
 * @returns {Promise<{version:number, global:string[], groups:object, subgroups:object}>}
 */
export async function loadConfig() {
  if (_cache.ts && Date.now() - _cache.ts < TTL && _cache.config) return _cache.config;
  try {
    const { data, error } = await supabase
      .from('data_source_config')
      .select('config')
      .eq('id', 1)
      .single();
    if (error) throw new Error(error.message);
    const config = normalize(data?.config);
    _cache = { ts: Date.now(), config };
    return config;
  } catch (err) {
    console.error('[dataSourceConfig] load failed — using recommended defaults:', err.message);
    _cache = { ts: Date.now(), config: EMPTY };
    return EMPTY;
  }
}

/**
 * Save the config (upsert the singleton row) and bust the cache.
 * @param {object} input       the incoming config (validated here)
 * @param {string} [updatedBy] admin user id (for audit)
 * @returns {Promise<object>}  the normalized, saved config
 */
export async function saveConfig(input, updatedBy) {
  const config = validateConfig(input);
  const { error } = await supabase
    .from('data_source_config')
    .upsert({ id: 1, config, updated_at: new Date().toISOString(), updated_by: updatedBy || null });
  if (error) throw new Error(error.message);
  invalidate();
  return config;
}
