# Global Markets Terminal — Project Overview for Claude Code
> Updated: 2026-04-05 | Source: Linear audit + codebase verification + Claude Code checkpoint audit
> Purpose: Accurate strategic + sprint context. Audit-verified. Supersedes prior version.
> **Active sprint: Cycle 4 (Apr 27 – May 4) — User-Facing Feature Surface**

---

## What GMT Is

GMT is a **decision system** for investors — not a data dashboard. The differentiator is connecting **thesis → execution → outcome**, a capability no existing tool including Bloomberg currently provides.

Two product modules:

1. **GMT Terminal** (Mini/free forever + Pro/subscription) — global and Brazil market intelligence, 269 assets across 9 groups / 36 subgroups
2. **Clube GMT** — Brazilian investment club (clube de investimento) management system, CVM Resolution 11 compliant, under `src/clube/`

---

## Tech Stack (Production — April 2026)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 6, plain JS (no TypeScript), **inline styles only** |
| Fonts | JetBrains Mono (terminal data), IBM Plex Sans (body — DM Sans being migrated out) |
| Backend | Express 4, Node.js ES modules |
| Database | **Supabase (hosted Postgres)** — NOT SQLite |
| Auth | **Supabase Auth** (`signInWithPassword`, `onAuthStateChange`) — NOT JWT in React state |
| Deployment | Vercel (frontend, auto-deploys on push to main) + Railway (Express + snapshot cron) |
| Repo | `https://github.com/Felps10/Global-Markets-Terminal` — branch `main` |

---

## Hard Rules — Non-Negotiable

1. **Inline styles only.** `style={{ ... }}` everywhere. Never `className`, never Tailwind, never styled-components.
2. **Color system is strict** (see table below). Never leak gold into global terminal. Never leak blue into Brazil/Clube.
3. **All hooks before early returns.** `useState / useEffect / useMemo` must precede any `if (!x) return null`.
4. **Audit-first on every prompt.** Step 0 is always a read-only file audit before touching any code.
5. **Gate protocol:** Gate B = propose → Felipe says "yes" → write files on new branch. Gate C = PR opened, never auto-merge, never commit to `main`.
6. **`src/clube/` is its own world.** Do not mix with global terminal components.
7. **ES modules only.** No `require()`. The backend is fully ES module.
8. **Check before building.** Run `grep -r 'ComponentName' src/` before creating anything. Dead code and duplicate implementations are a known risk.

---

## Color System (Corrected — the original plan had this wrong)

| Token | Hex | Purpose |
|---|---|---|
| `--c-accent` | `#3b82f6` | UI interactions — buttons, links, focus rings — global terminal + logged-out pages |
| `--c-accent-hover` | `#2563eb` | Hover state for interactive elements |
| `--c-accent-data` | `#00C8FF` | Market data ink — live dots, sparklines, charts. **NOT for UI chrome.** |
| `--c-accent-br` | `#F5C518` | Brazil/Clube gold. Auto-applied via `[data-context="brazil"]`. |
| `--c-error` *(needs token)* | `#FF5252` | Error/danger states. Currently hardcoded in ~38 files (~120 occurrences). |

**Critical distinction:** `--c-accent` and `--c-accent-data` are intentionally different. `#3b82f6` is for interactive UI. `#00C8FF` is for live market numbers. Do not conflate them.

---

## Role & User Hierarchy

Five personas, protected by `>=` rank comparison (not equality):

| Role | Rank | Access |
|---|---|---|
| (unauthenticated) | — | Landing page only |
| `user` | 0 | GMT Terminal Mini |
| `club_member` | 1 | Terminal + Clube read-only view |
| `club_manager` | 2 | Terminal + Clube full management |
| `admin` | 3 | Everything + admin panel + taxonomy CRUD |

- Roles stored as **TEXT** in Supabase `user_metadata.role` — **not a PG enum**
- `ROLE_RANK` map: `src/lib/roles.js` (FE) and `server/lib/roles.js` (BE)
- One club at a time, one manager per club — no multi-tenancy

---

## What Is Already Built (Do Not Rebuild — Updated After Cycle 3 Checkpoint Audit)

These features exist and are functional. The original plan incorrectly flagged several as todo.

