# Clube GMT — Transfer Archive

> Generated from the GMT extraction audit (Prompts 1–4).
> This archive contains all code, migrations, and documentation needed
> to bootstrap a standalone Clube de Investimento application.

---

## 1. What This Archive Contains

### frontend/ (41 code files)

| Directory | Files | Origin |
|---|---|---|
| `frontend/src/clube/components/` | ClubeFooter.jsx, ClubeHeader.jsx | `src/clube/components/` |
| `frontend/src/clube/components/gestor-tabs/` | GestorCarteiraTab.jsx, GestorEstatutoTab.jsx, GestorFilaOperacoesTab.jsx, GestorRiscoTab.jsx, GestorVisaoGeralTab.jsx | `src/clube/components/gestor-tabs/` |
| `frontend/src/clube/components/shared/` | CarteiraContent.jsx, EstatutoContent.jsx, OperacionalContent.jsx, RiscoContent.jsx | `src/clube/components/shared/` |
| `frontend/src/clube/pages/` | ClubeLandingPage.jsx, ComoFuncionaPage.jsx, ContatoPage.jsx, ParaGestoresPage.jsx, ParaMembrosPage.jsx | `src/clube/pages/` |
| `frontend/src/clube/styles/` | index.js, clube.css | `src/clube/styles/` |
| `frontend/src/clube/utils/` | formatters.js | `src/clube/utils/` |
| `frontend/pages/` (17 files) | ClubePage.jsx, ClubeGestorApp.jsx, ClubeCotistaApp.jsx, ClubeListPage.jsx, ClubeMembroPage.jsx, ClubeSimuladorPage.jsx, ClubeReportPage.jsx, ClubeGovernancaPage.jsx, ClubeGovernancaDetailPage.jsx, ClubeReenquadramentoPage.jsx, ClubeReenquadramentoDetailPage.jsx, ClubeCalendarioPage.jsx, ClubeNavPage.jsx, ClubeOperacionalPage.jsx, ClubeCarteiraPage.jsx, ClubeRiscoPage.jsx, ClubeEstatutoPage.jsx | `src/pages/Clube*.jsx` |
| `frontend/components/clube/` (5 files) | ClubeShell.jsx, CotistaFormModal.jsx, MovimentacaoModal.jsx, NavChart.jsx, NavRecordModal.jsx | `src/components/clube/` |
| `frontend/hooks/` | useClube.js | `src/hooks/useClube.js` |

### backend/ (4 code files)

| Directory | Files | Origin |
|---|---|---|
| `backend/routes/` | clubes.js (~2000 lines, 51 endpoints) | `server/routes/clubes.js` |
| `backend/services/` | quotizacaoEngine.js, portfolioEngine.js, simulatorEngine.js | `src/services/*.js` (see Section 5) |

### migrations/ (7 files)

| File | Classification | Tables |
|---|---|---|
| `001_clube_schema.sql` | CLUBE-ONLY | clubes, cotistas, posicoes, nav_historico |
| `004_governance.sql` | CLUBE-ONLY | assembleias, assembleias_votos |
| `005_reenquadramento.sql` | CLUBE-ONLY | reenquadramento_events |
| `006_rls_hardening.sql` | SHARED | RLS on all 19 tables (annotated [GMT]/[CLUBE]) |
| `006b_retroactive_schema_dashboard_tables.sql` | CLUBE-ONLY (9) + GMT-ONLY (1) | estatuto_versoes, movimentacoes, ledger_entries, cotas_tranches, cotistas_historico, clube_roles, documentos_gerados, audit_log, eventos_corporativos, market_snapshot |
| `010_cotistas_cpf_email.sql` | CLUBE-ONLY | cotistas (adds cpf_cnpj, email) |
| `011_backfill_initial_aportes.sql` | CLUBE-ONLY | movimentacoes (synthetic aportes) |

### shared-deps/ (4 files — reference only)

