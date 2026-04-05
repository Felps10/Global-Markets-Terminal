-- 007_brazil_highlights.sql
-- Prompt 1 of 5: Backend fixes + DB cleanup + Brazil Highlights subgroup
--
-- What this does:
--   1. Deletes duplicate FX assets (USDBRL, USDBRL=X) — canonical is USD-BRL
--   2. Inserts 'brazil-highlights' subgroup under 'equities' group
--   3. Inserts 20 top B3 stocks as global terminal assets (Yahoo .SA tickers)
--
-- Idempotent: uses ON CONFLICT for inserts, DELETE is safe if rows absent.
-- Run in Supabase SQL Editor.

BEGIN;

-- ── Step 1: Remove duplicate FX assets ──────────────────────────────────────
DELETE FROM assets WHERE symbol IN ('USDBRL', 'USDBRL=X');

-- ── Step 2: Insert brazil-highlights subgroup ───────────────────────────────
INSERT INTO subgroups (
  id, display_name, description, slug,
  group_id, icon, color, sort_order
)
VALUES (
  'brazil-highlights',
  'Brazil Equities',
  'Top 20 B3 stocks by global relevance — prices via Yahoo Finance',
  'brazil-highlights',
  'equities',
  '🇧🇷',
  '#F5C518',
  99
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  color        = EXCLUDED.color,
  updated_at   = NOW();

-- ── Step 3: Insert 20 B3 assets (Global Terminal, Yahoo Finance) ────────────
INSERT INTO assets (
  id, symbol, name, subgroup_id, group_id,
  terminal_view, type, exchange, currency, active, meta
) VALUES
  ('br-g-petr4',  'PETR4',  'Petrobras PN',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"PETR4.SA","market":"B3"}'::jsonb),
  ('br-g-vale3',  'VALE3',  'Vale',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"VALE3.SA","market":"B3"}'::jsonb),
  ('br-g-itub4',  'ITUB4',  'Itau Unibanco PN',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"ITUB4.SA","market":"B3"}'::jsonb),
  ('br-g-bbdc4',  'BBDC4',  'Bradesco PN',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"BBDC4.SA","market":"B3"}'::jsonb),
  ('br-g-bbas3',  'BBAS3',  'Banco do Brasil',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"BBAS3.SA","market":"B3"}'::jsonb),
  ('br-g-wege3',  'WEGE3',  'WEG',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"WEGE3.SA","market":"B3"}'::jsonb),
  ('br-g-abev3',  'ABEV3',  'Ambev',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"ABEV3.SA","market":"B3"}'::jsonb),
  ('br-g-jbss3',  'JBSS3',  'JBS',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"JBSS3.SA","market":"B3"}'::jsonb),
  ('br-g-suzb3',  'SUZB3',  'Suzano',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"SUZB3.SA","market":"B3"}'::jsonb),
  ('br-g-embr3',  'EMBR3',  'Embraer',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"EMBR3.SA","market":"B3"}'::jsonb),
  ('br-g-lren3',  'LREN3',  'Lojas Renner',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"LREN3.SA","market":"B3"}'::jsonb),
  ('br-g-bpac11', 'BPAC11', 'BTG Pactual',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"BPAC11.SA","market":"B3"}'::jsonb),
  ('br-g-b3sa3',  'B3SA3',  'B3 Exchange',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"B3SA3.SA","market":"B3"}'::jsonb),
  ('br-g-rent3',  'RENT3',  'Localiza',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"RENT3.SA","market":"B3"}'::jsonb),
  ('br-g-ggbr4',  'GGBR4',  'Gerdau PN',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"GGBR4.SA","market":"B3"}'::jsonb),
  ('br-g-rdor3',  'RDOR3',  'Rede D''Or',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"RDOR3.SA","market":"B3"}'::jsonb),
  ('br-g-eqtl3',  'EQTL3',  'Equatorial Energia',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"EQTL3.SA","market":"B3"}'::jsonb),
  ('br-g-tots3',  'TOTS3',  'TOTVS',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"TOTS3.SA","market":"B3"}'::jsonb),
  ('br-g-mglu3',  'MGLU3',  'Magazine Luiza',
    'brazil-highlights','equities','global','equity','B3','BRL',true,
    '{"yahooSymbol":"MGLU3.SA","market":"B3"}'::jsonb),
  ('br-g-bvsp',   '^BVSP',  'Bovespa Index',
    'brazil-highlights','equities','global','index','B3','BRL',true,
    '{"yahooSymbol":"^BVSP","market":"B3"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  symbol       = EXCLUDED.symbol,
  name         = EXCLUDED.name,
  meta         = EXCLUDED.meta,
  active       = EXCLUDED.active,
  updated_at   = NOW();

COMMIT;
