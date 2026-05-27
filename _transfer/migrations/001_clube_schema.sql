-- ============================================================
-- TRANSFER NOTE
-- Source: server/migrations/001_clube_schema.sql
-- Classification: CLUBE-ONLY
-- Tables: clubes, cotistas, posicoes, nav_historico
-- ============================================================

-- ⚠ NOTE (added by migration 006): The DISABLE ROW LEVEL SECURITY statements
-- at the bottom of this file have been superseded by 006_rls_hardening.sql.
-- Do not use DISABLE ROW LEVEL SECURITY in future migrations. See RLS_POLICY_GUIDE.md.

-- GMT Clube de Investimento — Schema Migration 001
-- Run this manually in the Supabase SQL Editor BEFORE starting the server.
-- Safe to re-run: all statements use IF NOT EXISTS.

-- ── TABLE 1: clubes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clubes (
  id                   BIGSERIAL PRIMARY KEY,
  nome                 TEXT        NOT NULL,
  cnpj                 TEXT,
  corretora            TEXT,
  data_constituicao    DATE,
  valor_cota_inicial   NUMERIC(18,6) NOT NULL DEFAULT 1000.0,
  benchmark_ibov       BOOLEAN     NOT NULL DEFAULT TRUE,
  benchmark_cdi        BOOLEAN     NOT NULL DEFAULT TRUE,
  status               TEXT        NOT NULL DEFAULT 'ativo'
                         CHECK (status IN ('ativo', 'encerrado')),
  created_by           UUID        REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE 2: cotistas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotistas (
  id                   BIGSERIAL PRIMARY KEY,
  clube_id             BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  nome                 TEXT        NOT NULL,
  cotas_detidas        NUMERIC(18,6) NOT NULL CHECK (cotas_detidas > 0),
  data_entrada         DATE        NOT NULL,
  ativo                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE 3: posicoes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posicoes (
  id                   BIGSERIAL PRIMARY KEY,
  clube_id             BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  asset_id             TEXT        NOT NULL REFERENCES assets(id),
  peso_alvo            NUMERIC(8,6) NOT NULL CHECK (peso_alvo > 0 AND peso_alvo <= 1),
  data_referencia      DATE        NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clube_id, asset_id)
);

-- ── TABLE 4: nav_historico ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nav_historico (
  id                   BIGSERIAL PRIMARY KEY,
  clube_id             BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  data                 DATE        NOT NULL,
  valor_cota           NUMERIC(18,6) NOT NULL,
  patrimonio_total     NUMERIC(18,2),
  cotas_emitidas       NUMERIC(18,6),
  retorno_diario       NUMERIC(12,8),
  retorno_acumulado    NUMERIC(12,8),
  retorno_ibov         NUMERIC(12,8),
  retorno_cdi          NUMERIC(12,8),
  percentual_rv        NUMERIC(8,6),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clube_id, data)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posicoes_clube_id
  ON posicoes(clube_id);
CREATE INDEX IF NOT EXISTS idx_nav_historico_clube_id
  ON nav_historico(clube_id);
CREATE INDEX IF NOT EXISTS idx_nav_historico_clube_data
  ON nav_historico(clube_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_cotistas_clube_id
  ON cotistas(clube_id);

-- ── RLS: disable for now (server-side client uses service role key) ───────────
ALTER TABLE clubes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE cotistas     DISABLE ROW LEVEL SECURITY;
ALTER TABLE posicoes     DISABLE ROW LEVEL SECURITY;
ALTER TABLE nav_historico DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SCHEMA SURGERY REQUIRED FOR NEW APP — posicoes table
--
-- Current constraint:
--   asset_id TEXT NOT NULL REFERENCES assets(id)
--   UNIQUE (clube_id, asset_id)
--
-- Replace with inline asset fields:
--   ticker  TEXT NOT NULL,
--   nome    TEXT,
--   tipo    TEXT,
--   UNIQUE (clube_id, ticker)
--
-- Data migration required (run against GMT DB before export):
--   1. Add ticker, nome, tipo columns
--   2. UPDATE posicoes SET
--        ticker = a.symbol,
--        nome   = a.name,
--        tipo   = a.type
--      FROM assets a WHERE posicoes.asset_id = a.id
--   3. Drop asset_id column and FK constraint
--
-- Code changes required in clubes.js — 4 query sites:
--   Lines 80-83:   computeCompliance() — replace assets.group_id query
--                  with posicoes.tipo check
--   Lines 258-261: GET /:id/posicoes — remove assets join,
--                  return inline ticker/nome/tipo from posicoes row
--   Lines 298-302: PUT /:id/posicoes — remove asset validation query,
--                  accept ticker/nome/tipo in request body
--   Line 863:      Dashboard compliance alert — rewrite to use posicoes.tipo
-- ============================================================
