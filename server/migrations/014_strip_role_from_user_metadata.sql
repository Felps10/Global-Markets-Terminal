-- ═════════════════════════════════════════════════════════════════════════════
-- 014_strip_role_from_user_metadata.sql
-- ═════════════════════════════════════════════════════════════════════════════
-- Hygiene follow-up to 013. Removes the now-vestigial `role` key from
-- user_metadata. Authorization reads app_metadata after the deploy, so a
-- lingering user_metadata.role has no effect — but leaving a client-writable
-- "role" field around is misleading and invites mistakes.
--
-- ── RUN ORDER ────────────────────────────────────────────────────────────────
-- Run this ONLY AFTER 013 has run AND the app_metadata code is deployed and
-- verified. (If you run it before deploy, the old code would read a missing
-- user_metadata.role and treat everyone as 'user' — fail-closed, but the admin
-- panel would be inaccessible until deploy.)
--
-- Run manually in the Supabase SQL Editor. Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';

COMMIT;

-- Verify (legacy_user_role should be NULL for everyone; app_role unchanged):
--   SELECT email,
--          raw_app_meta_data->>'role'  AS app_role,
--          raw_user_meta_data->>'role' AS legacy_user_role
--   FROM auth.users
--   ORDER BY app_role DESC, email;
