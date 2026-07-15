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

BEGIN;

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

-- ^BVSP also lost its display identity to the highlights row — mirror br-ibov.
update assets
set name       = 'Ibovespa',
    meta       = coalesce(meta, '{}'::jsonb) || '{"display": "IBOV"}'::jsonb,
    updated_at = now()
where id = 'br-g-bvsp';

-- Fail loudly (aborting the transaction) if any target row is missing or its
-- id drifted from assets.js — a silent partial match would leave that symbol's
-- DB duplicate flagless while the client-side tests report the collision fixed.
do $$
declare n int;
begin
  select count(*) into n
  from assets
  where id in ('br-g-petr4','br-g-vale3','br-g-itub4','br-g-bbdc4','br-g-bbas3',
               'br-g-wege3','br-g-abev3','br-g-jbss3','br-g-suzb3','br-g-embr3',
               'br-g-lren3','br-g-bpac11','br-g-b3sa3','br-g-rent3','br-g-ggbr4',
               'br-g-rdor3','br-g-eqtl3','br-g-tots3','br-g-mglu3','br-g-bvsp')
    and type in ('equity-br', 'index-br')
    and (meta->>'isB3')::boolean;
  if n <> 20 then
    raise exception 'migration 017: expected 20 fixed br-g-* rows, found % — DB ids drifted from assets.js', n;
  end if;
end $$;

COMMIT;

-- Verification: expect 20 rows, all isB3 = true.
-- select id, symbol, type, sector, meta->>'isB3' as isb3
-- from assets where id like 'br-g-%' order by id;
