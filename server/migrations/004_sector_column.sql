-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Add sector column to assets table
-- Date: 2026-03-19
-- Description: Provides L4 classification within a subgroup (sectors,
--   categories, types). Replaces what was previously encoded as subgroup_id
--   for equities and meta->>'category' for Renda Fixa / Macro stubs.
-- Idempotent — safe to re-run.
-- Run manually in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Part 1: Add nullable sector column
ALTER TABLE assets ADD COLUMN IF NOT EXISTS sector TEXT;

-- Part 2: Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_assets_sector ON assets(sector);

-- Part 3: Backfill — migrate meta->>'category' → sector for existing assets
UPDATE assets
SET sector = meta->>'category'
WHERE meta->>'category' IS NOT NULL
  AND sector IS NULL;
