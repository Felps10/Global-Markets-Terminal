# GMT — Cycle History & Forward Plan
**Last updated:** 2026-04-06
**Status:** Cycles 1–4 complete · ~26 issues open in Linear (11 closed in housekeeping pass) · 0 in progress

> ⚠️ **Linear is significantly behind the codebase.** Three successive audits confirmed that GLO-23, GLO-24, GLO-42, GLO-43, GLO-46, GLO-47, GLO-28, GLO-16, GLO-17, GLO-25, and GLO-27 were all live in production code but still marked open in Linear. All 11 have been closed. **Before writing any Claude Code prompt, audit the relevant source files first.** Never assume an issue is unbuilt just because Linear says it's open.

---

## What GMT is building toward

GMT is a **decision system for investors** — not just a data dashboard. The differentiator is connecting thesis → execution → outcome in a single interface. It has two product modules running in parallel:

1. **GMT Terminal** (Mini/free + Pro/subscription) — global and Brazil market intelligence across 437 assets (384 active + 53 inactive stubs), 9 groups, 44 subgroups
2. **Clube GMT** — Brazilian investment club (clube de investimento) management system, CVM Resolution 11 compliant, for two personas: Club Manager (gestor) and Club Member (cotista)

The platform tracks 5 user personas on a role ladder: `unauthenticated → user → club_member → club_manager → admin`. Role promotion is admin-controlled (user → club_manager) or manager-controlled (user → club_member).

---

## Completed work: Cycles 1–4

### Cycle 1 — Performance Foundation
All high-priority perf wins that unblock a production-ready app.

- `React.lazy()` + `Suspense` for route-level code splitting (35 page components, 25+ chunks)
- `@tanstack/react-virtual` virtualization in `AssetListView` (DOM limited to ~20 visible rows)
- `getB3AssetEntries()` memoized in `BrazilTerminal.jsx`
- `fredAllMacro()` and `brapiQuote()` parallelized with `Promise.allSettled` (FRED: ~1-2s vs ~9s sequential)
- `quotaTracker.js` localStorage writes debounced (2s buffer, no `getItem` on every tick)

### Cycle 2 — Design System Consistency
Full token sweep and Auth page redesign.

- `DM Sans` → `IBM Plex Sans` across 15 component files (0 remaining DM Sans explicit references; adoption is incremental — some older components may still carry DM Sans as an implicit fallback before being explicitly touched in a future cycle)
- `--c-error: #FF5252` and `--c-error-dim` added to both theme selectors; all 35 components tokenized
- `--radius-sm/input/card/lg` defined and adopted incrementally
- Hardcoded hex sweep: `#3b82f6` reduced to 2 remaining anomalies in `BrazilTerminal.jsx` (flagged for next pass)
- `LandingPage.jsx` redesigned with snapshot data in hero, role-based redirect, `var(--c-accent-data)` on prices
- `LoginPage.jsx` and `RegisterPage.jsx` redesigned with token-based error states and password strength meter
- Role-based post-login redirect wired in Login, Register, and Landing (`getRedirectForRole()`)
- `RolePromotionModal.jsx` — one-time modal on login when `notification_pending: true` in Supabase `user_metadata`
- Backend: role PATCH endpoint sets `notification_pending: true` on promotion via Supabase admin client

### Cycle 3 — Price Alerts Full Stack + Admin Polish
Core retention feature shipped end-to-end.

- Migration `009_price_alerts.sql` — table with uuid PK, user_id FK (CASCADE), condition CHECK, active partial index
- `server/routes/alerts.js` — GET/POST/PATCH/DELETE at `/api/v1/alerts`, auth-protected, ownership-verified
- `AlertsContext` with tick evaluation on every data refresh; bell notification with unread count
- `POST /users/:id/promote-manager` — admin-only, single-manager constraint (409 if one exists), sets `notification_pending`
- `UserManager.jsx` polished — role badges with color mapping, IBM Plex Sans fonts, all inline styles
- Brazil blue anomaly fixed: `#3b82f6` on lines 128/158 of `BrazilTerminal.jsx` replaced with `#F5C518`

### Cycle 4 — Watchlist FE + Brazil Context + Club Profile Setup
*(Completed 2026-04-05 / 2026-04-06)*

