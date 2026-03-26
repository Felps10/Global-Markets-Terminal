-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — Taxonomy v3: L1 nodes (Global / Brasil)
-- Date: 2026-03-18
-- Description: Introduces the l1_nodes table to represent the top level of
--   the three-level taxonomy (L1 → L2 groups → L3 subgroups). Adds and
--   backfills l1_id on the groups table, then enforces NOT NULL. Also
--   inserts AMER3 (Americanas) if it is absent.
-- Non-destructive: no tables dropped, no columns dropped, no data deleted.
-- Run manually in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────


-- Part 1: Create l1_nodes table and seed the two root nodes

CREATE TABLE IF NOT EXISTS l1_nodes (
  id           text        PRIMARY KEY,
  display_name text        NOT NULL,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO l1_nodes (id, display_name, sort_order) VALUES
  ('global', 'Global', 0),
  ('brasil', 'Brasil', 1)
ON CONFLICT (id) DO NOTHING;


-- Part 2: Add l1_id column to groups (nullable first, to allow backfill)

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS l1_id text REFERENCES l1_nodes(id);


-- Part 3: Backfill l1_id on all existing group rows

UPDATE groups SET l1_id = 'global'
WHERE id IN ('equities', 'commodities', 'digital-assets', 'fixed-income', 'currencies', 'indices');

UPDATE groups SET l1_id = 'brasil'
WHERE id IN ('br-mercado', 'br-renda-fixa', 'br-macro');


-- Guard: abort if any group row still has l1_id NULL
-- This protects against groups added via admin UI after the last seed.
-- If this raises, run: SELECT id FROM groups WHERE l1_id IS NULL;
-- then manually assign l1_id for those rows before re-running Part 4.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM groups WHERE l1_id IS NULL) THEN
    RAISE EXCEPTION 'Migration aborted: one or more groups have l1_id = NULL. '
      'Assign l1_id manually for those rows before running Part 4.';
  END IF;
END $$;


-- Part 4: Enforce NOT NULL on l1_id now that every row is backfilled

ALTER TABLE groups
  ALTER COLUMN l1_id SET NOT NULL;


-- Part 5: Insert AMER3 (Americanas) if it does not already exist

INSERT INTO assets (
  id, symbol, name, subgroup_id, group_id,
  type, currency, exchange, active, meta,
  terminal_view, sort_order
) VALUES (
  'amer3',
  'AMER3',
  'Americanas',
  'br-varejo',
  'br-mercado',
  'equity-br',
  'BRL',
  'B3',
  true,
  '{"isB3": true}',
  'brazil',
  99
)
ON CONFLICT (id) DO NOTHING;