| File | Origin |
|---|---|
| `src/hooks/useAuth.js` | `src/hooks/useAuth.js` |
| `src/lib/roles.js` | `src/lib/roles.js` |
| `src/lib/routes.js` | `src/lib/routes.js` |
| `src/lib/supabase.js` | `src/lib/supabase.js` |

### Root files

| File | Description |
|---|---|
| `seed-clube-demo.js` | Demo seed script (1 clube, 3 cotistas, 6 positions, 1 NAV entry) |
| `TRANSFER.md` | This document |

**Total: 45 code files + 7 migrations + 4 reference files + 1 seed + 1 doc = 58 files**

---

## 2. Reuse Classification

| File | Status | Notes |
|---|---|---|
| `backend/services/quotizacaoEngine.js` | MODIFY | Move to `server/services/` in new app. Remove any GMT asset references. |
| `backend/services/portfolioEngine.js` | MODIFY | Move to `server/services/`. See dual-use note in Section 5. |
| `backend/services/simulatorEngine.js` | MODIFY | Move to `server/services/`. |
| `backend/routes/clubes.js` | MODIFY | Rewrite 4 asset table query sites (Section 4). Update import path for quotizacaoEngine. |
| `frontend/src/clube/components/shared/CarteiraContent.jsx` | MODIFY | Remove `hasRole()` calls, remove `ASSETS` import (use inline posicoes fields). |
| `frontend/src/clube/components/shared/OperacionalContent.jsx` | MODIFY | Remove `hasRole()` calls — single persona, no role checks. |
| `frontend/src/clube/components/shared/RiscoContent.jsx` | MODIFY | Remove `hasRole()` calls, remove role-conditional rendering. |
| `frontend/src/clube/components/shared/EstatutoContent.jsx` | MODIFY | Remove `hasRole()` if present. |
| `frontend/src/clube/components/ClubeHeader.jsx` | MODIFY | Remove `useAuth`, `ROUTES`, `hasRole` imports — rebuild with new app's own equivalents. |
| `frontend/src/clube/components/gestor-tabs/GestorVisaoGeralTab.jsx` | MODIFY | Update import paths for portfolioEngine and NavChart. |
| `frontend/pages/ClubeGestorApp.jsx` | MODIFY | Becomes `DashboardPage.jsx` — the main entry point for the single-persona app. |
| `frontend/pages/ClubePage.jsx` | REBUILD | Role gate eliminated — single persona means no routing between gestor/cotista views. |
| `frontend/pages/ClubeCotistaApp.jsx` | — | Eliminated — single persona decision (manager-only). |
| `frontend/src/clube/pages/ClubeLandingPage.jsx` | REBUILD | New brand, new design for standalone marketing site. |
| `frontend/src/clube/pages/ComoFuncionaPage.jsx` | REBUILD | New brand, new content. |
| `frontend/src/clube/pages/ContatoPage.jsx` | REBUILD | New brand, new content. |
| `frontend/src/clube/pages/ParaGestoresPage.jsx` | REBUILD | New brand, new content. |
| `frontend/src/clube/pages/ParaMembrosPage.jsx` | REBUILD | New brand, new content. |
| `frontend/src/clube/styles/index.js` | MODIFY | Carries gold color system. May change brand colors for standalone app. |
| `frontend/src/clube/utils/formatters.js` | AS-IS | Pure utility — severityColor, severityLabel, signColor, fmtDate. |
| `frontend/components/clube/NavChart.jsx` | AS-IS | Pure SVG component — no external dependencies beyond CLUBE_COLORS/FONTS. |
| `frontend/components/clube/ClubeShell.jsx` | MODIFY | Remove role-conditional rendering (club_manager vs club_member). |
| `frontend/components/clube/CotistaFormModal.jsx` | AS-IS | Modal for cotista CRUD. |
| `frontend/components/clube/MovimentacaoModal.jsx` | AS-IS | Modal for aporte/resgate. |
| `frontend/components/clube/NavRecordModal.jsx` | AS-IS | NAV recording modal. |
| `frontend/hooks/useClube.js` | MODIFY | Remove `useCotistaData` (eliminated). Simplify `useClubeCore`/`useGestorData` — no `enabled` flag needed (single persona). |
| `frontend/pages/ClubeListPage.jsx` | MODIFY | Simplify — single club, no multi-tenancy. |
| `frontend/pages/ClubeMembroPage.jsx` | MODIFY | Remove club_member ↔ club_manager distinction. |
| `frontend/pages/ClubeSimuladorPage.jsx` | AS-IS | Scenario simulator. |
| `frontend/pages/ClubeReportPage.jsx` | AS-IS | AI report generation. |
| `frontend/pages/ClubeGovernancaPage.jsx` | AS-IS | Assembly list. |
| `frontend/pages/ClubeGovernancaDetailPage.jsx` | AS-IS | Assembly detail. |
| `frontend/pages/ClubeReenquadramentoPage.jsx` | AS-IS | Compliance events. |
| `frontend/pages/ClubeReenquadramentoDetailPage.jsx` | AS-IS | Compliance event detail. |
| `frontend/pages/ClubeCalendarioPage.jsx` | AS-IS | Calendar. |
| `frontend/pages/ClubeNavPage.jsx` | AS-IS | NAV management. |
| `frontend/pages/ClubeOperacionalPage.jsx` | AS-IS | Operations dashboard. |
| `frontend/pages/ClubeCarteiraPage.jsx` | AS-IS | Portfolio view. |
| `frontend/pages/ClubeRiscoPage.jsx` | AS-IS | Risk dashboard. |
| `frontend/pages/ClubeEstatutoPage.jsx` | AS-IS | Statute management. |
| `shared-deps/*` | REFERENCE-ONLY | Do not copy. New app builds its own auth, routing, Supabase client. |
| `seed-clube-demo.js` | MODIFY | Update posicoes to use ticker/nome/tipo instead of asset_id. |