- **Watchlist FE** (`GLO-38`): Gold filled ★ on asset rows, `WatchlistContext` with optimistic pin/unpin, `★ WATCHLIST` CommandBar filter, empty state prompt. Backend (watchlist CRUD) was already pre-existing in `server/routes/watchlist.js` — verified and closed.
- **Price Alerts FE** (`GLO-40`): `/app/alerts` route with `AlertsPage` — lists all user alerts, toggle (pause/re-arm), delete per row. Drawer "Set Alert" form polished with design tokens.
- **Brazil nav tab gold state** (`GLO-21`): `.gmt-nav-brazil` CSS class with conditional gold/blue per active route.
- **Brazil context wrapper** (`GLO-20`): `data-context="brazil"` added to `BrazilTerminal` root; gold token override active inside Brazil terminal route.
- **Club profile setup** (`GLO-26`): Setup form inside `ClubeListPage` for first-time `club_manager` — fields: Nome do Clube, Data de Constituição, Benchmark toggles (IBOVESPA/CDI). Gold brand, inline validation, ClubeShell-wrapped.
- **Admin promote button** (`GLO-50`): Dedicated "Promote to Manager" button in `UserManager.jsx` wired to `POST /users/:id/promote-manager`, inline confirm dialog, 409 error handling.

**Housekeeping closed in Cycle 4:**
- `GLO-39` (Watchlist BE) — closed by audit, pre-existing and fully functional
- `GLO-36`, `GLO-34` (role redirect / notification FE sub-issues) — closed by audit, already covered in Cycle 2
- `GLO-31` (auth middleware role hierarchy) — closed by audit, `requireRole()` with `>=` rank was already in production

---

## Current state: what works end-to-end

| Capability | Status |
|---|---|
| Auth (Supabase) + JWT | ✅ Live |
| Role ladder (5 roles) | ✅ Live |
| Role-based post-login routing | ✅ Live |
| Role promotion modal (silent notify) | ✅ Live |
| Admin user management + promote-to-manager | ✅ Live |
| Global terminal (384 active assets, live data) | ✅ Live |
| Brazil terminal (gold context, B3 data) | ✅ Live |
| Market snapshot + Railway cron | ✅ Live |
| Watchlist (star/pin, optimistic, persisted) | ✅ Live |
| Price alerts (full stack, tick evaluation) | ✅ Live |
| Clube profile setup (first-time form) | ✅ Live |
| Clube tab visible in nav (GLO-23) | ✅ Live — `GMTHeader.jsx` has "Clube →" link (desktop + mobile), `App.jsx` has full `/clube/:id/*` route tree with `ProtectedRoute requiredRole="club_member"`. Close GLO-23. |
| Cotização (NAV entry) modal (GLO-42/43) | ✅ Live — `NavRecordModal` in `ClubePage.jsx`, `POST /api/v1/clubes/:id/nav` in `server/routes/clubes.js` with 409 duplicate-date guard. Close GLO-42 + GLO-43. |
| NAV dashboard for club_member (GLO-24) | ✅ Live — `ClubePage.jsx` renders `navAnalytics`, `drawdown`, `rvCompliance`, `NavChart`; PATRIMÔNIO TOTAL / ENQUADRAMENTO / EVOLUÇÃO DA COTA metrics all present. Close GLO-24. |
| Member invite flow (GLO-46/47) | ✅ Live — `GET /api/v1/users/search` (`requireRole('club_manager')`, min 3-char prefix, max 5 results) + GESTÃO DE MEMBROS panel in cotistas tab (email search, two-click remove, register link copy). Shipped in PR 4 (`fc8f465`). Close GLO-46 + GLO-47. |
| **Clube Manager Dashboard** | ⚠️ Needs audit — `ClubeShell.jsx` sidebar + several `/clube/:id/*` routes exist. Confirm what has real API data vs. placeholder shell before writing GLO-55/56 prompts. |
| **Cotista vs Gestor view separation** | ⚠️ Needs audit — route structure exists; role-conditional rendering status unknown. This is the remaining Cycle 6 work (GLO-60/66/67). |
| AI report commentary (GLO-28) | ✅ Live — `ClubeReportPage.jsx` has `generateCommentary` with full context (period analytics, drawdown, volatility, benchmark alpha). Close GLO-28. |
| AI report PDF export (GLO-48) | ❌ Not built — EXPORTAR button calls `window.print()` only. No Puppeteer/pdf-lib backend endpoint. Genuinely open. |
| AI report WhatsApp share (GLO-52) | ⚠️ Partial — `ENVIAR AOS COTISTAS` sends report to members; `window.print()` exists as print-to-PDF fallback. No `wa.me` deep link. Product decision needed: accept `window.print()` or build proper `wa.me` link. |
| ⚠️ `/clube/:id/membros`, `/governanca`, `/reenquadramento`, `/tributacao` — `requiredRole={null}` | **Confirmed bug.** `GMT_PERSONAS_AND_ROLES.md` permission matrix requires `club_member+` for these routes. Any authenticated `user` can currently access them. Fix: change `requiredRole={null}` to `requiredRole="club_member"` in `App.jsx` for these four routes. One-line fix per route. Do in Cycle 5 pre-work. |

