-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006 — RLS Hardening
-- GMT Global Markets Terminal — solo developer project
-- ─────────────────────────────────────────────────────────────────────────────
--
-- PROBLEM:
--   Supabase exposes all public-schema tables via PostgREST at
--   https://<project>.supabase.co/rest/v1/<table>
--   VITE_SUPABASE_ANON_KEY is intentionally public (compiled into the Vite
--   browser bundle). Without RLS, anyone with the anon key can directly
--   read and write all tables, bypassing Express and its auth middleware.
--
-- WHY THIS IS SAFE TO RUN:
--   The Express backend uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
--   by design (Supabase's intended architecture). Enabling RLS has zero
--   effect on any Express route. Only PostgREST direct access is affected.
--
-- SCOPE:
--   19 tables covered. 2 tables (user_watchlists, user_preferences) already
--   have correct RLS from migration 002_user_data.sql — not touched here.
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor
--   2. Paste full file contents → Run
--   3. Confirm: "Success. No rows returned."
--   4. Verify: Database → Tables → every table shows the RLS shield icon
--   5. Run the Supabase linter again — zero rls_disabled_in_public errors expected
--
-- ROLLBACK (per table if needed):
--   ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;
--
-- NOTE ON 001_clube_schema.sql:
--   That migration runs ALTER TABLE ... DISABLE ROW LEVEL SECURITY on 4 clube
--   tables with the comment "server-side client uses service role key."
--   That rationale was correct but the conclusion was wrong — service_role
--   bypassing RLS is orthogonal to whether RLS is enabled. This migration
--   supersedes those DISABLE statements.
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;


-- ═════════════════════════════════════════════════════════════════════════════
-- PATTERN A: service_role only (deny all via PostgREST)
-- ═════════════════════════════════════════════════════════════════════════════
-- These tables are accessed exclusively by the Express backend using the
-- service_role key. No SELECT policy is created — anon and authenticated
-- PostgREST calls return empty result sets. All reads/writes go through
-- Express routes with auth middleware.


-- ── GMT Terminal: taxonomy tables ────────────────────────────────────────────

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: groups.js (auth required).

ALTER TABLE subgroups ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: subgroups.js (auth required).

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: assets.js (auth required).

ALTER TABLE l1_nodes ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: l1.js, taxonomy.js (auth required).


-- ── Clube GMT: core tables ──────────────────────────────────────────────────
-- These 4 tables had explicit DISABLE ROW LEVEL SECURITY in 001_clube_schema.sql.
-- This migration supersedes those statements.

ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js (auth + role required).

ALTER TABLE cotistas ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js (auth + role required).

ALTER TABLE posicoes ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js (auth + role required).

ALTER TABLE nav_historico ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js (auth + role required).


-- ── Clube GMT: financial operations ─────────────────────────────────────────

ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js movimentacoes endpoints.

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js ledger endpoints.

ALTER TABLE cotas_tranches ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js tributacao/resgate endpoints.

ALTER TABLE cotistas_historico ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js conversion/export endpoints.


-- ── Clube GMT: governance ───────────────────────────────────────────────────

ALTER TABLE estatuto_versoes ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js estatuto endpoints.

-- ── Clube GMT: roles & documents ────────────────────────────────────────────

ALTER TABLE clube_roles ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js meu-role endpoint.

ALTER TABLE documentos_gerados ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js documentos/IR endpoints.

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Express routes: clubes.js audit-log endpoint.


-- ── Clube GMT: eventos_corporativos (dead table — no route references it) ───

ALTER TABLE eventos_corporativos ENABLE ROW LEVEL SECURITY;
-- No policy: service_role only. Not currently used by any route.
-- Locked down defensively. Consider dropping if confirmed unused.


-- ═════════════════════════════════════════════════════════════════════════════
-- PATTERN C: public read-only
-- ═════════════════════════════════════════════════════════════════════════════
-- Public data served to unauthenticated pages. Anyone can read via PostgREST.
-- No write access via PostgREST — only the cron script writes (service_role).

ALTER TABLE market_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_market_snapshot" ON market_snapshot;
CREATE POLICY "public_read_market_snapshot"
  ON market_snapshot
  FOR SELECT
  USING (true);
-- Allows: anon and authenticated reads via PostgREST.
-- Denies: insert, update, delete via PostgREST.
-- Write path: scripts/captureSnapshot.js uses service_role key.
-- Read path: server/routes/snapshot.js (public, no auth) and PostgREST.


-- ═════════════════════════════════════════════════════════════════════════════
-- DROP: dead tables
-- ═════════════════════════════════════════════════════════════════════════════
-- profiles was created in 001_initial_schema.sql as a planned mirror of
-- auth.users. The architecture shifted to storing name/role in Supabase Auth
-- user_metadata instead. Nothing reads from or writes to this table.

DROP TABLE IF EXISTS profiles;


COMMIT;
