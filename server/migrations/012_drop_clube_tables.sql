-- ═════════════════════════════════════════════════════════════════════════════
-- 012_drop_clube_tables.sql
-- ═════════════════════════════════════════════════════════════════════════════
-- Clube GMT (the Brazilian investment-club feature) was extracted OUT of this
-- repo on 2026-05-27 (see _transfer/ and _transfer/TRANSFER.md). Its 16 tables
-- were left behind in the GMT database, where they are now dead schema:
--   • Nothing in server/ or src/ reads or writes them (server/routes/clubes.js
--     and the engine files were deleted with the extraction).
--   • posicoes.asset_id had a `NOT NULL REFERENCES assets(id)` FK, so deleting an
--     asset referenced by any posicoes row would fail with a FK violation (23503)
--     and surface as a 500 in the admin asset-delete endpoint. Dropping posicoes
--     removes that landmine.
--
-- The full schema (+ seed) is preserved read-only under
-- server/migrations/001_clube_schema.sql, 004_governance.sql,
-- 005_reenquadramento.sql, 006b_retroactive_schema_dashboard_tables.sql, and
-- _transfer/, so the standalone Clube app can recreate it.
--
-- Run manually in the Supabase SQL Editor. Idempotent. DESTRUCTIVE — if you
-- still want any Clube data for the standalone app, export it BEFORE running.
--
-- NOTE: market_snapshot lives in 006b too but is a CORE terminal table
-- (snapshot cron + public landing page). It is intentionally NOT dropped here.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop in dependency order isn't required with CASCADE, but every table is
-- listed explicitly so the set is auditable. All FKs between these tables
-- (and posicoes → assets) are removed as the tables go.
DROP TABLE IF EXISTS
  assembleias_votos,
  assembleias,
  reenquadramento_events,
  estatuto_versoes,
  movimentacoes,
  ledger_entries,
  cotas_tranches,
  cotistas_historico,
  clube_roles,
  documentos_gerados,
  audit_log,
  eventos_corporativos,
  nav_historico,
  posicoes,
  cotistas,
  clubes
CASCADE;

COMMIT;

-- Verify (run after COMMIT — every row should report 'dropped'):
--   SELECT t.name,
--          CASE WHEN to_regclass('public.' || t.name) IS NULL
--               THEN 'dropped' ELSE 'STILL PRESENT' END AS status
--   FROM (VALUES ('clubes'),('cotistas'),('posicoes'),('nav_historico'),
--                ('assembleias'),('assembleias_votos'),('reenquadramento_events'),
--                ('estatuto_versoes'),('movimentacoes'),('ledger_entries'),
--                ('cotas_tranches'),('cotistas_historico'),('clube_roles'),
--                ('documentos_gerados'),('audit_log'),('eventos_corporativos')) AS t(name);
