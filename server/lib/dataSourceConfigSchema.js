/**
 * server/lib/dataSourceConfigSchema.js
 *
 * Pure schema, normalization, and validation for the Data Source Engine config.
 * No DB, no env → unit-testable in isolation. Kept separate from dataSourceConfig.js
 * (which creates a Supabase client) so validation can be tested/reused without a client.
 */

import { PROVIDER_CAPS } from './providerRouting.js';

export const EMPTY = Object.freeze({ version: 1, global: [], groups: {}, subgroups: {} });

const VALID_PROVIDERS = new Set(Object.keys(PROVIDER_CAPS));

// ── Normalization (lenient — coerces stored data to shape, never throws) ──────

function cleanOrder(a) {
  if (!Array.isArray(a)) return [];
  const seen = new Set();
  const out = [];
  for (const p of a) {
    if (typeof p === 'string' && VALID_PROVIDERS.has(p) && !seen.has(p)) { seen.add(p); out.push(p); }
  }
  return out;
}

function cleanMap(m) {
  if (!m || typeof m !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    const order = cleanOrder(v);
    if (order.length) out[String(k)] = order;
  }
  return out;
}

export function normalize(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  return {
    version:   Number.isInteger(c.version) ? c.version : 1,
    global:    cleanOrder(c.global),
    groups:    cleanMap(c.groups),
    subgroups: cleanMap(c.subgroups),
  };
}

// ── Validation (strict — for incoming saves; throws WHY so the UI can show it) ─

/**
 * Validate an incoming config. Throws Error(message) on invalid input; returns the
 * normalized config on success. Stricter than normalize(): rejects unknown providers
 * and duplicates rather than silently dropping them.
 */
export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('config must be an object');
  }
  const checkOrder = (arr, label) => {
    if (!Array.isArray(arr)) throw new Error(`${label} must be an array of provider ids`);
    for (const p of arr) {
      if (typeof p !== 'string' || !VALID_PROVIDERS.has(p)) {
        throw new Error(`${label}: unknown provider "${p}" (valid: ${[...VALID_PROVIDERS].join(', ')})`);
      }
    }
    if (new Set(arr).size !== arr.length) throw new Error(`${label}: duplicate providers`);
  };
  const checkMap = (m, label) => {
    if (m === undefined) return;
    if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error(`${label} must be an object`);
    for (const [k, v] of Object.entries(m)) checkOrder(v, `${label}.${k}`);
  };

  if (input.global !== undefined) checkOrder(input.global, 'global');
  checkMap(input.groups, 'groups');
  checkMap(input.subgroups, 'subgroups');

  return normalize(input);
}
