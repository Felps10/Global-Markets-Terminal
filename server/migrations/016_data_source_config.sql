-- 016_data_source_config.sql
-- Data Source Engine — Phase B: the provider-precedence config store.
--
-- A single global config row consumed by resolvePrecedence(asset, overrides)
-- (server/lib/providerRouting.js) as ADMIN OVERRIDES layered on top of the baked-in
-- RECOMMENDED_EFFECTIVE defaults. Read/written ONLY through Express admin routes
-- (/api/v1/config/data-sources, requireAdmin) with the service-role key — the browser
-- never touches this via PostgREST, so RLS Pattern A (enable RLS, create no policies).
--
-- Shape of `config` (jsonb):
--   { "version": 1,
--     "global":    ["eodhd","yahoo"],              -- capability-filtered per asset at read time
--     "groups":    { "<group_id>":    ["yahoo"] },
--     "subgroups": { "<subgroup_id>": ["brapi","yahoo"] } }
-- Empty global/groups/subgroups (the seeded default) = pure recommended defaults, no override.
-- Resolution order per asset: subgroups[subgroup_id] ?? groups[group_id] ?? global ??
-- RECOMMENDED_EFFECTIVE[class], then filtered to capability-valid providers.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + seed via ON CONFLICT DO NOTHING.
-- No schema change to existing tables. Run manually in the Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS data_source_config (
  id         smallint    PRIMARY KEY DEFAULT 1,
  config     jsonb       NOT NULL DEFAULT '{"version":1,"global":[],"groups":{},"subgroups":{}}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_by uuid,  -- auth.users(id) of the admin who last saved (no FK: auth schema, nullable)
  CONSTRAINT data_source_config_singleton CHECK (id = 1)
);

-- RLS Pattern A — service-role only. Express (service role) is the sole accessor;
-- no browser PostgREST access → no policies (anon/authenticated get empty sets).
ALTER TABLE data_source_config ENABLE ROW LEVEL SECURITY;

-- Seed the singleton row with empty overrides (= pure recommended defaults) if absent.
INSERT INTO data_source_config (id, config)
  VALUES (1, '{"version":1,"global":[],"groups":{},"subgroups":{}}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

COMMIT;