| Feature | Files | Notes |
|---|---|---|
| Auth middleware (role hierarchy) | `server/middleware/auth.js:33-50` | `requireRole(minRole)` with `>=` rank — done |
| Login returns role | `server/routes/auth.js:100-108` | Returns `{ token, user: { id, email, name, role } }` — done |
| `data-context="brazil"` CSS override | `src/index.css:69-75` | Gold token override block, used by ClubeShell — done |
| Watchlist backend | `server/routes/watchlist.js` | 74 lines, CRUD scoped per user — done |
| Watchlist frontend | `src/context/WatchlistContext.jsx` | 82 lines, star/pin UI — done |
| Admin user management backend | `server/routes/users.js` | List, search, delete, role PATCH — done |
| CSS variable system | `src/index.css` | Done — full token set: colors, radius, fonts |
| Role-based auth middleware | Both client + server | `requireRole()` and `hasRole()` — done |
| Price alerts (full stack) | `009_price_alerts.sql`, `server/routes/alerts.js`, `src/context/AlertsContext.jsx`, `src/components/AlertToast.jsx` | Done — Cycle 3 |
| Promote to club_manager | `server/routes/users.js` — `POST /users/:id/promote-manager` | Done — Cycle 3, single-manager constraint enforced |
| Admin UserManager | `src/components/admin/UserManager.jsx` | Done — role badges, IBM Plex Sans, inline styles |
| NAV / cotização backend | `server/routes/clubes.js` — `POST/GET /clubes/:id/nav`; `quotizacaoEngine.js`; `nav_historico` table | Done — full NAV entry, calculation engine, and history. GLO-43 scope = FE modal only |
| Clube data model | `nav_historico`, `cotistas`, `clubes` tables in migrations | Done — `clubes` table has `nome`, `data_constituicao`, `benchmark_ibov`, `benchmark_cdi`. Audit before adding profile endpoints |
| Role-based redirect (FE) | `src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `LandingPage.jsx` | Done — `getRedirectForRole()` helper. Admin→`/admin`, club roles→`/clubes`, user→`/app/global` |

---

## Linear Issue Cleanup Log

### Pre-Cycle Audit (2026-04-05)

| Issue | Action | Reason |
|---|---|---|
| GLO-31 | ✅ Done | Auth middleware already implemented in production |
| GLO-35 | ✅ Done | Login response already includes role |
| GLO-6 | ✅ Done | `data-context="brazil"` block already in `index.css` |
| GLO-30 | 🚫 Canceled | Roles are TEXT in `user_metadata`, not a PG enum — nothing to migrate |
| GLO-5 | 🚫 Canceled | Based on misread of color system — `--c-accent` vs `--c-accent-data` are different tokens by design |
| GLO-49 | 🔁 Duplicate | Duplicate of GLO-32 |
| GLO-51 | 🔁 Duplicate | Duplicate of GLO-33 |

### Checkpoint Audit — After Cycle 3 (2026-04-05)

| Issue | Action | Reason |
|---|---|---|
| GLO-34 | ✅ Done | Implemented in Cycle 2 (GLO-14). `getRedirectForRole()` in `LoginPage`, `RegisterPage`, `LandingPage` |
| GLO-36 | ✅ Done | Implemented in Cycle 2 (GLO-15). `RolePromotionModal.jsx` + `notification_pending` flow in `AuthContext.jsx` |
| GLO-39 | ✅ Done | Pre-existing. `server/routes/watchlist.js` — 74 lines, GET/POST/DELETE, fully functional |
| GLO-53 | 🔁 Duplicate | Duplicate of GLO-15. Member notification covered by `RolePromotionModal`. Admin promote UI covered by GLO-50 |

---

## Projects in Linear

| Project | Focus |
|---|---|
| 🎨 Design System | CSS token migration, font replacement, error/radius standardization |
| 🔐 Auth & Onboarding | Login/register redesign, role redirects, silent promotion notification |
| 🌐 Global Terminal | Price alerts, density mode, perf optimizations |
| 🇧🇷 Brazil Terminal | Yellow accent system, B3 nav, macro banner polish |
| ⚙️ Platform | Admin panel polish, perf infrastructure, snapshots |
| 🏦 Clube | Full Clube GMT — NAV, manager dashboard, member invite, AI reports |

---

## Big Picture Goals (by horizon)

**NOW — Cycles 1–3 (Apr 6–27):** Performance + Design System + New Features
Make the terminal fast. Complete the design system token migration. Ship price alerts end-to-end (the one backend feature genuinely missing). Polish auth UX and role redirects.

**NEXT — Cycles 4–6 (Apr 27 – May 18):** Clube Core Loop
Watchlist FE polish, Brazil accent system, role-based redirects FE, Clube tab — then the Clube MVP: manager dashboard, NAV entry, member invite, club profile.

**LATER — Cycles 7–9 (May 18 – Jun 8):** Clube Intelligence
Cotista/Gestor view separation, AI reports in Portuguese, Risco panel (drawdown gauge), Fila de Operações, Próximos Prazos calendar.

**BEYOND — Cycles 10–15 (Jun–Jul):** Scale & Monetization
Terminal Pro paywall, pricing page, Mixpanel instrumentation, Brasil asset expansion, eventual `clubegmt.com` domain.

---

## ✅ Cycle 1 — Apr 6–13 | "Performance Sprint" — COMPLETE

**All 6 issues shipped and closed in Linear.**

| ID | Title | Result |
|---|---|---|
| GLO-74 | Parallelize fredAllMacro() + FMP fetches | `Promise.allSettled` — FRED macro ~1-2s (from ~9s). `fmpBatchProfile()` kept sequential (intentional 1s throttle, avoids 429s) |
| GLO-72 | React.lazy() + Suspense code splitting | 35 page components lazy-loaded. Build produces 25+ route chunks. `npm run build` verified at 6.71s |
| GLO-76 | Debounce localStorage in quotaTracker.js | In-memory buffer + 2s debounced flush. Reads never hit `localStorage.getItem` during polling |
| GLO-75 | Memoize assetsInCategory() + getB3AssetEntries() | `getB3AssetEntries()` now cached in BrazilTerminal. `assetsInCategory` was already `useCallback` — no change needed |
| GLO-73 | Virtualize AssetListView | `@tanstack/react-virtual` integrated. ~15-20 DOM nodes visible at any scroll position. Spacer `<tr>` elements maintain correct scroll position |
| GLO-22 | SELIC/CDI macro banner design tokens | Blue tint background (`rgba(21,101,192,0.08)`), `#3b82f6` values, `tabular-nums`, 8px radius |

