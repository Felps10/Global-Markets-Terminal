-- Migration 011: Backfill initial aporte movimentacoes
-- Creates synthetic 'convertido' aporte records for
-- cotistas who have cotas_detidas > 0 but no aporte.
--
-- Uses NAV valor_cota at or before data_entrada.
-- Falls back to clube.valor_cota_inicial if no NAV exists.
-- Idempotent: only inserts where no aporte exists.
-- Applied manually via Supabase SQL Editor.

INSERT INTO movimentacoes (
  clube_id,
  cotista_id,
  tipo,
  status,
  valor_brl,
  valor_cota,
  cotas_delta,
  data_solicitacao,
  data_conversao,
  em_especie,
  observacao
)
SELECT
  c.clube_id,
  c.id                                        AS cotista_id,
  'aporte'                                    AS tipo,
  'convertido'                                AS status,
  -- valor_brl = cotas × valor_cota at entry
  c.cotas_detidas * COALESCE(
    (
      SELECT n.valor_cota
      FROM   nav_historico n
      WHERE  n.clube_id = c.clube_id
        AND  n.data <= c.data_entrada
      ORDER  BY n.data DESC
      LIMIT  1
    ),
    cl.valor_cota_inicial,
    1000
  )                                           AS valor_brl,
  -- valor_cota at entry
  COALESCE(
    (
      SELECT n.valor_cota
      FROM   nav_historico n
      WHERE  n.clube_id = c.clube_id
        AND  n.data <= c.data_entrada
      ORDER  BY n.data DESC
      LIMIT  1
    ),
    cl.valor_cota_inicial,
    1000
  )                                           AS valor_cota,
  c.cotas_detidas                             AS cotas_delta,
  c.data_entrada                              AS data_solicitacao,
  c.data_entrada                              AS data_conversao,
  TRUE                                        AS em_especie,
  'Aporte inicial — backfill automático'      AS observacao
FROM  cotistas c
JOIN  clubes   cl ON cl.id = c.clube_id
WHERE c.cotas_detidas > 0
  AND c.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM   movimentacoes m
    WHERE  m.cotista_id = c.id
      AND  m.tipo = 'aporte'
  );
