-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005 — Taxonomy v3: new subgroups, asset moves, new global +
--   Brazil stub assets, sector backfill
-- Date: 2026-03-20
-- Target: Supabase (PostgreSQL)
-- Idempotent — safe to re-run (ON CONFLICT / IF NOT EXISTS / WHERE guards)
-- Run manually in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1a. Ensure sector column exists (no-op if migration 004 already ran)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE assets ADD COLUMN IF NOT EXISTS sector TEXT;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1b. Create 2 new global subgroups
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO subgroups (id, display_name, description, slug, group_id, icon, color, section_id, data_source, sort_order)
VALUES
  ('automobile', 'Automobile', 'GICS: Consumer Discretionary / Automobiles', 'automobile', 'equities', '🚗', '#FF6D00', NULL, NULL, 1),
  ('credit',     'Credit',     'Investment-grade and high-yield corporate credit ETFs', 'credit', 'fixed-income', '📊', '#7C4DFF', NULL, NULL, 1)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  group_id     = EXCLUDED.group_id,
  icon         = EXCLUDED.icon,
  color        = EXCLUDED.color,
  updated_at   = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1c. Create 5 new Brazil subgroups
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO subgroups (id, display_name, description, slug, group_id, icon, color, section_id, data_source, sort_order)
VALUES
  ('br-juros',            'Juros',              'Taxas de juros brasileiras — SELIC, CDI, curva DI', 'br-juros',            'br-renda-fixa', '📈', '#F9C300', 'juros',        'bcb',        0),
  ('br-credito',          'Crédito',            'Spreads de crédito e instrumentos de renda fixa',   'br-credito',          'br-renda-fixa', '💳', '#F9C300', 'credito',      'bcb',        1),
  ('br-titulos',          'Títulos Públicos',   'Tesouro Direto — LFT, NTN-B, NTN-F, LTN',          'br-titulos',          'br-renda-fixa', '🏛', '#F9C300', 'titulos',      'bcb',        2),
  ('br-macro-indicators', 'Macro Brasil',       'Indicadores macroeconômicos — PIB, IPCA, emprego',  'br-macro-indicators', 'br-macro',      '📊', '#FF5252', 'macro-brasil', 'bcb',        0),
  ('br-cambio',           'Câmbio e Liquidez',  'Câmbio BRL e indicadores de liquidez',              'br-cambio',           'br-macro',      '💱', '#FF5252', 'cambio',       'awesomeapi', 1)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  group_id     = EXCLUDED.group_id,
  icon         = EXCLUDED.icon,
  color        = EXCLUDED.color,
  section_id   = EXCLUDED.section_id,
  data_source  = EXCLUDED.data_source,
  updated_at   = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1d. Move 6 existing assets to new subgroups
-- ═══════════════════════════════════════════════════════════════════════════════

-- Move TSLA, BYDDY, RIVN → automobile
UPDATE assets SET subgroup_id = 'automobile', updated_at = NOW()
WHERE symbol IN ('TSLA', 'BYDDY', 'RIVN') AND subgroup_id != 'automobile';

-- Remove alsoIn from TSLA meta (it had alsoIn: ["cleanenergy"])
UPDATE assets SET meta = meta - 'alsoIn', updated_at = NOW()
WHERE symbol = 'TSLA' AND meta ? 'alsoIn';

