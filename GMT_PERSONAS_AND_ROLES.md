# GMT — Personas, Roles & User Journeys

> Living document. Update when product decisions change role boundaries,
> permissions, or onboarding flows.
> Last updated: 2026-04-07 — updated after GLO-86→88 session (Clube GMT
> architecture refactor + tab recovery + code quality pass)

---

## 1. Role Ladder

GMT uses a single `role` field in Supabase `user_metadata`. Roles are strictly additive — each level inherits all permissions from the level below it.

```
curious_browser  (unauthenticated)
       ↓  self-register
     user
       ↓  club_manager promotes via GESTÃO DE MEMBROS panel
  club_member
       ↓  admin only (Admin Panel → Users tab)
  club_manager
       ↓  admin only
     admin
```

### Key decisions (locked)

- **One club at a time.** GMT operates a single clube de investimento. No multi-tenancy, no scoped roles per club. Role is global on the user record.
- **One manager per club.** A single `club_manager` coordinates the clube. No co-manager concept.
- **Promotion to `club_manager` is an admin action only.** Done via Admin Panel → Users tab → role dropdown. Prevents privilege escalation from the application layer.
- **`club_manager` promotes `user` → `club_member`** via the GESTÃO DE MEMBROS panel. No admin panel needed for day-to-day membership.
- **Members must have a GMT account first.** No out-of-band invite. Manager shares `/register` link (displayed in the panel with one-click copy) with non-members before promoting them.
- **Role is global on the user record** — not scoped per club.

### Role constants — single source of truth

```
src/lib/roles.js        — frontend (ProtectedRoute, GMTHeader, ClubePage)
server/lib/roles.js     — backend  (auth middleware, users route)
```

Both files export `ROLE_RANK` and `hasRole()` with identical logic. Never redeclare inline.

Frontend additionally exports: `ROLE_LABEL`, `MANAGER_ASSIGNABLE_ROLES`, `ADMIN_ASSIGNABLE_ROLES`.
Server additionally exports: `MANAGER_ASSIGNABLE`, `ADMIN_ASSIGNABLE` (same values, no `_ROLES` suffix — see Section 6 open items).

---

## 2. Permission Matrix

| Capability | Browser | user | club_member | club_manager | admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Public** ||||||
| Landing page + live ticker | ✓ | ✓ | ✓ | ✓ | ✓ |
| Register for an account | ✓ | — | — | — | — |
| **Terminal** ||||||
| Global terminal (prices, heatmap, catalog) | — | ✓ | ✓ | ✓ | ✓ |
| Brazil terminal (B3, macro, FX) | — | ✓ | ✓ | ✓ | ✓ |
| Asset detail drawer | — | ✓ | ✓ | ✓ | ✓ |
| Watchlist + settings | — | ✓ | ✓ | ✓ | ✓ |
| **Clube GMT — Read (any club_member)** ||||||
| View Visão Geral (NAV, performance, caixa, prazos) | — | — | ✓ | ✓ | ✓ |
| View Carteira (positions table) | — | — | ✓ | ✓ | ✓ |
| View Risco (drawdown, volatility, alerts) | — | — | ✓ | ✓ | ✓ |
| Minha Posição tab (personal KPIs + entry-date chart) | — | — | ✓ | — | — |
| Performance tab (club-level benchmarks + period selector) | — | — | ✓ | — | — |
| Relatórios tab (document archive) | — | — | ✓ | — | — |
| Assembleias tab (assembly list + ata) | — | — | ✓ | — | — |
| **Clube GMT — Write (club_manager only)** ||||||
| Record NAV (cotização) | — | — | — | ✓ | ✓ |
| Process Fila de Operações (confirmar/converter/pagar/cancelar) | — | — | — | ✓ | ✓ |
| Promote user → club_member | — | — | — | ✓ | ✓ |
| Remove member (demote → user) | — | — | — | ✓ | ✓ |
| Generate AI report | — | — | — | ✓ | ✓ |
| Edit clube profile + Estatuto | — | — | — | ✓ | ✓ |
| Execute compliance workflow (reenquadramento) | — | — | — | ✓ | ✓ |
| Execute tributação (IRRF) | — | — | — | ✓ | ✓ |
| Manage assembleia lifecycle | — | — | — | ✓ | ✓ |
| LGPD data export per cotista | — | — | — | ✓ | ✓ |
| **Platform Admin (admin only)** ||||||
| Promote user → club_manager | — | — | — | — | ✓ |
| Taxonomy CRUD (groups, subgroups, assets) | — | — | — | — | ✓ |
| View + manage all users | — | — | — | — | ✓ |
| Access admin panel | — | — | — | — | ✓ |