---

## Open backlog: 37 issues

### Confirmed done — ✅ all closed in Linear (2026-04-06)
| ID | Title | Evidence |
|---|---|---|
| GLO-23 | Clube tab in nav | `GMTHeader.jsx` + `App.jsx` route tree |
| GLO-24 | NAV dashboard for club_member | `ClubePage.jsx` full analytics + `NavChart` |
| GLO-25 | NAV record modal (parent) | Sub-issues GLO-42/43 confirmed done |
| GLO-42 | [FE] NAV record modal | `NavRecordModal` in `ClubePage.jsx` |
| GLO-43 | [BE] NAV record modal | `POST /api/v1/clubes/:id/nav` with 409 guard |
| GLO-27 | Member invite flow (parent) | Sub-issues GLO-46/47 confirmed done |
| GLO-46 | [FE] Member invite flow | GESTÃO DE MEMBROS panel (PR 4 `fc8f465`) |
| GLO-47 | [BE] Member invite flow | `GET /api/v1/users/search` with role guard |
| GLO-28 | AI report commentary | `generateCommentary` in `ClubeReportPage.jsx` |
| GLO-16 | Watchlist parent | Sub-issues (GLO-38/39) Done |
| GLO-17 | Price alerts parent | Sub-issues (GLO-40/41) Done |

### Urgent — still open
| ID | Title | Labels |
|---|---|---|
| GLO-54 | Clube Manager Dashboard — Gestor Overview Screen (audit shell vs. real data first) | design |
| GLO-55 | [FE] Clube Manager Dashboard — React page, Chart.js | FE |
| GLO-56 | [BE] Clube Manager Dashboard — API endpoints (audit existing first) | BE |
| GLO-60 | Reformular visão Cotista/Gestor — separação clara de perspectivas | BE, FE, design |
| GLO-66 | [BE] Reformular visão Cotista/Gestor — endpoint /api/clube/me | BE |
| GLO-67 | [FE] Reformular visão Cotista/Gestor — roteamento por role, CotistaView | FE, design |

### High — AI Report Export + Risk Panel
| ID | Title | Labels |
|---|---|---|
| GLO-48 | [BE] AI report — PDF binary endpoint (genuinely open — `window.print()` is not sufficient) | BE |
| GLO-52 | [FE] AI report — `wa.me` WhatsApp deep link (partial — `window.print()` exists, deep link missing) | FE |
| GLO-29 | AI report parent — close after GLO-48 + GLO-52 ship | — |
| GLO-59 | Alertas → Risco — reformular seção como painel de gestão de risco | design |
| GLO-65 | [FE] Alertas → Risco — aba de risco, gauge de drawdown | FE, design |
| GLO-68 | [BE] Alertas → Risco — endpoint de resumo de risco | BE |

### Medium — Advanced Clube Features + Terminal Polish

| ID | Title | Labels |
|---|---|---|
| GLO-57 | Fila de Operações — aba de ordens pendentes para o Gestor | new feature |
| GLO-61 | [BE] Fila de Operações — tabela de ordens e endpoints | BE |
| GLO-62 | [FE] Fila de Operações — componente de aba, filtros, flash de status | FE |
| GLO-58 | Próximos Prazos — aba calendário de vencimentos e obrigações | new feature |
| GLO-63 | [BE] Próximos Prazos — tabela de eventos, eventos automáticos | BE |
| GLO-64 | [FE] Próximos Prazos — calendário mensal, lista cronológica, .ics | FE |
| GLO-18 | Density mode toggle — compact / comfortable / spacious | FE, new feature |
| GLO-19 | Asset detail drawer — polish with design system tokens | FE, design, tech-debt |

### Low (4 issues) — Platform Perf (batch when Clube stabilizes)

| ID | Title |
|---|---|
| GLO-80 | Perf: Break monolithic page components into smaller composable pieces |
| GLO-81 | Perf: Add Core Web Vitals monitoring (LCP, CLS, TTI) |
| GLO-82 | Perf: Add service worker caching for offline support |
| GLO-83 | Perf: Add vite-plugin-compression for gzip/brotli |

---

## Housekeeping required before Cycle 5

