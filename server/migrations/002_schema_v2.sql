-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — Schema v2: terminal_view hierarchy + Brazil block structure
-- Target: Supabase (PostgreSQL)
-- Safe to run multiple times (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ADD NEW COLUMNS ───────────────────────────────────────────────────────────

ALTER TABLE groups    ADD COLUMN IF NOT EXISTS terminal_view TEXT NOT NULL DEFAULT 'global';
ALTER TABLE groups    ADD COLUMN IF NOT EXISTS block_id      TEXT;
ALTER TABLE groups    ADD COLUMN IF NOT EXISTS sort_order    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE groups    ADD COLUMN IF NOT EXISTS icon          TEXT;
ALTER TABLE groups    ADD COLUMN IF NOT EXISTS color         TEXT;

ALTER TABLE subgroups ADD COLUMN IF NOT EXISTS section_id    TEXT;
ALTER TABLE subgroups ADD COLUMN IF NOT EXISTS data_source   TEXT;
ALTER TABLE subgroups ADD COLUMN IF NOT EXISTS sort_order    INTEGER NOT NULL DEFAULT 0;

ALTER TABLE assets    ADD COLUMN IF NOT EXISTS terminal_view TEXT NOT NULL DEFAULT 'global';
ALTER TABLE assets    ADD COLUMN IF NOT EXISTS sort_order    INTEGER NOT NULL DEFAULT 0;

-- ── INSERT NEW BRAZIL BLOCK-GROUPS (idempotent via ON CONFLICT) ───────────────

INSERT INTO groups (id, display_name, description, slug, terminal_view, block_id, sort_order, icon, color)
VALUES
  ('br-mercado',   'Mercado',     'Ações, FIIs, ETFs e Índices do mercado brasileiro',   'br-mercado',   'brazil', 'mercado',   0, '🟢', '#00E676'),
  ('br-renda-fixa','Renda Fixa',  'Juros, crédito e títulos públicos brasileiros',        'br-renda-fixa','brazil', 'renda-fixa',1, '🟡', '#F9C300'),
  ('br-macro',     'Macro',       'Indicadores macroeconômicos e câmbio do Brasil',       'br-macro',     'brazil', 'macro',     2, '🔴', '#FF5252')
ON CONFLICT (id) DO UPDATE SET
  terminal_view = EXCLUDED.terminal_view,
  block_id      = EXCLUDED.block_id,
  sort_order    = EXCLUDED.sort_order,
  icon          = EXCLUDED.icon,
  color         = EXCLUDED.color,
  updated_at    = NOW();

-- ── BACKFILL terminal_view ON GROUPS ─────────────────────────────────────────

UPDATE groups SET terminal_view = 'global', sort_order = 0 WHERE id = 'equities';
UPDATE groups SET terminal_view = 'global', sort_order = 1 WHERE id = 'currencies';
UPDATE groups SET terminal_view = 'global', sort_order = 2 WHERE id = 'indices';
UPDATE groups SET terminal_view = 'global', sort_order = 3 WHERE id = 'digital-assets';
UPDATE groups SET terminal_view = 'global', sort_order = 4 WHERE id = 'commodities';
UPDATE groups SET terminal_view = 'global', sort_order = 5 WHERE id = 'fixed-income';

-- ── MIGRATE ASSETS OFF OLD brazil GROUP ──────────────────────────────────────
-- Must happen before subgroups migration (assets.group_id FK)

UPDATE assets
SET    group_id = 'br-mercado', terminal_view = 'brazil'
WHERE  group_id = 'brazil';

-- Backfill terminal_view = 'global' on all remaining assets
UPDATE assets
SET    terminal_view = 'global'
WHERE  terminal_view = 'global' AND group_id != 'brazil';

-- ── MIGRATE SUBGROUPS OFF OLD brazil GROUP ────────────────────────────────────

UPDATE subgroups SET group_id = 'br-mercado' WHERE group_id = 'brazil';

-- ── BACKFILL section_id + data_source ON BRAZIL SUBGROUPS ────────────────────

UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 0
WHERE id = 'br-bancos';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 1
WHERE id = 'br-utilities';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 2
WHERE id = 'br-commodities';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 3
WHERE id = 'br-consumo';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 4
WHERE id = 'br-construcao';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 5
WHERE id = 'br-infra';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 6
WHERE id = 'br-industrial';
UPDATE subgroups SET section_id = 'acoes-b3', data_source = 'brapi', sort_order = 7
WHERE id = 'br-saude';

UPDATE subgroups SET section_id = 'fiis',                data_source = 'brapi',          sort_order = 8
WHERE id = 'br-fiis';
UPDATE subgroups SET section_id = 'etfs',                data_source = 'brapi',          sort_order = 9
WHERE id = 'br-etfs';
UPDATE subgroups SET section_id = 'indices-benchmarks',  data_source = 'bcb_and_yahoo',  sort_order = 10
WHERE id = 'br-indices';

-- ── REMOVE OLD FLAT brazil GROUP (now orphaned — no FK references remain) ────

DELETE FROM groups WHERE id = 'brazil';

-- ── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_groups_terminal_view    ON groups(terminal_view);
CREATE INDEX IF NOT EXISTS idx_groups_sort_order       ON groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_assets_terminal_view    ON assets(terminal_view);
CREATE INDEX IF NOT EXISTS idx_subgroups_section_id    ON subgroups(section_id);
CREATE INDEX IF NOT EXISTS idx_subgroups_sort_order    ON subgroups(sort_order);