> **Note on Minha Posição / Performance / Relatórios / Assembleias:** These four tabs
> are the cotista experience (ClubeCotistaApp). Managers and admins see the gestor
> experience instead (ClubeGestorApp) — they access equivalent data through gestor
> tabs. The "—" for club_manager/admin means the cotista-specific UI is not rendered,
> not that the data is inaccessible.

---

## 3. Personas

### 3.1 Curious Browser

- **Auth state:** Unauthenticated
- **Entry point:** Social media, SEO, word of mouth
- **Core behaviour:** Lands on the landing page, watches the live ticker, sees recognisable symbols (BTC, AAPL, PETR4). Decides in seconds whether to register.
- **Aha moment:** Recognising tickers they already follow in the live ticker
- **Retention driver:** None yet — no watchlist, no personalisation, nothing to return for
- **Key product implication:** Landing page ticker must have broad symbol coverage and feel fast. A watchlist nudge at registration would materially improve conversion.

### 3.2 User (Platform Member)

- **Auth state:** Registered + logged in (`role = user`)
- **Entry point:** Self-registration via `/register`
- **Core behaviour:** Full terminal access — Global and Brazil modes, asset detail drawer, heatmap, watchlist
- **Aha moment:** Switching between US equities and B3 + BRL FX without changing tabs
- **Retention driver:** Watchlist and price alerts (highest-ROI retention features for this tier)
- **Key product implication:** Missing a specific ticker or lacking portfolio features are the main drop-off risks.

### 3.3 Club Member (Cotista)

- **Auth state:** `role = club_member` — promoted by club_manager via GESTÃO DE MEMBROS panel
- **Entry point:** Manager finds them by email search → promotes. Clube tab appears in GMTHeader on next session.
- **Core behaviour:** Sees **ClubeCotistaApp** — a 4-tab, no-sidebar interface rendered in ClubeCotistaShell. Tab state persisted via URL (`?tab=posicao` etc.).
  - **MINHA POSIÇÃO** — personal KPIs (cotas detidas, valor atual), entry-date NAV chart, list of aportes/movimentações
  - **PERFORMANCE** — club-level NAV benchmarks with period selector (1M / 3M / 6M / 1A / Início), volatility
  - **RELATÓRIOS** — document archive (informes de rendimentos, extratos mensais, atas) with lazy-fetch on tab activation
  - **ASSEMBLEIAS** — assembly list with status badges (agendada/convocada/votação aberta/realizada/cancelada), expandable ata
- **Aha moment:** Seeing their personal position and the club's NAV performance in one place — replaces the WhatsApp spreadsheet screenshot.
- **Retention driver:** Coupled to manager activity. If manager stops recording NAV and generating reports, nothing new appears.
- **Key product implication:** Member retention = manager retention. These are the same problem.

### 3.4 Club Manager (Gestor)

- **Auth state:** `role = club_manager` — promoted by admin via Admin Panel → Users tab
- **Entry point:** Typically the existing coordinator of a clube de investimento
- **Core behaviour:** Sees **ClubeGestorApp** — a 5-tab interface rendered inside ClubeShell (sidebar + header). Tab state persisted via URL (`?tab=visao-geral` etc.). REGISTRAR NAV button always visible in the ClubeShell header.
  - **VISÃO GERAL** — health KPIs, NAV chart + benchmarks, compliance status, próximos prazos, caixa
  - **FILA DE OPERAÇÕES** — pending aportes/resgates with action buttons (CONFIRMAR → CONVERTER → MARCAR PAGO / CANCELAR)
  - **CARTEIRA** — positions table with live price refresh, compliance banner, RV% tracking
  - **RISCO** — drawdown chart, volatility metrics, severity alerts, reenquadramento summary
  - **ESTATUTO** — active statute display, new version form, version history, audit log
