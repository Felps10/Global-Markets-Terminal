-- 019_t1_global_equity_additions.sql
-- T1 additions from the 2026-07-17 FMP-Premium asset-universe audit: the 34
-- names that slot into EXISTING global subgroups (no taxonomy changes) — 32
-- equities + the two EM-core ETFs (EEM/VWO, joining the etf-carrying
-- `emerging` subgroup). All 34 live-verified on FMP /stable/batch-quote
-- (price + exchange) before inclusion; every one routes automatically:
-- equity class → fmp→eodhd→yahoo precedence, bare-ticker mappers
-- (BRK-B → BRK-B / BRK-B.US is documented-safe in both mappers).
--
-- This mirrors the same-day src/data/assets.js edit; keep both in sync.
-- Targeted INSERTs, deliberately NOT `npm run seed` (DB has intentional
-- drift beyond these rows — see migration 017's note).
--
-- Run manually in the Supabase SQL Editor. Idempotent (ON CONFLICT DO NOTHING).

BEGIN;

insert into assets (id, symbol, name, type, exchange, subgroup_id, group_id, terminal_view, active, sort_order)
values
  -- technology
  ('acn',   'ACN',   'Accenture',                'equity', 'NYSE',   'technology',     'equities', 'global', true, 0),
  ('ibm',   'IBM',   'IBM',                      'equity', 'NYSE',   'technology',     'equities', 'global', true, 0),
  ('csco',  'CSCO',  'Cisco',                    'equity', 'NASDAQ', 'technology',     'equities', 'global', true, 0),
  ('intu',  'INTU',  'Intuit',                   'equity', 'NASDAQ', 'technology',     'equities', 'global', true, 0),
  ('sap',   'SAP',   'SAP',                      'equity', 'NYSE',   'technology',     'equities', 'global', true, 0),
  ('pltr',  'PLTR',  'Palantir',                 'equity', 'NASDAQ', 'technology',     'equities', 'global', true, 0),
  -- semiconductors
  ('txn',   'TXN',   'Texas Instruments',        'equity', 'NASDAQ', 'semiconductors', 'equities', 'global', true, 0),
  ('mu',    'MU',    'Micron',                   'equity', 'NASDAQ', 'semiconductors', 'equities', 'global', true, 0),
  ('amat',  'AMAT',  'Applied Materials',        'equity', 'NASDAQ', 'semiconductors', 'equities', 'global', true, 0),
  ('lrcx',  'LRCX',  'Lam Research',             'equity', 'NASDAQ', 'semiconductors', 'equities', 'global', true, 0),
  ('adi',   'ADI',   'Analog Devices',           'equity', 'NASDAQ', 'semiconductors', 'equities', 'global', true, 0),
  -- financials
  ('brk-b', 'BRK-B', 'Berkshire Hathaway',       'equity', 'NYSE',   'financials',     'equities', 'global', true, 0),
  ('spgi',  'SPGI',  'S&P Global',               'equity', 'NYSE',   'financials',     'equities', 'global', true, 0),
  ('ice',   'ICE',   'Intercontinental Exchange','equity', 'NYSE',   'financials',     'equities', 'global', true, 0),
  ('cme',   'CME',   'CME Group',                'equity', 'NASDAQ', 'financials',     'equities', 'global', true, 0),
  -- healthcare
  ('tmo',   'TMO',   'Thermo Fisher',            'equity', 'NYSE',   'healthcare',     'equities', 'global', true, 0),
  ('dhr',   'DHR',   'Danaher',                  'equity', 'NYSE',   'healthcare',     'equities', 'global', true, 0),
  ('nvo',   'NVO',   'Novo Nordisk',             'equity', 'NYSE',   'healthcare',     'equities', 'global', true, 0),
  ('azn',   'AZN',   'AstraZeneca',              'equity', 'NYSE',   'healthcare',     'equities', 'global', true, 0),
  ('nvs',   'NVS',   'Novartis',                 'equity', 'NYSE',   'healthcare',     'equities', 'global', true, 0),
  -- biotech
  ('amgn',  'AMGN',  'Amgen',                    'equity', 'NASDAQ', 'biotech',        'equities', 'global', true, 0),
  -- consumer
  ('hd',    'HD',    'Home Depot',               'equity', 'NYSE',   'consumer',       'equities', 'global', true, 0),
  ('low',   'LOW',   'Lowe''s',                  'equity', 'NYSE',   'consumer',       'equities', 'global', true, 0),
  ('bkng',  'BKNG',  'Booking Holdings',         'equity', 'NASDAQ', 'consumer',       'equities', 'global', true, 0),
  ('tjx',   'TJX',   'TJX Companies',            'equity', 'NYSE',   'consumer',       'equities', 'global', true, 0),
  -- automobile
  ('tm',    'TM',    'Toyota',                   'equity', 'NYSE',   'automobile',     'equities', 'global', true, 0),
  ('f',     'F',     'Ford',                     'equity', 'NYSE',   'automobile',     'equities', 'global', true, 0),
  ('gm',    'GM',    'General Motors',           'equity', 'NYSE',   'automobile',     'equities', 'global', true, 0),
  -- oil-gas
  ('pbr',   'PBR',   'Petrobras ADR',            'equity', 'NYSE',   'oil-gas',        'equities', 'global', true, 0),
  ('eog',   'EOG',   'EOG Resources',            'equity', 'NYSE',   'oil-gas',        'equities', 'global', true, 0),
  -- emerging
  ('eem',   'EEM',   'Emerging Markets ETF',     'etf',    'NYSE',   'emerging',       'equities', 'global', true, 0),
  ('vwo',   'VWO',   'FTSE Emerging Mkts ETF',   'etf',    'NYSE',   'emerging',       'equities', 'global', true, 0),
  ('baba',  'BABA',  'Alibaba',                  'equity', 'NYSE',   'emerging',       'equities', 'global', true, 0),
  ('nu',    'NU',    'Nubank',                   'equity', 'NYSE',   'emerging',       'equities', 'global', true, 0)
on conflict (id) do nothing;

-- Fail loudly (aborting the transaction) if the 34 rows aren't all present and
-- active afterwards — e.g. an id collided with a pre-existing row of another
-- shape (ON CONFLICT DO NOTHING would mask it as a silent no-op).
do $$
declare n int;
begin
  select count(*) into n
  from assets
  where id in ('acn','ibm','csco','intu','sap','pltr',
               'txn','mu','amat','lrcx','adi',
               'brk-b','spgi','ice','cme',
               'tmo','dhr','nvo','azn','nvs','amgn',
               'hd','low','bkng','tjx',
               'tm','f','gm','pbr','eog',
               'eem','vwo','baba','nu')
    and active
    and terminal_view = 'global'
    and group_id = 'equities';
  if n <> 34 then
    raise exception 'migration 019: expected 34 active global T1 rows, found %', n;
  end if;
end $$;

COMMIT;

-- Verification: expect 34 rows.
-- select id, symbol, name, subgroup_id, type, exchange from assets
-- where id in ('acn','ibm','csco','intu','sap','pltr','txn','mu','amat','lrcx',
--              'adi','brk-b','spgi','ice','cme','tmo','dhr','nvo','azn','nvs',
--              'amgn','hd','low','bkng','tjx','tm','f','gm','pbr','eog',
--              'eem','vwo','baba','nu')
-- order by subgroup_id, id;
