-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006b — Retroactive Schema Record: Dashboard-Created Tables
-- GMT Global Markets Terminal
-- ─────────────────────────────────────────────────────────────────────────────
--
-- PURPOSE:
--   These 10 tables were created directly in the Supabase dashboard and have
--   no CREATE TABLE statement in the repo. This file resolves the schema drift
--   by providing a version-controlled record of their structure.
--
--   All statements use CREATE TABLE IF NOT EXISTS — running this on a live
--   database where the tables already exist is a safe no-op. Running on a
--   fresh database will create them.
--
-- HOW THIS FILE WAS BUILT:
--   Column names, types, and constraints were reconstructed from:
--   - server/routes/clubes.js (insert/update/select calls reveal columns)
--   - scripts/captureSnapshot.js (insert payload reveals market_snapshot schema)
--   - Frontend components that display these fields
--   Columns marked with "-- TODO: verify type in Supabase dashboard" have
--   types inferred from usage but not confirmed against the live schema.
--
-- RLS:
--   RLS policies for all these tables are defined in 006_rls_hardening.sql.
--   This file does NOT include RLS statements.
--
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. estatuto_versoes ─────────────────────────────────────────────────────
-- Active statute for each clube. At most one row per clube has valid_until = NULL.
-- Columns sourced from: clubes.js POST /:id/estatuto insert (lines 566-581)