- **Daily ritual:**
  1. Open Visão Geral → check KPIs, compliance, prazos
  2. Process Fila de Operações if any pending
  3. Weekly: REGISTRAR NAV → cotização modal → confirm
  4. Pre-meeting: generate AI report → share
- **Aha moment:** Generating the AI report for the first time — replaces the manual Excel + WhatsApp workflow
- **Retention driver:** The NAV record → AI report loop is the core retention mechanism for both manager and members
- **Key product implication:** Growth ceiling when clube matures and needs individual contribution tracking, tax records, CVM compliance.

### 3.5 Admin

- **Auth state:** `role = admin`
- **Entry point:** Operational role for GMT's team — not a regular user persona
- **Core behaviour:** Taxonomy CRUD, promoting users to `club_manager`, full user management via Admin Panel (Taxonomy tab + Users tab with role dropdown + confirm modal)
- **Aha moment:** N/A — operational
- **Retention driver:** N/A — operational
- **Key product implication:** Admin sees the gestor experience on `/clube/:id` because `hasRole('admin', 'club_manager')` returns true (ROLE_RANK 3 > 2). There is no separate admin-specific clube view.

---

## 4. Clube GMT Architecture

### 4.1 Role Gate

`ClubePage.jsx` (78 lines) is a thin role gate. It:
- Calls `useClubeCore` (shared data for both experiences)
- Calls `useGestorData` (enabled only for club_manager+)
- Calls `useCotistaData` (enabled only for club_member but not manager — `isMember && !isManager`)
- Routes to `ClubeGestorApp` if `isManager`, `ClubeCotistaApp` otherwise

All hooks are declared before any early returns (loading/error guards), satisfying React's rules of hooks.

### 4.2 Gestor Experience — ClubeGestorApp

5-tab interface rendered inside ClubeShell (sidebar + header).
Tab state persisted via URL (`?tab=visao-geral` etc.).

| Tab | Key | Content |
|---|---|---|
| VISÃO GERAL | `visao-geral` | Health KPIs, NAV chart + benchmarks, próximos prazos, caixa |
| FILA DE OPERAÇÕES | `fila-operacoes` | Pending aportes/resgates with action buttons |
| CARTEIRA | `carteira` | Positions table, compliance banner, Atualizar live prices |
| RISCO | `risco` | Drawdown chart, volatility, alerts, reenquadramento summary |
| ESTATUTO | `estatuto` | Active statute, new version form, history, audit log |

REGISTRAR NAV button always in ClubeShell header (club_manager only).
Dashboard data from `GET /api/v1/clubes/:id/dashboard` (9-field aggregation).

### 4.3 Cotista Experience — ClubeCotistaApp

4-tab no-sidebar interface rendered in ClubeCotistaShell.
Tab state persisted via URL (`?tab=posicao` etc.).

| Tab | Key | Content |
|---|---|---|
| MINHA POSIÇÃO | `posicao` | Personal KPIs, entry-date chart, aportes list |
| PERFORMANCE | `performance` | Club-level benchmarks, period selector (1M/3M/6M/1A/Início) |
| RELATÓRIOS | `relatorios` | Document archive (informes, extratos, atas) |
| ASSEMBLEIAS | `assembleias` | Assembly list, status badges, expandable ata |

### 4.4 Shared Data Hooks (`src/hooks/useClube.js`)

- **`useClubeCore`** — clube record, navHistory, posicoes (both experiences)
- **`useGestorData`** — cotistas, compliance, operacional, estatuto, setupChecklist, annualClose, auditLog (gestor only, `enabled` flag)
- **`useCotistaData`** — minhaCotista, entryDate, minhasMovimentacoes (cotista only, `enabled` flag, sequential fetch: meu-cotista first, then movimentacoes filtered by cotista_id)
- **`useLazyFetch`** — generic lazy fetch utility for tabs that load on first activation (Relatórios, Assembleias). No auto-fetch on mount; consumer calls `fetch()` explicitly.

