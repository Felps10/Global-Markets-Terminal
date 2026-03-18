// server/db.js
// ─── Supabase client ─────────────────────────────────────────────────────────
// Single shared client for all server-side database access.
// Schema is managed in the Supabase dashboard — no local migrations.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    '[db] Missing SUPABASE_URL — set it in your .env file.\n' +
    '     Find it in: Supabase dashboard → Settings → API → Project URL'
  );
}

if (!supabaseKey) {
  throw new Error(
    '[db] Missing SUPABASE_SERVICE_ROLE_KEY — set it in your .env file.\n' +
    '     Find it in: Supabase dashboard → Settings → API → service_role (secret) key\n' +
    '     ⚠ Never expose this key to the browser.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }, // server-side client never persists sessions
});

console.log(`[db] Supabase client initialized — project: ${supabaseUrl.slice(0, 20)}`);

// Default export — same client instance
export default supabase;

// ── No-op lifecycle hooks ─────────────────────────────────────────────────────
// These are called from server/index.js start(). They are intentional no-ops:
// schema is managed in the Supabase dashboard and seeding is run manually via
// `npm run seed` rather than on every server boot.

export function initSchema() {
  console.log('[db] Supabase — schema managed by Supabase dashboard, no local migration needed.');
}

export async function seedIfEmpty() {
  console.log('[db] Supabase — run `npm run seed` manually to seed taxonomy data.');
}