---

## 3. Validated Business Logic (Do Not Reimplement)

These algorithms were production-tested in GMT. Copy the logic, adapt the data access layer.

### NAV / Cotização (POST /:id/nav)

**Input:** `{ data, valor_cota, patrimonio_total, cotas_emitidas, retorno_diario, retorno_acumulado, retorno_ibov, retorno_cdi, percentual_rv }`

**Logic:**
1. Validates `data` (date) and `valor_cota > 0`
2. Checks uniqueness constraint `UNIQUE(clube_id, data)` — returns 409 if entry exists
3. Inserts into `nav_historico` with all provided fields (nullable fields default to null)
4. Writes audit log: action `nav.registrar`, records nav_id, data, valor_cota, registered_by

**NAV is externally calculated.** The API does not compute valor_cota — it receives it from the manager via the NavRecordModal. The frontend `quotizacaoEngine.js` assists with preview calculations before submission.

### Cotista Returns (GET /:id/cotistas/retornos)

**Per-cotista logic:**
1. Fetches latest `nav_historico.valor_cota` for the clube
2. Fetches all active cotistas
3. For each cotista, finds their **first converted aporte** (`movimentacoes WHERE tipo='aporte' AND status='convertido'`)
4. Uses that aporte's `valor_cota` as the cost basis
5. Falls back to `clubes.valor_cota_inicial` (default 1000) if no aporte found
6. Return = `((current_valor_cota / cost_basis) - 1) * 100`

**No benchmark comparisons in this endpoint.** CDI/IBOV benchmarks are stored in `nav_historico` (retorno_cdi, retorno_ibov) and served via `GET /:id/nav` for frontend chart rendering.

### Tributação Simulation (POST /:id/tributacao/simular)

**Three-stage computation per cotista:**

1. **Cost basis calculation:** Sum `cotas_restantes * valor_cota_aquisicao` across all `cotas_tranches` for the cotista. Falls back to `cotas_detidas * current_valor_cota` if no tranches exist.