### 4.5 Backend Endpoints (key additions)

- **`GET /api/v1/clubes/:id/dashboard`** — 9-field aggregation for gestor command screen (`requireRole('club_manager')`)
- **`GET /api/v1/clubes/:id/meu-cotista`** — returns cotista row for the authenticated user (`requireRole('club_member')`). Returns `{cotista, entryDate, reason}` — `reason='not_linked'` when no cotista row found (200, not 404)
- **`GET /api/v1/clubes/:id/cotistas/:cid/export`** — LGPD-compliant data export per cotista (`requireRole('club_manager')`)
- **`GET /api/v1/clubes/:id/audit-log`** — audit trail for gestor actions (`requireRole('club_manager')`)

### 4.6 Shared Utilities

- **`src/clube/utils/formatters.js`** — `severityColor`, `severityLabel`, `signColor`, `fmtDate` (single source of truth, used by all clube components)
- **`src/clube/styles/index.js`** — `CLUBE_COLORS` (27 keys), `CLUBE_FONTS`, `CLUBE_RADIUS`, `CLUBE_NAV` (single source of truth for all design tokens)

---

## 5. User Journeys

### 5.1 Club Member Journey

| Phase | What happens |
|---|---|
| **Entry** | Manager finds them via email search in GESTÃO DE MEMBROS → promotes to `club_member`. |
| **First session** | Clube tab appears in GMTHeader nav. ClubeCotistaApp loads with 4 tabs. |
| **Core habit** | Opens MINHA POSIÇÃO to check cotas and valor. Switches to PERFORMANCE before meetings to see benchmarks. |
| **Engagement** | Checks RELATÓRIOS for new documents. Uses ASSEMBLEIAS to track upcoming votes. Uses Brazil terminal to track club's positions independently. |
| **Retention risk** | If manager goes quiet (no NAV, no reports), nothing new in the cotista app. Silent disengagement. |

### 5.2 Club Manager Journey

| Phase | What happens |
|---|---|
| **Entry** | Admin promotes them to `club_manager` via Users tab. ClubeGestorApp + REGISTRAR NAV appear immediately. |
| **Setup** | Uses GESTÃO DE MEMBROS to share `/register` link via WhatsApp. Promotes registered users via email search. |
| **Daily check** | Opens VISÃO GERAL → checks KPIs, compliance, prazos. Processes FILA DE OPERAÇÕES if pending items. |
| **Weekly ritual** | REGISTRAR NAV → cotização modal → confirm. GMT auto-calculates performance vs benchmark. |
| **Monthly ritual** | Generates AI report → PDF exported or link shared. Reviews RISCO tab for drawdown and alerts. |
| **Growth ceiling** | Needs individual contribution history, tax records, CVM compliance. Roadmap gate for long-term retention. |

> **Note:** The `ClubePage` role gate automatically routes to the correct experience based on `hasRole()`.
> Admins see the gestor experience (`ROLE_RANK` admin > club_manager). There is no separate admin-specific clube view.

---

## 6. Onboarding Gaps & Open Questions

| Issue | Status | Notes |
|---|---|---|
| No email invite flow | Open | Manager shares `/register` link manually via copy button in GESTÃO DE MEMBROS. Acceptable at current scale. |
| No bulk member import | Open | Manager adds members one by one via email search. Acceptable at current scale. |
| Role change is silent | Open | No push notification when promoted. Member discovers on next login when Clube tab appears. |
| Watchlist persistence | Planned | WatchlistContext exists. Server-side persistence unclear. Highest-retention feature for `user` tier. |
| Own-row highlighting in cotistas | Ready to build | `cotistas.auth_user_id` FK confirmed present (PW-2 audit). Highlighting not yet implemented. Ready when prioritized. |
| meu-cotista not_linked state | Open | Cotista records can exist without `auth_user_id` set (pre-existing records). ClubeCotistaApp shows a "solicite ao gestor" message. Resolution: manager must use GESTÃO DE MEMBROS to link the record via `PATCH /:id/cotistas/:cid/link-user`. |
| Fila de Operações smoke test | Pending | Action buttons (CONFIRMAR → CONVERTER → MARCAR PAGO) have not been live-tested against real movimentação data. |
| Role constant naming divergence | Open | `server/lib/roles.js` exports `MANAGER_ASSIGNABLE` / `ADMIN_ASSIGNABLE` while `src/lib/roles.js` exports `MANAGER_ASSIGNABLE_ROLES` / `ADMIN_ASSIGNABLE_ROLES`. Same values, different names. Should be normalized in a future pass to prevent confusion when searching the codebase for one name and not finding the other. |
| CVM compliance | Roadmap | Required for mature clubes. Ships after NAV + report loop is stable. |

