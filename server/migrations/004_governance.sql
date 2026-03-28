-- ── ASSEMBLEIAS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assembleias (
  id                  BIGSERIAL PRIMARY KEY,
  clube_id            BIGINT NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL CHECK (tipo IN ('ordinaria','extraordinaria')),
  status              TEXT NOT NULL DEFAULT 'agendada'
                      CHECK (status IN ('agendada','convocada','votacao_aberta','realizada','cancelada')),
  data_convocacao     DATE,
  data_realizacao     DATE NOT NULL,
  quorum_presente     INT,
  pauta               JSONB NOT NULL DEFAULT '[]',
  ata                 TEXT,
  b3_enviada_em       TIMESTAMPTZ,
  membros_notif_em    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assembleias_clube_id
  ON assembleias(clube_id);
CREATE INDEX IF NOT EXISTS idx_assembleias_data_realizacao
  ON assembleias(data_realizacao DESC);

-- ── VOTOS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assembleias_votos (
  id              BIGSERIAL PRIMARY KEY,
  assembleia_id   BIGINT NOT NULL REFERENCES assembleias(id) ON DELETE CASCADE,
  cotista_id      BIGINT NOT NULL REFERENCES cotistas(id),
  pauta_item_idx  INT NOT NULL,
  voto            TEXT NOT NULL CHECK (voto IN ('favor','contra','abstencao')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assembleia_id, cotista_id, pauta_item_idx)
);

CREATE INDEX IF NOT EXISTS idx_votos_assembleia
  ON assembleias_votos(assembleia_id);