2. **Gain calculation:** `currentValue - costBasis` where `currentValue = cotas_detidas * latest_valor_cota`. If gain <= 0, no tax for this cotista.

3. **IRRF calculation:**
   - For `regime_tributario = 'fia'`: flat rate from `estatuto.irrf_rate` (default 15%)
   - For other regimes: regressive rate based on holding period from earliest tranche:
     - <= 180 days: 22.5%
     - <= 360 days: 20.0%
     - <= 720 days: 17.5%
     - > 720 days: 15.0%
   - `taxBrl = gain * effectiveRate`
   - `cotasACancelar = taxBrl / valorCota` (cotas to cancel as tax payment)

**POST /:id/tributacao/executar** applies the same computation then:
- Deducts `cotasACancelar` from each cotista's `cotas_detidas`
- Inserts a negative ledger entry (tipo `irrf`)
- Generates a DARF document per cotista
- Updates clube `cash_balance` and `cotas_emitidas_total`

### Movimentação State Machine (PATCH /:id/movimentacoes/:mid/status)

**Valid transitions:**

```
aguardando_recursos → recursos_confirmados → convertido → pago (resgates only)
any non-final       → cancelado
```

**Final states (immutable):** `pago`, `cancelado`

**Side effects per transition:**

| Transition | Side Effects |
|---|---|
| → `recursos_confirmados` | Fetches latest valor_cota. Computes `cotas_delta = valor_brl / valor_cota` (positive for aporte, negative for resgate). Saves valor_cota and cotas_delta on the movimentacao row. |
| → `convertido` | (a) Updates cotista.cotas_detidas (+/- cotas_delta). (b) Updates clube.cotas_emitidas_total and cash_balance. (c) For aportes: inserts cotas_tranches row (FIFO tracking). (d) Inserts ledger_entry. (e) Upserts cotistas_historico for ALL active cotistas (equity_pct, valor_atual). |
| → `pago` | Resgates only. Computes penalidade_atraso via `computePenalidadeAtraso()` if payment is late vs prazo_pagamento_dias. |
| → `cancelado` | If previous status was `convertido`: reverses cotas on cotista, reverses clube totals, inserts cancellation ledger entry, soft-deletes tranche (sets cotas_restantes=0 for aportes). |

### Audit Log Pattern

**Function signature:**
```js
writeAuditLog({ clube_id, user_id, action, table_name, record_id, before_state, after_state })
```

**Fields written:** All parameters map 1:1 to `audit_log` table columns. `before_state` and `after_state` are JSONB (nullable).

**Call sites in clubes.js (10 total):**

| Action | Table | Trigger |
|---|---|---|
| `nav.registrar` | `nav_historico` | POST /:id/nav |
| `estatuto.create` | `estatuto_versoes` | POST /:id/estatuto |
| `movimentacao.create` | `movimentacoes` | POST /:id/movimentacoes |
| `movimentacao.cancelado` | `movimentacoes` | PATCH /:id/movimentacoes/:mid/status → cancelado |
| `movimentacao.convertido` | `movimentacoes` | PATCH /:id/movimentacoes/:mid/status → convertido |
| `movimentacao.pago` | `movimentacoes` | PATCH /:id/movimentacoes/:mid/status → pago |
| `assembleia.create` | `assembleias` | POST /:id/assembleias |
| `assembleia.update` | `assembleias` | PATCH /:id/assembleias/:aid |
| `reenquadramento.create` | `reenquadramento_events` | POST /:id/reenquadramento |
| `tributacao.executar` | `clubes` | POST /:id/tributacao/executar |

---

## 4. Schema Changes Required for New App

### posicoes — NEEDS-SURGERY

**Current (GMT):**
```sql
asset_id         TEXT NOT NULL REFERENCES assets(id),
UNIQUE (clube_id, asset_id)
```

**New app:**
```sql
ticker  TEXT NOT NULL,
nome    TEXT,
tipo    TEXT,
UNIQUE (clube_id, ticker)
```