---

## 7. Implementation Status

| Session | Commits | What shipped |
|---|---|---|
| PRs 1–2 | `5e76934` | `src/lib/roles.js` + `server/lib/roles.js` (role constants), `requireRole()` middleware factory, `ProtectedRoute` hierarchy check + `AccessDenied` screen, `/clube` routes gated to `club_member` with `showDenied`, Clube nav hidden for `user` role, `UserManager` role dropdown with multi-color badges + confirm modal, `patchUserRole` service |
| PR 3 | `545d8dc` | `ClubePage` `isManager`/`isMember` flags, REGISTRAR NAV gated to managers, `WelcomeBanner` for first-time members, all 19 clube write/privileged routes migrated from `requireAdmin` to `requireRole('club_manager')` |
| PR 4 | `fc8f465` | `GET /api/v1/users/search` endpoint (`requireRole('club_manager')`, max 5, min 3 char), `GET /api/v1/users` guard lowered to `requireRole('club_manager')`, GESTÃO DE MEMBROS panel (member list, email search, two-click remove, register link copy) |
| GLO-86→88 | `67ffa74` | ClubePage role gate (78 lines), `useClube.js` (4 hooks: useClubeCore, useGestorData, useCotistaData, useLazyFetch), `/meu-cotista` endpoint, `/dashboard` endpoint (9-field aggregation), ClubeGestorApp (5 tabs), ClubeCotistaApp (4 tabs), ClubeCotistaShell, 5 gestor tab components, 4 cotista tab components, `src/clube/utils/formatters.js`, CLUBE_COLORS expanded to 27 keys, 7 frontend route permissions secured |

**Backend scope as of GLO-88:** 49 endpoints in `server/routes/clubes.js` — 24 club_member read routes + 25 club_manager write routes.

---

## 8. DB Notes

Roles live in Supabase `user_metadata.role` (string field on the auth user). No DB schema migration was needed — Supabase Auth handles storage. The role hierarchy is enforced entirely in application code via `ROLE_RANK` in the role constants files.

**cotistas table** (`server/migrations/001_clube_schema.sql`):
- `cotistas.auth_user_id` column exists (confirmed in PW-2 audit). Links cotista financial records to GMT user accounts.
- Not populated for pre-existing records. Used by `GET /meu-cotista` to scope data to the authenticated user.
- `cpf_cnpj` and `email` are excluded from `/meu-cotista` response by explicit field selection (LGPD compliance — sensitive fields not sent to browser).

Club membership (platform access via `user_metadata.role`) and cotista records (financial participation in the `cotistas` table) remain intentionally separate concerns. The `auth_user_id` FK bridges them when present.

---

## 9. Future — Club-Scoped Permissions

The current model governs **platform access level** — which modules a user can enter.

When a second club is added or individual contribution tracking is required, a second layer will be needed:

```
platform_role   → where you can go       (global, in user_metadata)
club_membership → which club you're in   (join table: clube_members)
club_role       → what you can do there  (field on clube_members: 'member' | 'manager')
```

Keep this distinction in mind when designing any new clube tables so the migration is additive, not a rewrite. The `platform_role = club_manager` may eventually merge back into `club_member` once scoped authority is modelled in the membership table.

---

*Update this document when:*
- *A new role is introduced or an existing one is renamed*
- *A permission is added, removed, or moved between tiers*
- *An onboarding gap is resolved or a new one is identified*
- *A journey step changes materially based on product decisions*
- *A PR ships that affects any of the above*
