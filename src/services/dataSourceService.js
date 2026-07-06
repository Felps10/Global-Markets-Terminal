import { supabase } from '../lib/supabase.js';

// Data Source Engine config (Phase B/C) — admin-only. Mirrors userService's req() pattern.
const BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1/config`;

async function req(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

/**
 * @returns {Promise<{ config, recommended: {ideal, effective}, providers }>}
 *   config = current overrides; recommended = baked-in defaults; providers = capability matrix.
 */
export async function getDataSourceConfig() {
  return req('/data-sources');
}

/**
 * Save the precedence overrides. Server validates (rejects unknown providers/duplicates).
 * @param {{version?, global?, groups?, subgroups?}} config
 * @returns {Promise<{ config }>} the normalized, saved config
 */
export async function saveDataSourceConfig(config) {
  return req('/data-sources', { method: 'PUT', body: JSON.stringify(config) });
}
