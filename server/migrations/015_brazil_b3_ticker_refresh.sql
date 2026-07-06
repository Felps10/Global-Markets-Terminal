-- 015_brazil_b3_ticker_refresh.sql
-- Refresh the stale Brazil B3 ticker universe (terminal_view='brazil').
--
-- Context: ~23 of the 189 displayed B3 tickers went dead (404 on BOTH BRAPI and
-- Yahoo `.SA`) due to 2024–2026 corporate events. The server B3 feed
-- (server/lib/symbolResolver.js → resolveBrazilB3, classify()=='b3') is correct;
-- only the ticker LIST was stale. Every change below was verified live against
-- BRAPI (bare ticker) and Yahoo (`<TICKER>.SA`) on 2026-07-06 before writing.
--
-- What this does:
--   1. RENAMES (6) — rename in place, keeping the row `id` stable so any
--      user_watchlists.target_id soft-reference keeps pointing at the successor
--      company. Only `symbol`/`name` change; the frontend keys quotes on `symbol`.
--   2. REMOVALS (23) — delete rows that no longer quote:
--        • merged duplicates folded into a survivor (BRFS3→MBRF3, SOMA3→AZZA3)
--        • delisted / taken private (equities)
--        • dead FIIs + one dead international ETF
--        • non-quotable index benchmarks (404 or resolve to the WRONG US ticker
--          on both feeds — e.g. IBrX→ImmunityBio). ^BVSP and IFIX (which DO
--          resolve) are kept; index-tracking ETFs (DIVO11/FIND11/GOVE11/MATB11/…)
--          are tradeable securities that quote fine and are NOT touched.
--
-- Idempotent: renames key on the OLD symbol (a re-run matches nothing once
-- renamed); removals use `DELETE ... WHERE symbol IN (...)` (safe if absent).
-- No schema change → assets RLS is untouched. Keep src/data/assets.js in sync
-- (already updated in the same change). Run manually in the Supabase SQL Editor.

BEGIN;

-- ── Step 1: RENAMES / MERGERS (update in place, id stays stable) ─────────────

-- Marfrig (MRFG3) + BRF (BRFS3) merged into MBRF Global Foods (MBRF3).
-- Keep the Marfrig row as the survivor; the BRFS3 row is deleted in Step 2.
UPDATE assets SET symbol = 'MBRF3', name = 'MBRF Global Foods', updated_at = NOW()
  WHERE terminal_view = 'brazil' AND symbol = 'MRFG3';

-- Copel migrated to Novo Mercado: PN (CPLE6) → ON (CPLE3).
UPDATE assets SET symbol = 'CPLE3', name = 'Copel ON', updated_at = NOW()
  WHERE terminal_view = 'brazil' AND symbol = 'CPLE6';

-- Arezzo + Soma merger → Azzas 2154 (ARZZ3 → AZZA3). SOMA3 deleted in Step 2.
UPDATE assets SET symbol = 'AZZA3', name = 'Azzas 2154', updated_at = NOW()
  WHERE terminal_view = 'brazil' AND symbol = 'ARZZ3';

-- CCR rebranded to Motiva (CCRO3 → MOTV3).
UPDATE assets SET symbol = 'MOTV3', name = 'Motiva', updated_at = NOW()
  WHERE terminal_view = 'brazil' AND symbol = 'CCRO3';

-- Transmissão Paulista / ISA CTEEP → ISA Energia (TRPL4 → ISAE4).
UPDATE assets SET symbol = 'ISAE4', name = 'ISA Energia', updated_at = NOW()
  WHERE terminal_view = 'brazil' AND symbol = 'TRPL4';

-- 3R Petroleum + Enauta → Brava Energia (RRRP3 → BRAV3).
UPDATE assets SET symbol = 'BRAV3', name = 'Brava Energia', updated_at = NOW()
  WHERE terminal_view = 'brazil' AND symbol = 'RRRP3';

-- ── Step 2: REMOVALS ─────────────────────────────────────────────────────────
DELETE FROM assets
  WHERE terminal_view = 'brazil'
    AND symbol IN (
      -- merged duplicates (survivors handled in Step 1)
      'BRFS3', 'SOMA3',
      -- delisted / taken private
      'CIEL3', 'BRML3', 'ENBR3', 'AESB3', 'AZUL4', 'GOLL4',
      -- dead FIIs + dead international ETF
      'MALL11', 'CVBI11', 'BCFF11', 'FOFS11', 'MGFF11', 'EURP11',
      -- non-quotable index benchmarks (404 / wrong-ticker on both feeds)
      'IMA-B', 'IBrX', 'IEEX', 'IGCT', 'IFNC', 'SMLL', 'IDIV', 'IMAT', 'ICON'
    );

COMMIT;

-- ── Verification (read-only; run after COMMIT) ───────────────────────────────
-- Expect: 6 new symbols present, 0 stale symbols remaining, ^BVSP + IFIX kept.
--
--   SELECT 'new (expect 6)'  AS check, count(*) AS n
--     FROM assets
--    WHERE terminal_view = 'brazil'
--      AND symbol IN ('MBRF3','CPLE3','AZZA3','MOTV3','ISAE4','BRAV3')
--   UNION ALL
--   SELECT 'stale (expect 0)', count(*)
--     FROM assets
--    WHERE terminal_view = 'brazil'
--      AND symbol IN ('MRFG3','BRFS3','CPLE6','ARZZ3','SOMA3','CCRO3','TRPL4','RRRP3',
--                     'CIEL3','BRML3','ENBR3','AESB3','AZUL4','GOLL4',
--                     'MALL11','CVBI11','BCFF11','FOFS11','MGFF11','EURP11',
--                     'IMA-B','IBrX','IEEX','IGCT','IFNC','SMLL','IDIV','IMAT','ICON')
--   UNION ALL
--   SELECT 'kept indices (expect 2)', count(*)
--     FROM assets
--    WHERE terminal_view = 'brazil' AND symbol IN ('^BVSP','IFIX');
