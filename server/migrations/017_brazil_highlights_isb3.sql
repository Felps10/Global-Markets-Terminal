-- 017_brazil_highlights_isb3.sql
-- Fix: the 20 brazil-highlights rows (br-g-*) duplicate br-acoes symbols but
-- were created (migration 007 + seed) WITHOUT meta.isB3 and with generic
-- type/sector. Client symbol-keyed maps collapse duplicates, so the flagless
-- row erases B3 routing → bare-symbol /api/v1/quote + chart 502s (drawer,
-- taxonomy consumers) and the 20 tickers silently dropped from the Brazil grid.
-- This mirrors the same-day src/data/assets.js edit; keep both in sync.
--
-- Targeted UPDATE by id on exactly 20 rows — deliberately NOT `npm run seed`:
-- the DB has drifted from assets.js beyond these rows (e.g. csan3 subgroup
-- br-petroleo vs file br-acoes), and a full re-seed would clobber that state.
--
-- Run manually in the Supabase SQL Editor. Idempotent.

begin;

update assets a
set
  meta       = coalesce(a.meta, '{}'::jsonb) || '{"isB3": true}'::jsonb,
  type       = v.type,
  sector     = v.sector,
  updated_at = now()
from (
  values
    ('br-g-petr4',  'equity-br', 'Petróleo'),
    ('br-g-vale3',  'equity-br', 'Mineração'),
    ('br-g-itub4',  'equity-br', 'Bancos'),
    ('br-g-bbdc4',  'equity-br', 'Bancos'),
    ('br-g-bbas3',  'equity-br', 'Bancos'),
    ('br-g-wege3',  'equity-br', 'Indústria'),
    ('br-g-abev3',  'equity-br', 'Varejo'),
    ('br-g-jbss3',  'equity-br', 'Agronegócio'),
    ('br-g-suzb3',  'equity-br', 'Outros'),
    ('br-g-embr3',  'equity-br', 'Indústria'),
    ('br-g-lren3',  'equity-br', 'Varejo'),
    ('br-g-bpac11', 'equity-br', 'Bancos'),
    ('br-g-b3sa3',  'equity-br', 'Bancos'),
    ('br-g-rent3',  'equity-br', 'Transporte'),
    ('br-g-ggbr4',  'equity-br', 'Mineração'),
    ('br-g-rdor3',  'equity-br', 'Saúde'),
    ('br-g-eqtl3',  'equity-br', 'Utilities'),
    ('br-g-tots3',  'equity-br', 'Telecom'),
    ('br-g-mglu3',  'equity-br', 'Varejo'),
    ('br-g-bvsp',   'index-br',  'Índice Amplo')
) as v(id, type, sector)
where a.id = v.id;

commit;

-- Verification: expect 20 rows, all isB3 = true.
-- select id, symbol, type, sector, meta->>'isB3' as isb3
-- from assets where id like 'br-g-%' order by id;