**Data migration** (run against GMT DB before data export):
```sql
ALTER TABLE posicoes ADD COLUMN ticker TEXT;
ALTER TABLE posicoes ADD COLUMN nome TEXT;
ALTER TABLE posicoes ADD COLUMN tipo TEXT;

UPDATE posicoes SET
  ticker = a.symbol,
  nome   = a.name,
  tipo   = a.type
FROM assets a WHERE posicoes.asset_id = a.id;

ALTER TABLE posicoes ALTER COLUMN ticker SET NOT NULL;
ALTER TABLE posicoes DROP CONSTRAINT posicoes_asset_id_fkey;
ALTER TABLE posicoes DROP COLUMN asset_id;
```

**Code changes required in clubes.js — 4 query sites:**

| Line(s) | Function | Change |
|---|---|---|
| 80–83 | `computeCompliance()` | Replace `assets.group_id = 'equities'` query with `posicoes.tipo` check |
| 258–261 | `GET /:id/posicoes` | Remove assets join — return ticker/nome/tipo from posicoes row directly |
| 298–302 | `PUT /:id/posicoes` | Remove asset_id validation query — accept ticker/nome/tipo in request body |
| 863 | Dashboard compliance alert | Rewrite to use posicoes.tipo |

### All other clube tables: CARRY-AS-IS

| Table | Confirmation |
|---|---|
| clubes | No external FKs (created_by → auth.users is shared infra) |
| cotistas | No external FKs (auth_user_id links to auth, not GMT tables) |
| nav_historico | No external FKs |
| movimentacoes | FKs to clubes and cotistas only |
| ledger_entries | FK to clubes only |
| cotas_tranches | FKs to cotistas, clubes, movimentacoes |
| cotistas_historico | FKs to clubes and cotistas |
| clube_roles | FKs to clubes and cotistas |
| estatuto_versoes | FK to clubes only |
| documentos_gerados | FKs to clubes and cotistas |
| audit_log | FKs to clubes and auth.users |
| assembleias | FK to clubes only |
| assembleias_votos | FKs to assembleias and cotistas |
| reenquadramento_events | FK to clubes only |

### Drop

| Table | Reason |
|---|---|
| eventos_corporativos | Dead table — zero routes, zero components reference it |

---

## 5. Engine Files Architecture Note

`server/routes/clubes.js` line 10 imports directly from the frontend tree:

```js
import {
  addBusinessDays, computeMovimentacaoPreview, validateCVMRules,
  classifyOperacionalSeverity, computePenalidadeAtraso, computeSetupChecklist,
} from '../../src/services/quotizacaoEngine.js';
```

These 3 engine files are **backend logic placed in the frontend tree** in GMT:

| GMT Location | New App Location |
|---|---|
| `src/services/quotizacaoEngine.js` | `server/services/quotizacaoEngine.js` |
| `src/services/portfolioEngine.js` | `server/services/portfolioEngine.js` |
| `src/services/simulatorEngine.js` | `server/services/simulatorEngine.js` |

**portfolioEngine.js dual-use issue:**

In GMT, `portfolioEngine.js` is imported by both:
- `server/routes/clubes.js` (backend — compliance calculations)
- 3 frontend components: `CarteiraContent.jsx`, `RiscoContent.jsx`, `GestorVisaoGeralTab.jsx`

The new app must decide:
1. **Preferred:** Expose calculation functions via API endpoints. Frontend calls `GET /:id/compliance` or `GET /:id/portfolio-snapshot` instead of running calculations locally. Keeps all business logic server-side.
2. **Alternative:** Maintain a `shared/` directory importable by both client and server (requires careful Vite configuration).

---

## 6. Shared Dependencies Map

