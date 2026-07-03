-- ═════════════════════════════════════════════════════════════════════════════
-- 013_role_authority_app_metadata.sql
-- ═════════════════════════════════════════════════════════════════════════════
-- SECURITY FIX + profiles cleanup.
--
-- Before: the authoritative role lived in Supabase Auth `user_metadata`, which
-- any authenticated user can edit on themselves via supabase.auth.updateUser().
-- That let a normal user self-promote to admin and pass every requireAdmin gate.
--
-- After: the role is authoritative in `app_metadata` (raw_app_meta_data), which
-- only the service role can write. The app code (server/middleware/auth.js,
-- server/routes/{users,auth}.js, and the client) now reads role from there.
--
-- This migration also does the single-admin cleanup decided 2026-07-03:
--   • felipearaujoc.10@gmail.com  -> admin   (the real operator)
--   • everyone else               -> user    (normalizes the extinct Clube-era
--                                             roles club_member/club_manager and
--                                             demotes the legacy test/seed admins
--                                             admin_test@gmt.com and
--                                             admin@terminal.local)
--
-- ── RUN ORDER ────────────────────────────────────────────────────────────────
-- 1. Run THIS migration in the Supabase SQL Editor FIRST.
--    It only writes app_metadata; it does NOT touch user_metadata, so the
--    currently-deployed (old) code — which still reads user_metadata.role — keeps
--    working with no lock-out window.
-- 2. Deploy the app_metadata code (this branch).
-- 3. Verify: log in as felipearaujoc.10@gmail.com → admin; a normal user cannot
--    self-promote (editing user_metadata.role no longer has any effect).
-- 4. Run 014_strip_role_from_user_metadata.sql to remove the now-dead field.
-- 5. Delete the two legacy admin accounts (admin panel, or
--    scripts/one-off cleanup) — they are plain users after this migration.
--
-- Idempotent. Re-running yields the same final state.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE auth.users
SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'role',
           CASE WHEN lower(email) = 'felipearaujoc.10@gmail.com'
                THEN 'admin'
                ELSE 'user'
           END
         );

COMMIT;

-- Verify (expect exactly one admin: felipearaujoc.10@gmail.com):
--   SELECT email,
--          raw_app_meta_data->>'role'  AS app_role,
--          raw_user_meta_data->>'role' AS legacy_user_role
--   FROM auth.users
--   ORDER BY app_role DESC, email;
