CREATE TABLE IF NOT EXISTS reenquadramento_events (
  id               BIGSERIAL PRIMARY KEY,
  clube_id         BIGINT NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  tipo_violacao    TEXT NOT NULL,
  descricao        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'aberto'
                   CHECK (status IN ('aberto','em_correcao','resolvido')),
  data_deteccao    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_resolucao   DATE,
  acao_tomada      TEXT,
  evidencia_url    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reenquadramento_clube
  ON reenquadramento_events(clube_id, status);