-- Move HYG, JNK, LQD → credit
UPDATE assets SET subgroup_id = 'credit', updated_at = NOW()
WHERE symbol IN ('HYG', 'JNK', 'LQD') AND subgroup_id != 'credit';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1e. Insert 22 new global assets
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO assets (id, symbol, name, subgroup_id, group_id, terminal_view, type, exchange, active, meta, sort_order)
VALUES
  -- REITs
  ('avb',      'AVB',      'AvalonBay Communities',                  'reits',       'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('o-realty',  'O',        'Realty Income',                          'reits',       'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('spg',      'SPG',      'Simon Property Group',                   'reits',       'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('well',     'WELL',     'Welltower',                              'reits',       'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  -- Industrials
  ('cat',      'CAT',      'Caterpillar',                            'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('de',       'DE',       'Deere & Co',                             'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('fdx',      'FDX',      'FedEx',                                  'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('ge',       'GE',       'GE Aerospace',                           'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('hon',      'HON',      'Honeywell',                              'industrials', 'equities',    'global', 'equity', 'NASDAQ', true, NULL, 0),
  ('mmm',      'MMM',      '3M',                                     'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('unp',      'UNP',      'Union Pacific',                          'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  ('ups',      'UPS',      'UPS',                                    'industrials', 'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  -- Financials
  ('iep',      'IEP',      'Icahn Enterprises',                      'financials',  'equities',    'global', 'equity', 'NASDAQ', true, NULL, 0),
  ('main-st',  'MAIN',     'Main Street Capital',                    'financials',  'equities',    'global', 'equity', 'NYSE',   true, NULL, 0),
  -- FX — Dollar Index ETF
  ('dlr',      'DLR',      'Invesco DB US Dollar Index',             'fx',          'currencies',  'global', 'etf',    'NYSE',   true, NULL, 0),
  -- FX pairs
  ('nzdusd-eqx',  'NZDUSD=X',  'NZD/USD',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "NZDUSD"}'::jsonb,  0),
  ('usdcny-eqx',  'USDCNY=X',  'USD/CNY',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "USDCNY"}'::jsonb,  0),
  ('usdinr-eqx',  'USDINR=X',  'USD/INR',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "USDINR"}'::jsonb,  0),
  ('usdmxn-eqx',  'USDMXN=X',  'USD/MXN',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "USDMXN"}'::jsonb,  0),
  ('usdnok-eqx',  'USDNOK=X',  'USD/NOK',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "USDNOK"}'::jsonb,  0),
  ('usdsek-eqx',  'USDSEK=X',  'USD/SEK',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "USDSEK"}'::jsonb,  0),
  ('usdzar-eqx',  'USDZAR=X',  'USD/ZAR',   'fx', 'currencies', 'global', 'fx', 'FOREX', true, '{"display": "USDZAR"}'::jsonb,  0)
ON CONFLICT (id) DO UPDATE SET
  symbol        = EXCLUDED.symbol,
  name          = EXCLUDED.name,
  subgroup_id   = EXCLUDED.subgroup_id,
  group_id      = EXCLUDED.group_id,
  terminal_view = EXCLUDED.terminal_view,
  type          = EXCLUDED.type,
  exchange      = EXCLUDED.exchange,
  active        = EXCLUDED.active,
  meta          = COALESCE(EXCLUDED.meta, assets.meta),
  updated_at    = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1f. Insert Brazil Renda Fixa + Macro stub assets (active = false)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Juros Brasil (12 assets) ────────────────────────────────────────────────

INSERT INTO assets (id, symbol, name, subgroup_id, group_id, terminal_view, type, currency, exchange, active, meta, sort_order)
VALUES
  ('cdi',        'CDI',        'CDI',                         'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 0),
  ('di1-1m',     'DI1-1M',     'DI Futuro 1 Mês',            'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 1),
  ('di1-3m',     'DI1-3M',     'DI Futuro 3 Meses',          'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 2),
  ('di1-6m',     'DI1-6M',     'DI Futuro 6 Meses',          'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 3),
  ('di1-1y',     'DI1-1Y',     'DI Futuro 1 Ano',            'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 4),
  ('di1-2y',     'DI1-2Y',     'DI Futuro 2 Anos',           'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 5),
  ('di1-3y',     'DI1-3Y',     'DI Futuro 3 Anos',           'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 6),
  ('di1-5y',     'DI1-5Y',     'DI Futuro 5 Anos',           'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 7),
  ('di1-10y',    'DI1-10Y',    'DI Futuro 10 Anos',          'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 8),
  ('selic',      'SELIC',      'Taxa SELIC',                  'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 9),
  ('selic-meta', 'SELIC-META', 'SELIC Meta',                  'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 10),
  ('selic-efet', 'SELIC-EFET', 'SELIC Efetiva',               'br-juros', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 11)
ON CONFLICT (id) DO UPDATE SET
  symbol        = EXCLUDED.symbol,
  name          = EXCLUDED.name,
  subgroup_id   = EXCLUDED.subgroup_id,
  group_id      = EXCLUDED.group_id,
  terminal_view = EXCLUDED.terminal_view,
  type          = EXCLUDED.type,
  currency      = EXCLUDED.currency,
  exchange      = EXCLUDED.exchange,
  active        = EXCLUDED.active,
  meta          = EXCLUDED.meta,
  updated_at    = NOW();


-- ── Crédito Brasil (11 assets) ──────────────────────────────────────────────

INSERT INTO assets (id, symbol, name, subgroup_id, group_id, terminal_view, type, currency, exchange, active, meta, sort_order)
VALUES
  ('cdi-di',      'CDI-DI',      'Spread CDI-DI',                'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 0),
  ('cred-tot',    'CRED-TOT',    'Crédito Total',                'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 1),
  ('cri',         'CRI',         'CRI',                          'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 2),
  ('deb-cdi',     'DEB-CDI',     'Debêntures CDI',               'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 3),
  ('deb-ipca',    'DEB-IPCA',    'Debêntures IPCA',              'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 4),
  ('hg-spread',   'HG-SPREAD',   'Spread High Grade',            'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 5),
  ('hy-spread',   'HY-SPREAD',   'Spread High Yield',            'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 6),
  ('ipca-spread', 'IPCA-SPREAD', 'Spread IPCA',                  'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 7),
  ('lca',         'LCA',         'LCA',                          'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 8),
  ('lci',         'LCI',         'LCI',                          'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 9),
  ('spread-bk',   'SPREAD-BK',   'Spread Bancário',              'br-credito', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 10)
ON CONFLICT (id) DO UPDATE SET
  symbol        = EXCLUDED.symbol,
  name          = EXCLUDED.name,
  subgroup_id   = EXCLUDED.subgroup_id,
  group_id      = EXCLUDED.group_id,
  terminal_view = EXCLUDED.terminal_view,
  type          = EXCLUDED.type,
  currency      = EXCLUDED.currency,
  exchange      = EXCLUDED.exchange,
  active        = EXCLUDED.active,
  meta          = EXCLUDED.meta,
  updated_at    = NOW();


-- ── Títulos Públicos Brasil (10 assets) ─────────────────────────────────────

INSERT INTO assets (id, symbol, name, subgroup_id, group_id, terminal_view, type, currency, exchange, active, meta, sort_order)
VALUES
  ('lft',       'LFT',       'LFT (Tesouro Selic)',         'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 0),
  ('ltn-1',     'LTN-1',     'LTN 1 Ano',                   'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 1),
  ('ltn-1y',    'LTN-1Y',    'LTN 1 Ano (alt)',             'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 2),
  ('ltn-3',     'LTN-3',     'LTN 3 Anos',                  'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 3),
  ('ntn-b-5',   'NTN-B-5',   'NTN-B 5 Anos',                'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 4),
  ('ntn-b-10',  'NTN-B-10',  'NTN-B 10 Anos',               'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 5),
  ('ntn-b-20',  'NTN-B-20',  'NTN-B 20 Anos',               'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 6),
  ('ntn-b-30',  'NTN-B-30',  'NTN-B 30 Anos',               'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 7),
  ('ntn-c',     'NTN-C',     'NTN-C',                       'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 8),
  ('ntn-f-10',  'NTN-F-10',  'NTN-F 10 Anos',               'br-titulos', 'br-renda-fixa', 'brazil', 'fixed-income-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 9)
ON CONFLICT (id) DO UPDATE SET
  symbol        = EXCLUDED.symbol,
  name          = EXCLUDED.name,
  subgroup_id   = EXCLUDED.subgroup_id,
  group_id      = EXCLUDED.group_id,
  terminal_view = EXCLUDED.terminal_view,
  type          = EXCLUDED.type,
  currency      = EXCLUDED.currency,
  exchange      = EXCLUDED.exchange,
  active        = EXCLUDED.active,
  meta          = EXCLUDED.meta,
  updated_at    = NOW();


-- ── Macro Brasil (15 assets) ────────────────────────────────────────────────

INSERT INTO assets (id, symbol, name, subgroup_id, group_id, terminal_view, type, currency, exchange, active, meta, sort_order)
VALUES
  ('ipca',       'IPCA',       'IPCA',                        'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 0),
  ('igp-m',      'IGP-M',      'IGP-M',                       'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 1),
  ('inpc',       'INPC',       'INPC',                        'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 2),
  ('ibc-br',     'IBC-Br',     'IBC-Br',                      'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 3),
  ('pib-real',   'PIB-REAL',   'PIB Real',                    'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 4),
  ('pib-nom',    'PIB-NOM',    'PIB Nominal',                 'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 5),
  ('desemprego', 'DESEMPREGO', 'Taxa de Desemprego',          'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 6),
  ('prod-ind',   'PROD-IND',   'Produção Industrial',         'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 7),
  ('vendas-var', 'VENDAS-VAR', 'Vendas no Varejo',            'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 8),
  ('bal-come',   'BAL-COME',   'Balança Comercial',           'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 9),
  ('conta-corr', 'CONTA-CORR', 'Conta Corrente',              'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 10),
  ('res-prim',   'RES-PRIM',   'Resultado Primário',          'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 11),
  ('divida-pub', 'DIVIDA-PUB', 'Dívida Pública',              'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 12),
  ('inad',       'INAD',       'Inadimplência',               'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 13),
  ('focus-ipca', 'FOCUS-IPCA', 'Focus IPCA',                  'br-macro-indicators', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB', false, '{"stub": true}'::jsonb, 14)
ON CONFLICT (id) DO UPDATE SET
  symbol        = EXCLUDED.symbol,
  name          = EXCLUDED.name,
  subgroup_id   = EXCLUDED.subgroup_id,
  group_id      = EXCLUDED.group_id,
  terminal_view = EXCLUDED.terminal_view,
  type          = EXCLUDED.type,
  currency      = EXCLUDED.currency,
  exchange      = EXCLUDED.exchange,
  active        = EXCLUDED.active,
  meta          = EXCLUDED.meta,
  updated_at    = NOW();


-- ── Câmbio e Liquidez Brasil (8 assets) ─────────────────────────────────────

INSERT INTO assets (id, symbol, name, subgroup_id, group_id, terminal_view, type, currency, exchange, active, meta, sort_order)
VALUES
  ('usd-brl',    'USD-BRL',    'Dólar Comercial',             'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'AWESOME', false, '{"stub": true}'::jsonb, 0),
  ('eur-brl',    'EUR-BRL',    'Euro Real',                   'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'AWESOME', false, '{"stub": true}'::jsonb, 1),
  ('gbp-brl',    'GBP-BRL',    'Libra Real',                  'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'AWESOME', false, '{"stub": true}'::jsonb, 2),
  ('usdbrl',     'USDBRL',     'USD/BRL',                     'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'AWESOME', false, '{"stub": true}'::jsonb, 3),
  ('usdbrl-eqx', 'USDBRL=X',   'USD/BRL Yahoo',               'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'AWESOME', false, '{"stub": true}'::jsonb, 4),
  ('ptax',       'PTAX',       'PTAX',                        'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB',     false, '{"stub": true}'::jsonb, 5),
  ('m2',         'M2',         'M2 — Meios de Pagamento',     'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB',     false, '{"stub": true}'::jsonb, 6),
  ('reservas',   'RESERVAS',   'Reservas Internacionais',     'br-cambio', 'br-macro', 'brazil', 'macro-br', 'BRL', 'BCB',     false, '{"stub": true}'::jsonb, 7)
ON CONFLICT (id) DO UPDATE SET
  symbol        = EXCLUDED.symbol,
  name          = EXCLUDED.name,
  subgroup_id   = EXCLUDED.subgroup_id,
  group_id      = EXCLUDED.group_id,
  terminal_view = EXCLUDED.terminal_view,
  type          = EXCLUDED.type,
  currency      = EXCLUDED.currency,
  exchange      = EXCLUDED.exchange,
  active        = EXCLUDED.active,
  meta          = EXCLUDED.meta,
  updated_at    = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1g. Backfill sector column on existing br-acoes equities
--     (no-op if old br-* subgroup IDs no longer exist — Phase 2 collapsed them)
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE assets SET sector = 'bancos'      WHERE subgroup_id IN ('br-bancos')      AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'petroleo'    WHERE subgroup_id IN ('br-petroleo')    AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'mineracao'   WHERE subgroup_id IN ('br-mineracao')   AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'varejo'      WHERE subgroup_id IN ('br-consumo')     AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'energia'     WHERE subgroup_id IN ('br-utilities')   AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'logistica'   WHERE subgroup_id IN ('br-infra')       AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'industria'   WHERE subgroup_id IN ('br-industrial')  AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'construcao'  WHERE subgroup_id IN ('br-construcao')  AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'saude'       WHERE subgroup_id IN ('br-saude')       AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'telecom'     WHERE subgroup_id IN ('br-telecom')     AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'outros'      WHERE subgroup_id IN ('br-outros')      AND (sector IS NULL OR sector = '');
UPDATE assets SET sector = 'agronegocio' WHERE subgroup_id IN ('br-commodities') AND (sector IS NULL OR sector = '');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1h. Add index on sector column (no-op if migration 004 already created it)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_assets_sector ON assets(sector);