✅ **Linear closure complete (2026-04-06).** The following were confirmed live in production and closed:

| Issue | Reason | Status |
|---|---|---|
| GLO-23 | Clube nav tab live in `GMTHeader.jsx` + `App.jsx` | ✅ Closed |
| GLO-24 | NAV dashboard live in `ClubePage.jsx` | ✅ Closed |
| GLO-25 | Parent — sub-issues GLO-42/43 confirmed done | ✅ Closed |
| GLO-42 | `NavRecordModal` confirmed live in `ClubePage.jsx` | ✅ Closed |
| GLO-43 | `POST /api/v1/clubes/:id/nav` confirmed live | ✅ Closed |
| GLO-27 | Parent — sub-issues GLO-46/47 confirmed done | ✅ Closed |
| GLO-46 | GESTÃO DE MEMBROS panel confirmed live (PR 4 `fc8f465`) | ✅ Closed |
| GLO-47 | `GET /api/v1/users/search` confirmed live | ✅ Closed |
| GLO-28 | `generateCommentary` live in `ClubeReportPage.jsx` | ✅ Closed |
| GLO-16 | Watchlist parent — sub-issues GLO-38/39 Done | ✅ Closed |
| GLO-17 | Price alerts parent — sub-issues GLO-40/41 Done | ✅ Closed |

Still pending manual verification:
- **GLO-44/45** — Verify vs. parent GLO-26 (already Done); close in Linear if sub-issues are captured there.

---

## Forward plan: Cycles 5–8

### Cycle 5 — Clube Manager Dashboard (only confirmed remaining gap)
**Goal:** Gestor has a unified overview screen. Everything else in the original Cycle 5 scope is confirmed already live.

**Pre-cycle checklist:**
- ✅ GLO-23, 24, 25, 27, 28, 42, 43, 46, 47, 16, 17 — closed in Linear (2026-04-06)
- ⬜ **Fix `requiredRole={null}` bug** — run `CYCLE_5_PREREQ_PROMPT.md` in Claude Code. Changes `requiredRole={null}` → `requiredRole="club_member"` on four Clube sub-routes in `App.jsx`. PR: `fix/clube-route-permissions`.
- ⬜ **Audit `ClubeShell.jsx` + every `/clube/:id/*` route** — map shell vs. real API data. Scope GLO-55/56 to only what's actually missing.
- ⬜ **Verify mockup filename** — confirm whether `clube-manager-v2.html` or `clube-manager-dashboard.html` is the reference for GLO-55 (both are in workspace folder).
- ⬜ **GLO-44/45** — verify vs. GLO-26 parent; close in Linear if sub-issues are captured there.

**Execution order (2 steps):**
1. `GLO-56` — [BE] Clube Manager Dashboard: audit existing endpoints first, then build gaps under `/api/clube/:clubId/`
2. `GLO-55` — [FE] Clube Manager Dashboard: React page + Chart.js (verify mockup filename before starting)

**Acceptance criterion:** A `club_manager` has a unified dashboard — club health, member roster, NAV summary, portfolio positions, and pending actions in a single screen.

---

### Cycle 6 — Cotista/Gestor View Separation (unblocked after Cycle 5)
**Goal:** Each role sees only what's relevant. Member invite already ships — Cycle 6 is now purely role separation.

**Execution order (3 steps):**
1. `GLO-60` — Reformular visão Cotista/Gestor (parent spec + IA redesign)
2. `GLO-66` — [BE] `/api/clube/me` endpoint contextualized by role
3. `GLO-67` — [FE] CotistaView, GestorView routing, "Ver como Cotista" toggle

**Why this matters:** Without role-conditional rendering, both manager and member see a mix of each other's content. This is the remaining structural gap in the Clube experience.

---

### Cycle 7 — AI Report (audit first)
**Goal:** The aha moment — one-click Portuguese narrative replaces Excel + WhatsApp.

**⚠️ Pre-cycle audit required:** `ClubeReportPage.jsx` already has `generateCommentary`, period analytics, drawdown, volatility, and benchmark alpha calculations. Before writing any Cycle 7 prompts, audit `ClubeReportPage.jsx` for: PDF export wiring, WhatsApp share link, and whether GLO-48/52 are already scaffolded. Do not build what's already there.

**Execution order:**
1. `GLO-28` — ✅ Confirmed done and closed in Linear (2026-04-06). `generateCommentary` live in `ClubeReportPage.jsx`.
2. `GLO-48` — [BE] PDF binary endpoint — genuinely open. `window.print()` is not sufficient. Build Puppeteer/pdf-lib endpoint.
3. `GLO-52` — [FE] `wa.me` WhatsApp deep link — partial. `ENVIAR AOS COTISTAS` exists, `window.print()` fallback exists, `wa.me` link missing. Product decision needed before building.
4. `GLO-29` — Close parent after GLO-48 + GLO-52 ship.