| File | Clube Used This For | New App Action |
|---|---|---|
| `src/hooks/useAuth.js` | Auth state in ClubeHeader and ClubeLandingPage | Create own `useAuth` wrapping new AuthContext. Reconfigure — same pattern, new Supabase project. |
| `src/lib/roles.js` | `hasRole()` in 5 components for conditional rendering | Not needed — single persona, binary auth (authenticated = manager). Remove all role checks. |
| `src/lib/routes.js` | `ROUTES.clube` path constants in marketing pages and header | Rewrite — create own ROUTES object with new app's paths. |
| `src/lib/supabase.js` | Supabase auth client (session only, no data queries) | Reconfigure — same `createClient` pattern, point to new Supabase project URL and anon key. |

---

## 7. Anti-Patterns Learned in Production

1. **Never call `supabase.from()` in frontend** — all data goes through Express. The browser Supabase client is for auth session management only.

2. **Never place backend logic in `src/services/`** — if the Express server imports it, it belongs in `server/services/`. The 3 engine files violated this and caused a cross-tree import.

3. **Hooks must be declared before any early return guard** — React hooks ordering crashes. Every `useState`, `useEffect`, `useMemo`, `useCallback` must appear before any `if (!x) return null`.

4. **RLS must be enabled on all tables** — even when using `service_role` (which bypasses RLS). The Supabase anon key is public; without RLS, anyone can read/write all tables via PostgREST.

5. **Audit log writes are server-side only** — never from the client. The `writeAuditLog()` helper runs in Express routes with `req.user` for attribution.

6. **New app has single persona (manager only)** — binary auth: authenticated = manager. No role hierarchy. No `club_member`. No `club_manager`. All `hasRole()` checks and role-conditional rendering should be removed.

7. **posicoes must not FK to an external asset registry** — store ticker/nome/tipo inline on the posicoes row. The GMT `assets` table is not available in the new Supabase project.

8. **The 4 runtime asset query sites in clubes.js must be rewritten** before the new app can go to production on a separate Supabase project.

---

## 8. What Was Intentionally Left Behind

| Item | Reason |
|---|---|
| `ClubeCotistaApp.jsx` and all member-facing views | Single persona decision — manager-only app |
| Role hierarchy (`club_member`, `club_manager`) | Binary auth — authenticated = manager |
| GMT Terminal integration (asset FK, taxonomy dependency) | Standalone app on its own Supabase project |
| Member onboarding and GESTAO DE MEMBROS flows | Manager adds cotistas directly (no separate member account flow) |
| `POST /:id/promote-manager` endpoint | Single manager, no promotion flow |
| `src/data/assets.js` STATIC_ASSETS_MAP reference in CarteiraContent | Evaluate whether new app needs a local asset lookup or can rely on inline posicoes fields |
| `useCotistaData` hook | Eliminated with cotista views |
| All routing test cases for `/clube/*` paths | New app has its own test infrastructure |

---

## 9. Risk Flags

### Flag 1 — CLUBE_COLORS Blocking Issue
- **Found:** 7 Terminal files import `CLUBE_COLORS` from `src/clube/styles/index.js`
- **Risk:** Deleting `src/clube/` before fixing this breaks the Terminal build immediately — Vite cannot resolve the import, zero pages render
- **Resolution:** Extract gold tokens to `src/lib/tokens.js` and update all 7 import sites. This must be Step 0 of the GMT cleanup execution, before any deletions.

### Flag 2 — Backend Imports from Frontend
- **Found:** `server/routes/clubes.js` line 10 imports 6 functions from `src/services/quotizacaoEngine.js`
- **Risk:** If `quotizacaoEngine.js` is deleted from `src/services/` without also removing `clubes.js`, the Express server crashes on startup with `ERR_MODULE_NOT_FOUND`
- **Resolution:** `clubes.js` and `quotizacaoEngine.js` must be archived/deleted together in the same step. The execution order must be: archive both files to `_transfer/` first, then delete both from their original locations.