CREATE TABLE IF NOT EXISTS estatuto_versoes (
  id                     BIGSERIAL PRIMARY KEY,
  clube_id               BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  valid_from             DATE        NOT NULL,
  valid_until            DATE,
  prazo_conversao_dias   INT         NOT NULL DEFAULT 1,
  prazo_pagamento_dias   INT         NOT NULL DEFAULT 5,
  carencia_dias          INT         NOT NULL DEFAULT 0,
  taxa_administracao     NUMERIC(8,6) NOT NULL DEFAULT 0,
  taxa_performance       NUMERIC(8,6) NOT NULL DEFAULT 0,
  benchmark_performance  TEXT        NOT NULL DEFAULT 'cdi',
  permite_derivativos    BOOLEAN     NOT NULL DEFAULT FALSE,
  politica_investimento  TEXT        NOT NULL DEFAULT '',
  irrf_rate              NUMERIC(8,6) NOT NULL DEFAULT 0.15,
  regime_tributario      TEXT        NOT NULL DEFAULT 'fia',
  versao_nota            TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estatuto_versoes_clube_id
  ON estatuto_versoes(clube_id);


-- ── 2. movimentacoes ────────────────────────────────────────────────────────
-- Aportes and resgates with lifecycle status tracking.
-- Columns sourced from: clubes.js POST /:id/movimentacoes insert (lines 696-707)
-- and PATCH status transitions (valor_cota, cotas_delta, data_pagamento, penalidade_atraso)

CREATE TABLE IF NOT EXISTS movimentacoes (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  cotista_id          BIGINT      NOT NULL REFERENCES cotistas(id),
  tipo                TEXT        NOT NULL CHECK (tipo IN ('aporte', 'resgate')),
  data_solicitacao    DATE        NOT NULL,
  data_conversao      DATE,
  status              TEXT        NOT NULL DEFAULT 'aguardando_recursos'
                      CHECK (status IN ('aguardando_recursos', 'recursos_confirmados', 'convertido', 'pago', 'cancelado')),
  valor_brl           NUMERIC(18,2) NOT NULL,
  valor_cota          NUMERIC(18,6),       -- set on recursos_confirmados transition
  cotas_delta         NUMERIC(18,6),       -- set on recursos_confirmados transition
  em_especie          BOOLEAN     NOT NULL DEFAULT TRUE,
  aprovacao_unanime   BOOLEAN,
  observacao          TEXT,
  data_pagamento      DATE,                -- set on pago transition
  penalidade_atraso   NUMERIC(18,2),       -- set on pago transition if late
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_clube_id
  ON movimentacoes(clube_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_cotista_id
  ON movimentacoes(cotista_id);


-- ── 3. ledger_entries ───────────────────────────────────────────────────────
-- Cash ledger for each clube. One entry per financial event.
-- Columns sourced from: clubes.js ledger insert calls (lines 769-778, 868-877)

CREATE TABLE IF NOT EXISTS ledger_entries (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  data                DATE        NOT NULL,
  tipo                TEXT        NOT NULL, -- 'aporte', 'resgate', 'irrf', 'cancelamento_aporte', 'cancelamento_resgate'
  valor_brl           NUMERIC(18,2) NOT NULL,
  running_balance     NUMERIC(18,2),
  ref_id              BIGINT,              -- FK to movimentacoes.id (or null for tax events)
  ref_type            TEXT,                -- 'movimentacao', 'tributacao'
  descricao           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_clube_id
  ON ledger_entries(clube_id);


-- ── 4. cotas_tranches ───────────────────────────────────────────────────────
-- Per-aporte tranche for FIFO cost basis tracking.
-- Columns sourced from: clubes.js insert on conversion (lines 854-863)

CREATE TABLE IF NOT EXISTS cotas_tranches (
  id                    BIGSERIAL PRIMARY KEY,
  cotista_id            BIGINT      NOT NULL REFERENCES cotistas(id),
  clube_id              BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  movimentacao_id       BIGINT      REFERENCES movimentacoes(id),
  data_aquisicao        DATE        NOT NULL,
  cotas_adquiridas      NUMERIC(18,6) NOT NULL,
  cotas_restantes       NUMERIC(18,6) NOT NULL,
  valor_cota_aquisicao  NUMERIC(18,6) NOT NULL,
  custo_total_brl       NUMERIC(18,2),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotas_tranches_clube_id
  ON cotas_tranches(clube_id);
CREATE INDEX IF NOT EXISTS idx_cotas_tranches_cotista_id
  ON cotas_tranches(cotista_id);


-- ── 5. cotistas_historico ───────────────────────────────────────────────────
-- Daily snapshot of each cotista's position. Upserted on conversion events.
-- Columns sourced from: clubes.js upsert on conversion (lines 889-896)

CREATE TABLE IF NOT EXISTS cotistas_historico (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  cotista_id          BIGINT      NOT NULL REFERENCES cotistas(id),
  data                DATE        NOT NULL,
  cotas_detidas       NUMERIC(18,6) NOT NULL,
  equity_pct          NUMERIC(12,8),
  valor_atual         NUMERIC(18,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clube_id, cotista_id, data)
);

CREATE INDEX IF NOT EXISTS idx_cotistas_historico_clube_id
  ON cotistas_historico(clube_id);


-- ── 6. clube_roles ──────────────────────────────────────────────────────────
-- Maps cotistas to their role within a specific clube.
-- Columns sourced from: clubes.js GET /:id/meu-role (lines 1299-1305)

CREATE TABLE IF NOT EXISTS clube_roles (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  cotista_id          BIGINT      NOT NULL REFERENCES cotistas(id),
  role                TEXT        NOT NULL DEFAULT 'member',  -- TODO: verify CHECK constraint in Supabase dashboard
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clube_id, cotista_id)
);

CREATE INDEX IF NOT EXISTS idx_clube_roles_clube_id
  ON clube_roles(clube_id);


-- ── 7. documentos_gerados ───────────────────────────────────────────────────
-- Generated documents: informes, extratos, DARFs, IR declarations, etc.
-- Columns sourced from: clubes.js POST /:id/documentos (lines 1235-1243)
-- and PATCH /:id/documentos/:did/enviado (line 1268)

CREATE TABLE IF NOT EXISTS documentos_gerados (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  tipo                TEXT        NOT NULL, -- 'informe_rendimentos', 'extrato_mensal', 'balancete', 'ata_assembleia', 'termo_adesao', 'anexo_b', 'darf', 'declaracao_ir', 'relatorio_anual'
  periodo             TEXT,                 -- e.g. '2026-03' or '2026'
  cotista_id          BIGINT      REFERENCES cotistas(id),
  payload_json        JSONB,
  share_token         UUID,
  retencao_ate        DATE,
  enviado_em          TIMESTAMPTZ,
  delivery_status     TEXT,                 -- 'enviado', etc.
  gerado_em           TIMESTAMPTZ DEFAULT NOW(), -- TODO: verify column name — used in ORDER BY in GET route
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_gerados_clube_id
  ON documentos_gerados(clube_id);
CREATE INDEX IF NOT EXISTS idx_documentos_gerados_cotista_id
  ON documentos_gerados(cotista_id);
-- TODO: verify if unique constraint exists in dashboard: (clube_id, tipo, periodo, cotista_id)


-- ── 8. audit_log ────────────────────────────────────────────────────────────
-- Append-only audit trail for all clube mutations.
-- Columns sourced from: clubes.js writeAuditLog helper (lines 47-57)

CREATE TABLE IF NOT EXISTS audit_log (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      REFERENCES clubes(id) ON DELETE CASCADE,
  user_id             UUID        REFERENCES auth.users(id),
  action              TEXT        NOT NULL,
  table_name          TEXT,
  record_id           TEXT,
  before_state        JSONB,
  after_state         JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_clube_id
  ON audit_log(clube_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log(action);


-- ── 9. eventos_corporativos ─────────────────────────────────────────────────
-- Flagged by Supabase linter but NOT referenced by any server route or
-- frontend component. Likely created in the dashboard during planning.
-- Schema below is a best guess — verify in Supabase dashboard.

CREATE TABLE IF NOT EXISTS eventos_corporativos (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT      REFERENCES clubes(id) ON DELETE CASCADE,
  tipo                TEXT,                 -- TODO: verify type and CHECK constraint
  descricao           TEXT,
  data_evento         DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- TODO: verify all columns in Supabase dashboard — this table has no usage in codebase


-- ── 10. market_snapshot ─────────────────────────────────────────────────────
-- Daily market price snapshots for the landing page ticker.
-- Written by: scripts/captureSnapshot.js (service_role key)
-- Read by: server/routes/snapshot.js (public, no auth)
-- Columns sourced from: captureSnapshot.js insert (lines 286-291)
-- and snapshot.js select (line 23)

CREATE TABLE IF NOT EXISTS market_snapshot (
  id                  BIGSERIAL PRIMARY KEY,
  snapshot_date       DATE        NOT NULL,
  snapshot_label      TEXT,
  assets              JSONB       NOT NULL,
  captured_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshot_captured_at
  ON market_snapshot(captured_at DESC);
