-- 020_t1_wave2_subgroups_assets.sql
-- T1 wave 2 from the 2026-07-17 FMP-Premium asset-universe audit:
--   (a) 6 NEW subgroups — the four sectors that had no home (consumer-staples,
--       utilities, telecom-media, materials), us-etfs (broad-US trackers), and
--       industrial-metals (copper);
--   (b) 33 new assets — 21 sector equities, 4 US core ETFs, copper pair
--       (HG=F + CPER), Brent (BZ=F), dollar-index futures (DX=F), 2 indices
--       (^RUT, ^STOXX50E), 2 FX crosses (EURGBP=X, EURJPY=X);
--   (c) consumer subgroup description updated (staples split out).
-- All quotes live-verified on FMP /stable 2026-07-17. Mirrors the same-day
-- src/data/subgroups.js + src/data/assets.js edits; keep them in sync.
-- Server code (same PR) adds fmpSymbols mappings (BZ=F/HG=F/DX=F/^RUT) and
-- sparkline/chart ETF proxies (HG=F→CPER, DX=F→UUP).
--
-- Targeted INSERTs, deliberately NOT `npm run seed` (see migration 017's note).
-- Run manually in the Supabase SQL Editor. Idempotent (ON CONFLICT DO NOTHING).

BEGIN;

-- (a) new subgroups ----------------------------------------------------------
insert into subgroups (id, display_name, description, slug, group_id, icon, color, section_id, data_source, sort_order)
values
  ('consumer-staples',  'Consumer Staples',  'GICS: Consumer Staples — food, beverage, tobacco, household', 'consumer-staples',  'equities',    '🧺',  '#8D6E63', null, null, 13),
  ('utilities',         'Utilities',         'GICS: Utilities — regulated electric & multi-utilities',      'utilities',         'equities',    '💡',  '#FBC02D', null, null, 14),
  ('telecom-media',     'Telecom & Media',   'GICS: Communication Services — carriers + media',             'telecom-media',     'equities',    '📡',  '#5E35B1', null, null, 15),
  ('materials',         'Materials',         'GICS: Materials — chemicals, industrial gases, miners',       'materials',         'equities',    '🧱',  '#795548', null, null, 16),
  ('us-etfs',           'US Core ETFs',      'Broad-market US trackers: SPY, QQQ, IWM, DIA',                'us-etfs',           'equities',    '🇺🇸', '#3F51B5', null, null, 17),
  ('industrial-metals', 'Industrial Metals', 'Copper — front-month futures + CPER ETF',                     'industrial-metals', 'commodities', '🔩',  '#B0BEC5', null, null, 3)
on conflict (id) do nothing;

-- (c) consumer description no longer claims staples --------------------------
update subgroups
set description = 'GICS: Consumer Discretionary (staples split out 2026-07)',
    updated_at  = now()
where id = 'consumer'
  and description like '%Staples%';

-- (b) assets -----------------------------------------------------------------
insert into assets (id, symbol, name, type, exchange, subgroup_id, group_id, terminal_view, active, sort_order, meta)
values
  -- consumer-staples
  ('pm',    'PM',    'Philip Morris',          'equity', 'NYSE',   'consumer-staples',  'equities',    'global', true, 0, null),
  ('cl',    'CL',    'Colgate-Palmolive',      'equity', 'NYSE',   'consumer-staples',  'equities',    'global', true, 0, null),
  ('mdlz',  'MDLZ',  'Mondelez',               'equity', 'NASDAQ', 'consumer-staples',  'equities',    'global', true, 0, null),
  ('mo',    'MO',    'Altria',                 'equity', 'NYSE',   'consumer-staples',  'equities',    'global', true, 0, null),
  ('ul',    'UL',    'Unilever',               'equity', 'NYSE',   'consumer-staples',  'equities',    'global', true, 0, null),
  ('bud',   'BUD',   'AB InBev',               'equity', 'NYSE',   'consumer-staples',  'equities',    'global', true, 0, null),
  -- utilities
  ('duk',   'DUK',   'Duke Energy',            'equity', 'NYSE',   'utilities',         'equities',    'global', true, 0, null),
  ('so',    'SO',    'Southern Company',       'equity', 'NYSE',   'utilities',         'equities',    'global', true, 0, null),
  ('d',     'D',     'Dominion Energy',        'equity', 'NYSE',   'utilities',         'equities',    'global', true, 0, null),
  ('aep',   'AEP',   'American Electric',      'equity', 'NASDAQ', 'utilities',         'equities',    'global', true, 0, null),
  ('sre',   'SRE',   'Sempra',                 'equity', 'NYSE',   'utilities',         'equities',    'global', true, 0, null),
  -- telecom-media
  ('t',     'T',     'AT&T',                   'equity', 'NYSE',   'telecom-media',     'equities',    'global', true, 0, null),
  ('vz',    'VZ',    'Verizon',                'equity', 'NYSE',   'telecom-media',     'equities',    'global', true, 0, null),
  ('tmus',  'TMUS',  'T-Mobile',               'equity', 'NASDAQ', 'telecom-media',     'equities',    'global', true, 0, null),
  ('dis',   'DIS',   'Disney',                 'equity', 'NYSE',   'telecom-media',     'equities',    'global', true, 0, null),
  ('cmcsa', 'CMCSA', 'Comcast',                'equity', 'NASDAQ', 'telecom-media',     'equities',    'global', true, 0, null),
  -- materials
  ('lin',   'LIN',   'Linde',                  'equity', 'NASDAQ', 'materials',         'equities',    'global', true, 0, null),
  ('shw',   'SHW',   'Sherwin-Williams',       'equity', 'NYSE',   'materials',         'equities',    'global', true, 0, null),
  ('apd',   'APD',   'Air Products',           'equity', 'NYSE',   'materials',         'equities',    'global', true, 0, null),
  ('fcx',   'FCX',   'Freeport-McMoRan',       'equity', 'NYSE',   'materials',         'equities',    'global', true, 0, null),
  ('nem',   'NEM',   'Newmont',                'equity', 'NYSE',   'materials',         'equities',    'global', true, 0, null),
  -- us-etfs
  ('spy',   'SPY',   'SPDR S&P 500',           'etf',    'NYSE',   'us-etfs',           'equities',    'global', true, 0, null),
  ('qqq',   'QQQ',   'Invesco QQQ',            'etf',    'NASDAQ', 'us-etfs',           'equities',    'global', true, 0, null),
  ('iwm',   'IWM',   'iShares Russell 2000',   'etf',    'NYSE',   'us-etfs',           'equities',    'global', true, 0, null),
  ('dia',   'DIA',   'SPDR Dow Jones',         'etf',    'NYSE',   'us-etfs',           'equities',    'global', true, 0, null),
  -- industrial-metals
  ('hg-f',  'HG=F',  'Copper Futures',         'futures','COMEX',  'industrial-metals', 'commodities', 'global', true, 0, '{"display": "HG"}'::jsonb),
  ('cper',  'CPER',  'US Copper Index Fund',   'etf',    'NYSE',   'industrial-metals', 'commodities', 'global', true, 0, null),
  -- energy-commodities
  ('bz-f',  'BZ=F',  'Brent Crude Futures',    'futures','ICE',    'energy-commodities','commodities', 'global', true, 0, '{"display": "BRENT"}'::jsonb),
  -- fx (incl. dollar-index futures)
  ('eurgbp','EURGBP=X','Euro / British Pound', 'forex',  'FOREX',  'fx',                'currencies',  'global', true, 0, '{"display": "EUR/GBP"}'::jsonb),
  ('eurjpy','EURJPY=X','Euro / Japanese Yen',  'forex',  'FOREX',  'fx',                'currencies',  'global', true, 0, '{"display": "EUR/JPY"}'::jsonb),
  ('dx-f',  'DX=F',  'US Dollar Index Futures','futures','ICE',    'fx',                'currencies',  'global', true, 0, '{"display": "DXY"}'::jsonb),
  -- indices
  ('rut',   '^RUT',  'Russell 2000',           'index',  'INDEX',  'indices',           'indices',     'global', true, 0, '{"display": "RUT"}'::jsonb),
  ('stoxx50e','^STOXX50E','Euro Stoxx 50',     'index',  'INDEX',  'indices',           'indices',     'global', true, 0, '{"display": "SX5E"}'::jsonb)
on conflict (id) do nothing;

-- Fail loudly if anything is missing (an id collision would be masked by
-- ON CONFLICT DO NOTHING as a silent no-op).
do $$
declare n int;
begin
  select count(*) into n from subgroups
  where id in ('consumer-staples','utilities','telecom-media','materials','us-etfs','industrial-metals');
  if n <> 6 then
    raise exception 'migration 020: expected 6 new subgroups, found %', n;
  end if;

  select count(*) into n from assets
  where id in ('pm','cl','mdlz','mo','ul','bud',
               'duk','so','d','aep','sre',
               't','vz','tmus','dis','cmcsa',
               'lin','shw','apd','fcx','nem',
               'spy','qqq','iwm','dia',
               'hg-f','cper','bz-f',
               'eurgbp','eurjpy','dx-f',
               'rut','stoxx50e')
    and active and terminal_view = 'global';
  if n <> 33 then
    raise exception 'migration 020: expected 33 active global wave-2 assets, found %', n;
  end if;
end $$;

COMMIT;

-- Verification:
-- select id, display_name, group_id, sort_order from subgroups
--   where sort_order >= 13 or id = 'industrial-metals' order by group_id, sort_order;
-- select id, symbol, subgroup_id, type from assets
--   where subgroup_id in ('consumer-staples','utilities','telecom-media','materials','us-etfs','industrial-metals')
--   or id in ('bz-f','eurgbp','eurjpy','dx-f','rut','stoxx50e') order by subgroup_id, id;