### Flag 3 — Runtime Assets Table Queries
- **Found:** 4 query sites in `clubes.js` join against the GMT `assets` table at runtime
- **Risk:** In the new Supabase project, the `assets` table does not exist. These 4 endpoints will throw 500 errors or return empty data silently.
- **Resolution:** Documented in Section 4. The new app must rewrite all 4 query sites to use inline asset fields on `posicoes` instead of joining to `assets`.

### Flag 4 — posicoes Schema Surgery
- **Found:** `posicoes.asset_id TEXT NOT NULL REFERENCES assets(id)` — existing rows contain GMT asset IDs (e.g., `'petr4'`, `'vale3'`)
- **Risk:** A schema-only migration (adding columns, dropping FK) is insufficient. Existing data rows still reference GMT asset IDs. Without a data migration to copy symbol/name/type from the GMT `assets` table into the new inline fields, the new app loses position metadata.
- **Resolution:** Migration script must: (1) add ticker, nome, tipo columns, (2) UPDATE from GMT assets table, (3) drop asset_id column and FK. This must run against the GMT database before data export.

### Flag 5 — Endpoint Count Discrepancy
- **Found:** `clubes.js` has 51 router-level endpoints, not 49 as documented in `GMT_PERSONAS_AND_ROLES.md`
- **Risk:** Low — no functional impact. The extra endpoints are the `access/members`, `access/search`, and `access/:userId/role` group added after the document was last updated.
- **Resolution:** This document reflects the accurate count of 51.

---

## 10. File Map: Old Path → Suggested New App Path

| Old Path (GMT) | Suggested New App Path | Status | Notes |
|---|---|---|---|
| `src/services/quotizacaoEngine.js` | `server/services/quotizacaoEngine.js` | MODIFY | Move to backend tree |
| `src/services/portfolioEngine.js` | `server/services/portfolioEngine.js` | MODIFY | Move to backend tree; see dual-use note |
| `src/services/simulatorEngine.js` | `server/services/simulatorEngine.js` | MODIFY | Move to backend tree |
| `server/routes/clubes.js` | `server/routes/clubes.js` | MODIFY | Rewrite 4 asset query sites |
| `src/pages/ClubeGestorApp.jsx` | `src/pages/DashboardPage.jsx` | MODIFY | Becomes main entry |
| `src/pages/ClubePage.jsx` | — | ELIMINATED | Role gate not needed (single persona) |
| `src/pages/ClubeCotistaApp.jsx` | — | ELIMINATED | Single persona (manager-only) |
| `src/components/clube/NavChart.jsx` | `src/components/NavChart.jsx` | AS-IS | Lift out of clube/ subdirectory |
| `src/components/clube/ClubeShell.jsx` | `src/components/AppShell.jsx` | MODIFY | Remove role-conditional rendering |
| `src/components/clube/CotistaFormModal.jsx` | `src/components/CotistaFormModal.jsx` | AS-IS | Lift out of clube/ subdirectory |
| `src/components/clube/MovimentacaoModal.jsx` | `src/components/MovimentacaoModal.jsx` | AS-IS | Lift out of clube/ subdirectory |
| `src/components/clube/NavRecordModal.jsx` | `src/components/NavRecordModal.jsx` | AS-IS | Lift out of clube/ subdirectory |
| `src/hooks/useClube.js` | `src/hooks/useClube.js` | MODIFY | Remove useCotistaData, simplify enabled flags |
| `src/clube/styles/index.js` | `src/styles/tokens.js` | MODIFY | Rename, potentially rebrand |
| `src/clube/utils/formatters.js` | `src/utils/formatters.js` | AS-IS | Pure utility |
| `src/clube/components/gestor-tabs/*` | `src/components/tabs/*` | MODIFY | Remove role checks |
| `src/clube/components/shared/*` | `src/components/shared/*` | MODIFY | Remove hasRole, remove ASSETS import |
| `src/clube/pages/*` (marketing) | `src/pages/*` | REBUILD | New brand, new design |
| All other `src/pages/Clube*.jsx` | `src/pages/*` | AS-IS or MODIFY | Rename, remove "Clube" prefix |