---

### Cycle 8 — Advanced Gestor Panel + Terminal Polish
**Goal:** Extend the Gestor's operational visibility + close long-running terminal polish items.

Clube additions:
- `GLO-59/65/68` — Alertas → Risco: drawdown gauge, allocation bars, concentration thresholds
- `GLO-57/61/62` — Fila de Operações: orders queue with approve/cancel actions
- `GLO-58/63/64` — Próximos Prazos: calendar view of deadlines and obligations

Terminal:
- `GLO-18` — Density mode toggle (compact/comfortable/spacious, persisted per user)
- `GLO-19` — Asset detail drawer polish (design system tokens)

Platform perf (batch):
- `GLO-80/81/82/83` — Component decomposition, Web Vitals, service worker, compression

---

## Coding rules (for Claude Code)

These rules apply to all implementation prompts and must not be overridden:

- **Inline styles only** — no className except for CSS context selectors (`data-context="brazil"`) and global reset rules in `index.css`. No Tailwind, no CSS modules.
- **Color system** — always use `var(--c-*)` tokens. Never hardcode hex values. Blue for Global terminal: `var(--c-accent)`. **Two distinct golds — use the correct one per context:**
  - **Brazil Terminal gold** (`BrazilTerminal.jsx`, nav tab active state, any file outside `src/clube/`): `var(--c-accent-br)` = `#F5C518`
  - **Clube GMT brand gold** (any file inside `src/clube/`): `CLUBE_COLORS.accent` = `#F9C300` from `src/clube/styles/index.js`
  - Never use `var(--c-accent-br)` inside `src/clube/` components. Never use `CLUBE_COLORS.accent` outside `src/clube/`. Never hardcode either hex directly.
- **Hooks before early returns** — all `useState`, `useEffect`, `useContext`, etc. must appear before any `if (!x) return null` guards.
- **Audit-first** — every prompt must include a mandatory Step 0 read-only audit of all files to be touched before any edits.
- **No feature duplication** — existing modules own their domain. Always grep before adding new state, hooks, or components.
- **Irreversible operations require two-step confirmation flows** — deletion, role demotion, club dissolution.
- **Backend auth** — use Supabase Auth, not JWT-in-React-state. `authHeaders()` from `taxonomyService.js` pattern for Bearer tokens.
- **Database** — Supabase hosted Postgres. Not SQLite. Migration files go in `server/migrations/`.
- **`l1_nodes` — unresolved conflict:** The project README lists it as one of 11 Supabase tables. An earlier audit asserted it doesn't exist. **Do not generate or drop this table in any Claude Code prompt until this is resolved by reading the live Supabase schema directly.** Verify with `\dt` or check `server/migrations/` for a migration that creates or drops `l1_nodes` before touching any schema file.
- **BCB series landmine** — BCB macro series `22707` is shared between `BAL-COME` and `CONTA-CORR`. Do **not** activate either of these as live data sources. They will collide. Any prompt touching Brazil macro stubs must explicitly exclude both tickers.
- **Admin panel route** — `/admin` renders `AdminPanel` directly. `/admin/taxonomy` redirects back to `/admin`. The correct entry point is `/admin`, not `/admin/taxonomy`. Do not use `/admin/taxonomy` as a target in route guards or links.
- **No styled-components** — The project does not use styled-components. If any older README or knowledge base mentions it, that entry is outdated. All styling is inline styles + `index.css` CSS variables only.

---

## Tech stack reference

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, plain JavaScript (no TypeScript), inline styles |
| Fonts | JetBrains Mono (terminal data), IBM Plex Sans (UI body — migration from DM Sans completed Cycle 2, incremental adoption ongoing) |
| State | React Context — `AuthContext`, `TaxonomyContext`, `WatchlistContext`, `AlertsContext`, `PreferencesContext`, `TickerContext`, `SelectedAssetContext` |
| Backend | Express 4, Node.js ES modules |
| Database | Supabase (hosted Postgres, WAL mode) |
| Auth | Supabase Auth — `supabase.auth.signInWithPassword`, `onAuthStateChange` |
| Deployment | Vercel (frontend) + Railway (Express API + snapshot cron) |
| Repo | `github.com/Felps10/Global-Markets-Terminal` · branch: `main` |
