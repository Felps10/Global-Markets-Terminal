-- 018_br_cambio_data_source_brapi.sql
-- Brazil FX moved from keyless AwesomeAPI (now per-IP rate-limited, 429s on the
-- shared Railway egress IP) to BRAPI Pro v2/currency as the primary source, with
-- AwesomeAPI demoted to warm fallback. Sync the br-cambio subgroup's descriptive
-- data_source label with the new routing (code change: fix/brazil-fx-brapi-primary;
-- static mirror already updated in src/data/subgroups.js).
--
-- Display metadata only — no runtime fetch logic reads subgroups.data_source.
-- RLS: subgroups table already covered (existing policies untouched — no DDL here).
--
-- Run manually in the Supabase SQL Editor.

BEGIN;

UPDATE subgroups
SET    data_source = 'brapi'
WHERE  id = 'br-cambio'
AND    data_source = 'awesomeapi';

COMMIT;
