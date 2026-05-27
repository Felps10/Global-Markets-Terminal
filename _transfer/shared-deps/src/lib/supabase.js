// ============================================================
// TRANSFER NOTE
// Source: src/lib/supabase.js
// Classification: SHARED INFRASTRUCTURE — reference only.
// Do not copy directly. New app must create its own equivalent.
// Clube used this for: Supabase auth client (session only, no data queries)
// New app action: new client pointing to new Supabase project credentials
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
