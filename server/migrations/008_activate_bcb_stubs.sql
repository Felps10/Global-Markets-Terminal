-- 008_activate_bcb_stubs.sql
-- Prompt 5: Activate BCB/FOREX stub assets that now have live data feeds.
-- Run in Supabase SQL Editor.

BEGIN;

UPDATE assets
SET active = true, updated_at = NOW()
WHERE symbol IN (
  'CDI','SELIC','SELIC-META','SELIC-EFET',
  'IPCA','IGP-M','INPC','IBC-Br',
  'PIB-REAL','PIB-NOM','DESEMPREGO',
  'PROD-IND','VENDAS-VAR',
  'RES-PRIM','DIVIDA-PUB','INAD','FOCUS-IPCA',
  'RESERVAS',
  'USD-BRL','EUR-BRL','GBP-BRL',
  'PTAX','M2'
)
AND exchange IN ('BCB','FOREX');

COMMIT;