**Carry-forward notes for future work:**
- `fmpBatchProfile()` intentionally sequential — do NOT parallelize without understanding the 429 risk
- Largest bundle chunk: `GlobalMarketsTerminal` at 135KB (expected — it's the main page)
- `@tanstack/react-virtual` is now a project dependency

---

## ✅ Cycle 2 — Apr 13–20 | "Auth UX + Design Polish" — COMPLETE

**All 10 issues shipped and closed in Linear. Build verified: 49 chunks, `npm run build` green.**

| ID | Title | Result |
|---|---|---|
| GLO-9 | Tokenize `--c-error` | `#FF5252` → `var(--c-error)` across 35 files. `--c-error-dim` added. Zero raw hex remaining (excl. token definitions). |
| GLO-7 | DM Sans → IBM Plex Sans | 15 component files + `index.css` @import + `index.html` `<link>`. Zero DM Sans remaining. |
| GLO-12 | Login page redesign | Error states tokenized. Visual polish applied. Auth logic unchanged. |
| GLO-13 | Register page + password UX | Strength meter tokenized: `var(--c-error)` weak / amber medium / green strong. Requirements hint added. |
| GLO-11 | Landing page refresh | Redundant @import removed. 5 live hero prices via `/api/v1/snapshot`. Role redirect wired. `--c-accent-data` for prices, `--c-accent` for CTAs. |
| GLO-14 | Role-based redirect (FE) | `LoginPage`, `RegisterPage`, `LandingPage`: admin→`/admin`, club roles→`/clubes`, user→`/app/global`. `ProtectedRoute` redirects authenticated users from `/login`. |
| GLO-37 | Silent promotion BE | Role PATCH in `server/routes/users.js` sets `notification_pending: true` in `user_metadata`. |
| GLO-15 | Silent promotion FE | New: `src/components/RolePromotionModal.jsx`. `AuthContext.jsx` reads flag on session load, shows modal, clears flag on dismiss. |
| GLO-10 | Radius tokens | `--radius-sm/input/card/lg` defined in both themes. No existing values replaced — incremental adoption. |
| GLO-8 | Accent hex sweep | Zero non-intentional hardcoded hex values remaining. 2 anomalies in `BrazilTerminal.jsx` (lines 128, 158) flagged → tracked as **GLO-85**. |

**Carry-forward notes for future work:**
- `src/components/RolePromotionModal.jsx` is a new component — do not duplicate it
- `notification_pending` flag lives in Supabase `user_metadata` only — never in localStorage
- GLO-85 (Brazil blue anomaly) is an open `Todo` in the 🇧🇷 Brazil Terminal project — pull into Cycle 3 or treat as a small standalone fix before Cycle 4
- Build chunk count increased from 25 → 49 (Cycle 1 added lazy loading; Cycle 2 added more pages)

---

## ✅ Cycle 3 — Apr 21–27 | "New Feature Primitives" — COMPLETE

**All 7 issues shipped and closed. Build: 49 chunks, green. GLO-26/45 (Clube profile) carried to Cycle 4.**

| ID | Title | Result |
|---|---|---|
| GLO-85 | Brazil blue anomaly | `#3b82f6` → `#F5C518` at BrazilTerminal.jsx lines 128+158. Zero blue remaining in Brazil context. |
| GLO-41 | Price alerts (full stack) | `009_price_alerts.sql` + `server/routes/alerts.js` (4 endpoints) + `AlertsContext.jsx` (checkAlerts) + `AlertToast.jsx` (auto-dismiss, bottom-right). `checkAlerts()` called after every price update in GlobalMarketsTerminal. Triggered alerts deactivate — no re-trigger. |
| GLO-32 | Promote to club_manager | `POST /users/:id/promote-manager` in users.js. Admin-only, single-manager constraint (409 if exists), sets `notification_pending: true`. |
| GLO-33 | Admin UserManager polish | Role badges with color mapping. IBM Plex Sans standardized. No behavioral changes. Inline styles only. |

**New files added in Cycle 3:**
- `server/migrations/009_price_alerts.sql` — table, indexes, RLS Pattern D
- `server/routes/alerts.js` — 4 endpoints, all auth-protected with ownership checks
- `src/context/AlertsContext.jsx` — fetch/create/delete/toggle/deactivate/checkAlerts, `useAlerts()` hook
- `src/components/AlertToast.jsx` — fixed bottom-right, auto-dismiss 5s, `var(--c-error)` accent

**Modified in Cycle 3:**
- `server/index.js` — alerts router mounted
- `server/routes/users.js` — promote-manager endpoint added
- `src/main.jsx` — AlertsProvider wrapped
- `src/App.jsx` — AlertToast rendered at root
- `src/GlobalMarketsTerminal.jsx` — `checkAlerts(merged)` after price update
- `src/components/AssetDetailDrawer.jsx` — "Set Alert" inline form
- `src/BrazilTerminal.jsx` — blue → gold at lines 128, 158

**Carry-forward to Cycle 4:**
- GLO-26/45 (Clube profile setup) — not completed due to sprint capacity. Moved to Cycle 4 alongside the Clube core loop work starting in Cycle 5.
- GLO-34, GLO-36, GLO-50 — Cycle 4 issues that may already be partially/fully done based on Cycle 2 work. **Audit before building.**

---

## ✅ Cycle 4 — Apr 27 – May 4 | "User-Facing Feature Surface" — COMPLETE

**All 6 issues shipped and closed. Build verified: 50 chunks (was 49 — +1 for `/app/alerts` route), green.**

| ID | Title | Result |
|---|---|---|
| GLO-20 | Brazil terminal — `data-context` | `data-context="brazil"` on BrazilTerminal root element. Gold token override active inside Brazil route. |
| GLO-21 | Brazil nav tab — gold active state | `.gmt-nav-brazil` CSS class for active state. Conditional gold/blue per route. Other tabs unaffected. |
| GLO-50 | Admin promote-manager FE | Dedicated "Promote to Manager" button in `UserManager.jsx` → `POST /users/:id/promote-manager`. Inline confirm. 409 = "A manager already exists." `club_manager` removed from generic dropdown — bypass gap closed. |
| GLO-38/16 | Watchlist star/pin | Gold ★ on every asset row, ☆ when unpinned. Optimistic updates via `WatchlistContext`. "★ WATCHLIST" CommandBar filter. Empty state prompt. |
| GLO-40/17 | Price alerts management view | New `/app/alerts` route + `AlertsPage` — lists all alerts with symbol, direction, threshold, status. Toggle + delete per row. Nav link. Drawer form polished: `var(--radius-input)`, `tabular-nums`, `var(--c-error)`. |
| GLO-26/45 | Clube profile setup | Create-club form in `ClubeListPage` for `club_manager` — shown when no club exists. Fields: Nome, Data de Constituição, Benchmark toggles. Gold brand. Existing `clubes.js` endpoints reused (no new backend needed). |

**Carry-forward notes for Cycle 5:**
- GLO-18 (Density mode) — moved from C4. Use `--density-scale` CSS variable on layout shell. Store in `localStorage`. Three modes: compact / comfortable / spacious.
- `.gmt-nav-brazil` CSS class — permitted exception to the inline-styles rule. Nav tab active state only.
- `/app/alerts` is a lazy-loaded route — build chunk count increased 49 → 50. Expected.

---

## 🔴 Cycle 5 — May 4–11 | "Clube Core Loop — Setup + Invite" — ACTIVE

**Theme:** The Clube MVP takes shape. Members get a tab and a view. The manager gets a dashboard data layer. The invite system opens the loop so clubs can actually grow.

**Execution order:**

| # | ID | Title | Priority | Note |
|---|---|---|---|---|
| 1 | GLO-23 | Clube tab — club-aware nav for members | High | Visible to `club_member` and above. `src/clube/` only. |
| 2 | GLO-44 | Clube profile FE — display name, inception date, benchmark | High | Depends on GLO-23 + GLO-26/45 (done in C4). Read-only display page. |
| 3 | GLO-56/54 | [BE] Manager Dashboard data API | High | Audit `clubes.js` first (~40+ endpoints). Returns: member count, total AUM, 30-day NAV delta, recent activity. |
| 4 | GLO-47/46 | [BE+FE] Member invite — signed token + invite URL | High | **Invite-link-only flow** (no email service). Manager generates token, shares URL. FE: form + status UI. |
| 5 | GLO-18 | Density mode toggle — compact / comfortable / spacious | Medium | `--density-scale` CSS variable on layout shell. Store in `localStorage`. |

**Key guidance for Cycle 5:**

**GLO-23 (Clube tab)** — This is a nav entry point, not a full page build. Show the tab only when `user.role >= club_member`. When clicked, routes to `/clubes`. Read `src/App.jsx` and the existing nav component before touching anything.

**GLO-44 (Clube profile display)** — `ClubeListPage` now has the create-club form (C4). This issue is the read-only profile display for members — showing the club name, inception date, benchmark, and basic stats. Reuse data already fetched; do not add a second API call if profile data is already in context.

**GLO-56 (Manager Dashboard BE)** — Read `clubes.js` (2060 lines) in full before writing any code. The dashboard endpoint needs: member count, total AUM (from cotistas), 30-day NAV performance (from `nav_historico`), and recent activity. These tables already exist — aggregate, don't duplicate.

**GLO-47 (Member invite BE)** — No email service. Design: manager calls `POST /clubes/:id/invite` → server generates a UUID token → stores in `invite_tokens` table (or a `pending_invites` column on `clubes`) → returns a URL `https://app.globalmarketsterminal.com/join?token=<uuid>`. Invited user visits the URL → accepted → role set to `club_member`. Check `clubes.js` and migrations for any existing invite token infrastructure before building.

**GLO-46 (Member invite FE)** — Manager-side: a simple form with a "Generate Invite Link" button, shows the link with a copy button. Invited-user-side: a `/join` page that reads the token from the query string, calls the accept endpoint, and redirects to `/clubes` on success. Token expired or invalid → error state.

**GLO-18 (Density mode)** — Inject `--density-scale: 1` on the root layout shell. Compact = 0.85, comfortable = 1 (default), spacious = 1.15. Scale `padding`, `line-height`, `font-size` relative to this variable in the layout shell styles. Components do not need to be modified individually. Store in `localStorage` under `gmt_density`. Add a toggle in the user settings or nav area.

**Success criteria:**
- Clube tab visible to `club_member` and above, invisible to `user`
- Club profile page shows name, inception, benchmark for members
- Manager Dashboard BE endpoint returns valid aggregated data
- Manager can generate an invite link; copy works
- Invited user can join via the link and land on `/clubes` as `club_member`
- Density toggle visibly changes row height / spacing in the terminal

---

## Updated Critical Path

```
[DONE] Auth middleware — requireRole() >= rank check
[DONE] Login returns role in response
[DONE] CSS variable system (27+ tokens)
[DONE] data-context="brazil" CSS override
[DONE] Watchlist backend (CRUD, scoped per user)
[DONE] Watchlist frontend (WatchlistContext, star/pin UI)
[DONE] Admin user management backend

[DONE] CYCLE 1: Performance
  GLO-74 ✅ → GLO-72 ✅ → GLO-76 ✅ → GLO-75 ✅ → GLO-73 ✅ → GLO-22 ✅

[DONE] CYCLE 2: Design + Auth UX
  GLO-9 ✅ → GLO-7 ✅ → GLO-12/13 ✅ → GLO-11 ✅
  GLO-14 ✅ | GLO-15/37 ✅ | GLO-10 ✅ | GLO-8 ✅
  → GLO-85 flagged (Brazil blue anomaly, open Todo)

[DONE] CYCLE 3: Price Alerts + Admin Polish
  GLO-85 ✅ | GLO-41 ✅ (migration→routes→FE→polling) | GLO-32 ✅ | GLO-33 ✅
  → GLO-26/45 carried to Cycle 4

[DONE] CYCLE 4: User-Facing Feature Surface
  GLO-20 ✅ → GLO-21 ✅ | GLO-50 ✅ | GLO-38 ✅ | GLO-40 ✅ | GLO-26 ✅
  Build: 50 chunks

▶ CYCLE 5 (ACTIVE): Clube Core Loop — Setup + Invite
  GLO-23 (Clube tab) → GLO-44 (club profile FE display)
  GLO-56/54 (Manager Dashboard BE) ─── parallel
  GLO-47/46 (Member invite) ─────────── after GLO-56 (invite-link flow, no email)
  GLO-18 (Density mode) ──────────────── carried from C4

CYCLE 6: NAV + Manager Dashboard FE
  GLO-55 (Dashboard FE) → GLO-42 (NAV modal FE) → GLO-24 (NAV dashboard)
  GLO-43 BE ALREADY DONE — FE modal only
  Prereqs: pdfkit + @anthropic-ai/sdk installed

CYCLE 7+: Cotista/Gestor views → AI reports → Risco → PDF → ...
```

---

## Cycles 5–9 — Blocking Prerequisites

These must be resolved before their respective cycles begin. Do not wait until the cycle starts.

| Blocker | Affects | Resolution | When |
|---|---|---|---|
| No email service (no SendGrid / Resend / nodemailer) | GLO-47 (Cycle 5 — member invite) | Use **invite-link-only** flow: generate signed token, store in Supabase, manager shares URL out-of-band. No email infra needed. | Decide before C5 |
| No AI SDK (`@anthropic-ai/sdk` absent from package.json) | GLO-28 (Cycle 7 — AI reports) | Add `@anthropic-ai/sdk` to server. Provision `ANTHROPIC_API_KEY` in Railway env. Do this as a Cycle 6 prereq task. | End of C6 |
| No PDF library (`pdfkit`, `jspdf`, `puppeteer` all absent) | GLO-48 (Cycle 7 — PDF export) | Use **pdfkit** (not puppeteer). Puppeteer = 200MB+ headless Chrome, may OOM on Railway 512MB. PDFKit = 5MB, pure JS. Add in C6. | End of C6 |
| NAV/cotização backend already built | GLO-43 (Cycle 6) | **Rewrite GLO-43 scope to FE modal only.** `nav_historico` table, `POST/GET /clubes/:id/nav`, and `quotizacaoEngine.js` exist. Do not rebuild. | Before C6 prompt |
| Market snapshot history depth | GLO-59 (Cycle 8 — Risco/VaR) | Add `GET /api/v1/snapshots/range` endpoint. Verify snapshot table has 60+ daily entries before committing to full VaR scope. | Before C8 prompt |

---

## Technical Debt Register (Post Cycle 3)

These are known issues that are not blocking any current sprint but will compound if left unaddressed.

| Item | Severity | Details |
|---|---|---|
| Radius tokens defined but unused | Low | `--radius-sm/input/card/lg` in CSS but 0 components use them. 332 hardcoded `borderRadius` values remain. Additive by design (C2 decision) but needs a migration plan before Cycle 6. |
| `#00C8FF` hardcoded in 2 heatmap files | Low | `MarketHeatmap.jsx:32` and `MarketHeatmapPage.jsx:23` use raw hex instead of `var(--c-accent-data)`. Safe to fix in any idle session. |
| ~~`/promote-manager` endpoint unused by FE~~ | ~~Medium~~ | ✅ Fixed in Cycle 4 (GLO-50) — dedicated button wired, bypass gap closed. |
| `AssetDetailDrawer.jsx` local color constants | Low | Lines 27–34 define `BG_DRAWER`, `BG_CARD`, `BORDER`, `TXT_1/2/3` as hardcoded hex instead of CSS tokens. Internally consistent. Fix when equivalent tokens exist. |
| `AuthContext.jsx` — `signOut()` on every mount | Medium | Line ~43 calls `supabase.auth.signOut()` on mount as a "one-time stale token purge." This runs on every page load. Should be removed after sufficient deployment time (stale sessions cleared). |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| ~~`Promise.all` fails fast on FRED rejection~~ | ~~Macro panel empty~~ | ✅ Resolved — `Promise.allSettled` implemented in Cycle 1 |
| ~~Virtualization breaks scroll UX~~ | ~~User regression~~ | ✅ Resolved — `@tanstack/react-virtual` with spacer `<tr>` approach |
| ~~DM Sans migration causes subtle layout shifts~~ | ~~Visual regressions~~ | ✅ Resolved — 15 files migrated in Cycle 2, zero issues |
| Price alerts polling adds main-thread overhead | Undermines Cycle 1 gains | Integrate into existing polling cycle — no separate timer |
| `feat/brazil-context-accent` diverged from main | Merge conflicts | Merge before Cycle 2 work starts |
| `clubes.js` (2060 lines) already has profile endpoints | Duplicate implementation | Audit the file before writing any new Clube backend code — checkpoint confirmed ~40+ endpoints already exist |
| `fmpBatchProfile()` parallelized accidentally | 429 errors from FMP | Keep this function sequential — the 1s throttle is intentional |
| Puppeteer chosen for PDF export | Railway OOM on 512MB container | Use `pdfkit` instead — 5MB, pure JS, no system deps |
| AI reports built without SDK | Feature unusable | Install `@anthropic-ai/sdk` + provision `ANTHROPIC_API_KEY` in Railway before Cycle 7 |

---

## Verification Checklist (Every Change)

- [ ] Files read before editing (audit-first rule)
- [ ] No TypeScript added
- [ ] No CSS classes for layout/color/spacing — inline styles only
- [ ] All React hooks appear before early returns
- [ ] Gold colors never appear in global terminal components
- [ ] Blue `var(--c-accent)` never appears inside Brazil/Clube context
- [ ] No `require()` — ES modules only
- [ ] `grep -r 'ComponentName' src/` run before creating any new component
- [ ] Manual verification step completed per issue spec before marking Done

---

*Last updated: 2026-04-05 after Cycle 4 completion. Linear in sync (17 issues closed total across all cycles). Build: 50 chunks, green. Cycle 5 active. Trust the codebase over this document when they conflict — run the grep before assuming.*
