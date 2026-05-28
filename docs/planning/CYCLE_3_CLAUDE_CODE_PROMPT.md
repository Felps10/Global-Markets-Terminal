# Claude Code Prompt — Cycle 3: New Feature Primitives
> Paste this entire file as your first message in a new Claude Code session.
> One issue per session. Use the issue-specific prompts at the bottom for each GLO ticket.
> Recommended order: GLO-85 → GLO-41 (migration → routes → FE → polling) → GLO-32 → GLO-33 → GLO-26/45 → Perf backlog

---

## Context: What Was Done in Cycles 1 and 2

### Cycle 1 — Performance Sprint (complete)
- `src/dataServices.js` — `fredAllMacro()` parallelized with `Promise.allSettled`. **`fmpBatchProfile()` is intentionally sequential** (1s throttle, do not touch).
- `src/App.jsx` — 35 page components lazy-loaded. Build produces 49 chunks. Main index: 519KB. Largest page: `GlobalMarketsTerminal` at 135KB.
- `src/services/quotaTracker.js` — in-memory buffer, 2s debounced flush to `localStorage`.
- `src/BrazilTerminal.jsx` — `getB3AssetEntries()` cached.
- `src/components/AssetListView.jsx` — `@tanstack/react-virtual` integrated (~15-20 DOM nodes at any scroll position).

### Cycle 2 — Auth UX + Design Polish (complete)
- **CSS token system is now complete.** All design tokens exist in `src/index.css`:
  - `--c-accent: #3b82f6` (UI interactions)
  - `--c-accent-hover: #2563eb`
  - `--c-accent-data: #00C8FF` (market data ink — NOT for UI chrome)
  - `--c-accent-br: #F5C518` (Brazil/Clube gold — auto-applied in `[data-context="brazil"]`)
  - `--c-error: #FF5252` | `--c-error-dim: rgba(255,82,82,0.12)`
  - `--radius-sm: 3px` | `--radius-input: 4px` | `--radius-card: 6px` | `--radius-lg: 8px`
- **Font migration complete.** IBM Plex Sans throughout. DM Sans: 0 references.
- **Error color tokenized.** `#FF5252`: 0 references (excluding token definition).
- **Role-based redirects wired.** `LoginPage`, `RegisterPage`, `LandingPage`: admin→`/admin`, club roles→`/clubes`, user→`/app/global`.
- **`RolePromotionModal.jsx` added** — shown once on next login after role change. Flag lives in Supabase `user_metadata.notification_pending`. Do not duplicate this component.
- **Landing page** shows 5 live prices from `GET /api/v1/snapshot`.
- **2 Brazil anomalies flagged** — `BrazilTerminal.jsx` lines 128 and 158 still use `#3b82f6` (blue) inside a Brazil context. Tracked as GLO-85.

---

## What Is Already Built (Do Not Rebuild)

Before writing any code, grep for it. This codebase has had duplicate implementations before.

| Feature | Files | Status |
|---|---|---|
| Auth middleware `requireRole()` | `server/middleware/auth.js:33-50` | Done |
| Login returns role | `server/routes/auth.js:100-108` | Done |
| `data-context="brazil"` CSS override | `src/index.css:69-75` | Done |
| Watchlist backend | `server/routes/watchlist.js` | Done — 74 lines, CRUD per user |
| Watchlist frontend | `src/context/WatchlistContext.jsx` | Done — 82 lines |
| Admin user management backend | `server/routes/users.js` | Done — list, search, delete, role PATCH |
| Role promotion modal | `src/components/RolePromotionModal.jsx` | Done — Cycle 2 |
| CSS variable system | `src/index.css` | Done — 27+ tokens |
| Role redirect (FE) | `LoginPage.jsx`, `ProtectedRoute.jsx` | Done — Cycle 2 |

---

## Architecture Reminders

**Stack:** React 18 + Vite 6, Express 4, Supabase (Postgres), Vercel + Railway. Plain JavaScript.

**Auth:** Supabase Auth. Role as TEXT in `user_metadata.role`. Five roles by rank: `user=0`, `club_member=1`, `club_manager=2`, `admin=3`. Rank comparison is `>=`.

**Migrations:** Supabase migrations live in `server/migrations/`. Check the highest existing migration number before creating a new one. Follow the naming pattern of existing files. Always run migrations before writing route code.

**Clube backend is large.** `server/routes/clubes.js` is ~2060 lines. **Always audit it fully before adding any Clube-related backend code.** The endpoint you want to write may already exist.

**`src/clube/`** is its own world — gold brand, its own layout shell, CVM legal copy. Do not import from global terminal into Clube components.

---

## Standing Rules (Every Session, Every File)

1. **Inline styles only.** `style={{ ... }}`. No `className` for layout/color/spacing. No Tailwind. No CSS modules.
2. **All hooks before early returns.** `useState`, `useEffect`, `useMemo`, `useCallback` before any `if (!x) return null`.
3. **ES modules only.** No `require()`.
4. **Audit before editing.** Read the full target file before proposing any change. Map what already exists.
5. **Never commit to `main`.** Feature branch + PR for manual merge.
6. **Check before creating.** Grep before creating any component, hook, or context.
7. **Migration before routes, routes before FE.** Never write FE code for a feature whose backend doesn't exist yet.

---

## Cycle 3 Issues — Execution Order

```
START HERE (2-line fix, clears a known anomaly):
  GLO-85 — Brazil blue anomaly in BrazilTerminal.jsx

MAIN FEATURE (full-stack, sequential dependency):
  GLO-41a — Price alerts: DB migration + RLS
  GLO-41b — Price alerts: backend CRUD routes
  GLO-41c — Price alerts: frontend context + UI
  GLO-41d — Price alerts: polling integration

PARALLEL (independent, can run alongside GLO-41):
  GLO-32 — Promote to club_manager backend (audit first — may already exist)
  GLO-33 — Admin user management FE polish (backend is done)
  GLO-26/45 — Clube profile (audit clubes.js first — endpoints may already exist)

CAPACITY PERMITTING (low priority, pull in if sprint has room):
  GLO-80 — Break monolithic page components into smaller composable pieces
  GLO-81 — Core Web Vitals monitoring (LCP, CLS, TTI)
  GLO-82 — Service worker caching for offline support
  GLO-83 — vite-plugin-compression for gzip/brotli
```

---

## Issue-Specific Prompts

---

### GLO-85 — Brazil Blue Anomaly Fix

```
CYCLE 3 / GLO-85 — Fix #3b82f6 (blue) in BrazilTerminal.jsx

CONTEXT:
  During the Cycle 2 accent hex sweep, 2 occurrences of #3b82f6 (global blue) were found
  in src/BrazilTerminal.jsx at lines 128 and 158. This is wrong — BrazilTerminal is a
  Brazil context and should use gold (var(--c-accent-br) or #F5C518), not blue.

STEP 0 — AUDIT (read-only):
  1. Read src/BrazilTerminal.jsx lines 115–170
  2. Identify what UI element each value styles (line 128 and line 158)
  3. Confirm data-context="brazil" is on the component's root or a parent wrapper
  4. Report the element and context. Wait for approval before changing anything.

STEP 1 — REPLACE:
  Line 128: replace #3b82f6 with var(--c-accent-br)
  Line 158: replace #3b82f6 with var(--c-accent-br)
  If var(--c-accent-br) does not resolve correctly (the component is outside the
  data-context wrapper), use #F5C518 directly and note this in the PR.

STEP 2 — VERIFY:
  Run: grep -n '#3b82f6' src/BrazilTerminal.jsx
  Expected: 0 results.
  Visual check: the two affected elements render gold, not blue.

STANDING RULES:
  - Inline styles only — color values only, no logic changes
  - Do not change any other lines in the file

DONE CRITERIA:
  grep -n '#3b82f6' src/BrazilTerminal.jsx → 0 results
  Affected elements render gold in the Brazil terminal
```

---

### GLO-41a — Price Alerts: DB Migration + RLS

```
CYCLE 3 / GLO-41 (Part 1 of 4) — Price alerts DB migration

STEP 0 — AUDIT (read-only):
  1. List all files in server/migrations/ — note the highest migration number
  2. Read server/migrations/RLS_POLICY_GUIDE.md — understand Pattern D (user-owned)
  3. Check if any price_alerts table already exists:
     grep -r 'price_alerts\|priceAlerts\|PriceAlert' server/
  4. Report findings. Do not create any files yet.

STEP 1 — CREATE MIGRATION:
  Create server/migrations/00N_price_alerts.sql (use next number after the highest existing).

  Table definition:
  ```sql
  CREATE TABLE IF NOT EXISTS price_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol text NOT NULL,
    condition text NOT NULL CHECK (condition IN ('above', 'below')),
    threshold numeric(18, 6) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    triggered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS price_alerts_user_id_idx ON price_alerts(user_id);
  CREATE INDEX IF NOT EXISTS price_alerts_active_idx ON price_alerts(active) WHERE active = true;

  -- RLS
  ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

  -- Pattern D: user-owned rows
  CREATE POLICY "Users can manage their own alerts"
    ON price_alerts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  ```

STEP 2 — VERIFY:
  Read the migration file back in full.
  Confirm: uuid PK, user_id FK with CASCADE, condition CHECK constraint,
  active partial index, RLS enabled, Pattern D policy.

STANDING RULES:
  - Do not write any route code in this session — migration only
  - Do not run the migration — commit the file, Railway/Supabase handles execution
  - Follow the exact naming convention of existing migration files

DONE CRITERIA:
  Migration file exists at server/migrations/00N_price_alerts.sql
  File contains table, both indexes, RLS enable, and Pattern D policy
  No route or frontend code written in this session
```

---

### GLO-41b — Price Alerts: Backend CRUD Routes

```
CYCLE 3 / GLO-41 (Part 2 of 4) — Price alerts backend routes
PREREQUISITE: GLO-41a (migration) must be committed first.

STEP 0 — AUDIT (read-only):
  1. Read server/routes/watchlist.js in full — this is the pattern to follow (74 lines)
  2. Read server/index.js — find where routes are mounted, note the pattern
  3. Confirm price_alerts migration file exists in server/migrations/
  4. Check: grep -r 'alerts\|price_alerts' server/routes/ — confirm no existing file
  5. Report. Wait for approval.

STEP 1 — CREATE server/routes/alerts.js:
  Follow watchlist.js structure exactly. Implement:

  GET /api/v1/alerts
    — list authenticated user's active + inactive alerts
    — filter: ?active=true to get only active alerts
    — order by created_at DESC

  POST /api/v1/alerts
    — body: { symbol, condition, threshold }
    — validate: symbol is non-empty string, condition is 'above'|'below',
      threshold is a positive number
    — insert with user_id from auth token
    — return the created row

  DELETE /api/v1/alerts/:id
    — verify the alert belongs to the authenticated user before deleting
    — return 404 if not found or not owned by user
    — return 204 on success

  PATCH /api/v1/alerts/:id
    — body: { active: boolean } — toggle active state
    — verify ownership before updating
    — return the updated row

STEP 2 — MOUNT IN server/index.js:
  Import alerts router and mount at /api/v1/alerts.
  Use the same auth middleware pattern as watchlist.

STEP 3 — VERIFY:
  Read server/routes/alerts.js in full.
  Trace each endpoint: auth check → ownership check → DB operation → response.
  Read the mount line in server/index.js.
  Run: grep -n 'alerts' server/index.js — confirm the mount is present.

STANDING RULES:
  - ES modules only (import, not require)
  - Auth middleware must be applied to all endpoints
  - Ownership check on DELETE and PATCH before any DB write
  - Do not write any frontend code in this session

DONE CRITERIA:
  server/routes/alerts.js exists with all 4 endpoints
  All endpoints require auth
  DELETE and PATCH verify ownership
  Router mounted in server/index.js
```

---

### GLO-41c — Price Alerts: Frontend Context + UI

```
CYCLE 3 / GLO-41 (Part 3 of 4) — Price alerts frontend context and UI
PREREQUISITE: GLO-41b (backend routes) must be merged first.

STEP 0 — AUDIT (read-only):
  1. Read src/context/WatchlistContext.jsx in full — this is the pattern to follow
  2. Read src/components/AssetDetailDrawer.jsx — find where to add the "Set Alert" button
  3. Check what nav/routing structure exists: grep -r 'alerts\|Alerts' src/
  4. Read src/App.jsx — find where routes are defined
  5. Report findings and the proposed component structure. Wait for approval.

STEP 1 — CREATE src/context/AlertsContext.jsx:
  Follow WatchlistContext.jsx pattern exactly.
  State: alerts array, loading boolean, error.
  Functions: fetchAlerts, createAlert(symbol, condition, threshold),
             deleteAlert(id), toggleAlert(id).
  On mount and after mutations: call GET /api/v1/alerts.
  Expose via useAlerts() hook.
  Wrap in App.jsx alongside other context providers.

STEP 2 — ADD "SET ALERT" BUTTON IN AssetDetailDrawer.jsx:
  AUDIT the file before editing — read it fully first.
  Add a "Set Alert" button near the asset price display.
  On click: show an inline mini-form (not a full modal) with:
    — Condition toggle: "Above" | "Below" (two buttons, only one active at a time)
    — Threshold input: number, pre-filled with current asset price if available
    — "Create Alert" button
  On submit: call createAlert from AlertsContext. Show success state briefly.
  Colors:
    — Active condition button: var(--c-accent) background
    — Inactive: var(--c-bg-secondary) or similar muted background
    — "Create Alert" button: var(--c-accent)
    — Triggered state will use var(--c-error) — handled in polling step
  Inline styles only. No className.
  All hooks before early returns.

STEP 3 — ADD /app/alerts ROUTE (optional, if capacity):
  Simple list view of all user alerts.
  Each alert shows: symbol, condition (above/below), threshold, status (active/triggered).
  Delete button per row (var(--c-error) on hover).
  Triggered alerts: dimmed with var(--c-error-dim) background.
  Link from nav if a nav update is sensible — audit the nav component first.

STEP 4 — VERIFY:
  Read AlertsContext.jsx back in full.
  Confirm all hooks before early returns in every modified component.
  Confirm no className attributes in any new or modified components.
  Confirm AlertsContext is wrapped in App.jsx.

STANDING RULES:
  - Inline styles only
  - All hooks before early returns
  - Do not duplicate WatchlistContext — follow its pattern, don't copy-paste wholesale
  - No gold colors — alerts are a global terminal feature, not Brazil/Clube

DONE CRITERIA:
  AlertsContext.jsx exists and is wired into App.jsx
  "Set Alert" UI is accessible from AssetDetailDrawer
  Alert creation works end-to-end (creates row in Supabase via backend)
  No className attributes in new code
```

---

### GLO-41d — Price Alerts: Polling Integration

```
CYCLE 3 / GLO-41 (Part 4 of 4) — Price alerts polling integration
PREREQUISITE: GLO-41c (frontend context + UI) must be merged first.

STEP 0 — AUDIT (read-only):
  1. Read src/dataServices.js — find the main polling function and its interval/timer
  2. Read src/context/AlertsContext.jsx — confirm createAlert, toggleAlert exist
  3. Understand the data shape of a price update (what field holds the current price)
  4. Grep for existing toast/notification UI: grep -r 'toast\|Toast\|notification\|snackbar' src/
  5. Report: where polling happens, what the price field is called, what toast exists.
     Wait for approval.

STEP 1 — INTEGRATE INTO EXISTING POLLING:
  In the existing polling callback (wherever prices are updated after a fetch cycle):
  After prices are updated in state:
    1. Get active alerts from AlertsContext (via a ref or context read — avoid re-render loops)
    2. For each active alert:
       - If condition === 'above' and currentPrice > threshold: trigger
       - If condition === 'below' and currentPrice < threshold: trigger
    3. On trigger:
       - Call PATCH /api/v1/alerts/:id with { active: false, triggered_at: now }
       - Show a toast/notification: "[SYMBOL] crossed [threshold]" using var(--c-error) accent
       - Update AlertsContext state to reflect the deactivated alert
  Do NOT create a separate setInterval — piggyback on the existing polling cycle.

STEP 2 — TOAST NOTIFICATION:
  If a toast component already exists: use it.
  If not: create a minimal src/components/AlertToast.jsx.
    — Fixed position, bottom-right
    — Dark background with var(--c-error) left border or icon
    — Auto-dismisses after 5 seconds
    — Inline styles only, no className
    — Shows symbol + direction + price

STEP 3 — VERIFY:
  Read all modified files back.
  Trace the full trigger path: polling fires → price compared → threshold crossed →
    PATCH alert → toast shown → alert deactivated in state.
  Confirm no new setInterval or setTimeout created for polling.
  Confirm triggered alerts cannot re-trigger (active: false stops them).
  Confirm all hooks are before early returns in any modified components.

STANDING RULES:
  - No separate polling timer — integrate into existing cycle
  - Alerts must deactivate after triggering — no repeat notifications
  - Inline styles only
  - var(--c-error) for triggered state, var(--c-accent) for active state

DONE CRITERIA:
  Active alerts are evaluated on every price update
  Triggered alert: PATCH fires, toast appears, alert deactivates
  No new timers introduced
  No re-trigger possible for the same alert
```

---

### GLO-32 — Promote to club_manager Backend

```
CYCLE 3 / GLO-32 — Promote user to club_manager (admin-only endpoint)

STEP 0 — AUDIT FIRST (read-only — this may already be implemented):
  1. Read server/routes/users.js in full
  2. Look for: any PATCH or POST endpoint that changes role to club_manager
  3. Look for: any single-manager constraint logic
  4. Run: grep -n 'club_manager\|promote\|manager' server/routes/users.js
  5. Report exactly what exists. If a promote endpoint already exists and enforces
     the single-manager constraint, close this issue as Done and stop.
     Wait for approval before writing any code.

IF THE ENDPOINT DOES NOT EXIST — STEP 1:
  Add a POST /api/v1/admin/users/:id/promote-manager endpoint to server/routes/users.js.
  Requirements:
    — Requires admin role (use requireRole('admin') middleware)
    — Before promoting: query for any existing user with role = 'club_manager'
    — If one exists: return 409 with { error: 'A club_manager already exists' }
    — If none: update target user's role to 'club_manager' in user_metadata
    — Also set notification_pending: true in user_metadata (Cycle 2 pattern)
    — Return the updated user record

STEP 2 — VERIFY:
  Read the relevant section of server/routes/users.js back.
  Trace: admin check → existing manager check → update → notification flag → response.

STANDING RULES:
  - ES modules only
  - Single-manager constraint is non-negotiable — check before promoting
  - notification_pending must be set (ties into RolePromotionModal from Cycle 2)

DONE CRITERIA:
  Promote endpoint exists and requires admin role
  409 returned if a club_manager already exists
  notification_pending: true set on promotion
  OR — issue closed as Done because endpoint already existed
```

---

### GLO-33 — Admin User Management FE Polish

```
CYCLE 3 / GLO-33 — Admin user management view: frontend polish
CONTEXT: The backend is complete at server/routes/users.js. The FE exists at
src/components/admin/UserManager.jsx (or similar). This is polish only — no new features.

STEP 0 — AUDIT (read-only):
  1. Read src/components/admin/UserManager.jsx in full (or grep to find the correct filename)
  2. List every hardcoded color, font, or spacing value
  3. Check if ROLE_LABEL or equivalent constant exists: grep -r 'ROLE_LABEL\|roleLabel' src/
  4. Identify the current search UX and role display
  5. Report. Wait for approval before editing.

STEP 1 — TOKENIZE COLORS:
  Replace hardcoded error/danger colors with var(--c-error)
  Replace hardcoded accent values with var(--c-accent)
  Replace font references with IBM Plex Sans if any DM Sans remains (grep to confirm)

STEP 2 — ROLE BADGES:
  For each user row, show the role as a small badge (colored pill).
  Color mapping:
    admin → var(--c-accent) background
    club_manager → #C5A059 (gold, intentional — this is a Clube role indicator)
    club_member → rgba(197,160,89,0.3) (muted gold)
    user → var(--c-bg-secondary) or muted neutral
  Badge: borderRadius var(--radius-sm), padding 2px 8px, fontSize 11px, JetBrains Mono.
  Inline styles only.

STEP 3 — SEARCH UX:
  If search input exists: add a clear (×) button when input has text.
  Placeholder text: "Search by email or name"
  Input focus ring: var(--c-accent) border, no outline:none override without replacement.

STEP 4 — CONFIRMATION DIALOGS:
  Any destructive action (role change, delete) must have a two-step confirmation.
  If a confirmation pattern already exists in the admin UI: use it, don't create a new one.
  Confirmation button: var(--c-error) background.
  Cancel button: muted/secondary style.

STEP 5 — VERIFY:
  Read the file back in full.
  Confirm: no className on layout/color elements, no DM Sans, all hooks before returns.
  Run: grep -n '#FF5252\|DM Sans\|#3b82f6' src/components/admin/UserManager.jsx → 0 results.

DONE CRITERIA:
  Role badges visible and color-coded per role
  Error/destructive actions use var(--c-error)
  Search input has clear button
  Confirmation dialog for destructive actions
  No raw hex values remaining in the file
```

---

### GLO-26/45 — Clube Profile Page

```
CYCLE 3 / GLO-26/45 — Club profile setup (FE + backend audit)
CONTEXT: GLO-45 is the backend, GLO-26 is the parent feature. Audit clubes.js first —
it's 2060 lines and may already have profile endpoints.

STEP 0 — AUDIT (read-only — do this before anything else):
  1. Read server/routes/clubes.js in full (it is long — read all of it)
  2. List every endpoint defined: method + path + purpose
  3. Identify any existing profile/setup endpoints (GET/POST for clube name, inception, benchmark)
  4. Check if a clube_profiles table or equivalent exists in server/migrations/
  5. Read src/clube/ directory listing: what pages and components already exist?
  6. Report full findings. If profile endpoints already exist, adjust scope accordingly.
     Wait for approval before writing any code.

IF BACKEND NEEDS TO BE CREATED — STEP 1:
  Create server/migrations/00N_clube_profiles.sql (next migration number):
  ```sql
  CREATE TABLE IF NOT EXISTS clube_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    inception_date date NOT NULL,
    benchmark text NOT NULL CHECK (benchmark IN ('CDI', 'IBOVESPA')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (manager_id)  -- one profile per manager
  );
  ALTER TABLE clube_profiles ENABLE ROW LEVEL SECURITY;
  -- club_manager can manage their own profile
  CREATE POLICY "Manager manages own profile"
    ON clube_profiles FOR ALL
    USING (auth.uid() = manager_id)
    WITH CHECK (auth.uid() = manager_id);
  -- club_members can read profiles (need to define read policy if required)
  ```

IF BACKEND NEEDS ROUTES — STEP 2:
  Add to server/routes/clubes.js (do not create a new file):
  GET /api/v1/clube/profile — return the club_manager's profile (or 404 if not set up)
  POST /api/v1/clube/profile — create profile (requires club_manager role)
  PUT /api/v1/clube/profile — update profile (requires club_manager role)

FRONTEND — STEP 3:
  Create src/clube/pages/ClubeProfilePage.jsx.
  Must be inside ClubeShell (which provides data-context="brazil" → gold tokens).
  First-time setup form (when no profile exists):
    — Clube name input
    — Inception date picker (date input, styled inline)
    — Benchmark selector: "CDI" | "IBOVESPA" toggle buttons
    — "Save Profile" button: var(--c-accent-br) / gold background
  If profile exists: show read-only view with an "Edit" button.
  All styles inline. No className. Gold for interactive elements (Brazil context).
  All hooks before early returns.

STEP 4 — VERIFY:
  Read all new/modified files back.
  Confirm: gold colors used (Brazil context), no blue in this component.
  Confirm: inline styles only, hooks before returns.
  Confirm: ClubeProfilePage is nested inside ClubeShell.

DONE CRITERIA:
  Clube profile can be created and retrieved
  First-time setup form is accessible for club_manager
  Profile data persists to Supabase
  No blue colors in Clube components
```

---

### Perf Backlog (Pull In If Sprint Has Capacity)

These are low priority. Only tackle if GLO-41, GLO-32, GLO-33, and GLO-26/45 are done.

**GLO-83 — vite-plugin-compression**
```
Install vite-plugin-compression. Add to vite.config.js to generate .gz and .br files at build
time. Verify: npm run build produces .gz files alongside .js chunks in dist/.
Audit vite.config.js first — read it fully before editing.
```

**GLO-81 — Core Web Vitals monitoring**
```
Install web-vitals package. In src/main.jsx, import and call reportWebVitals() after mounting.
Log LCP, CLS, FID, TTFB to console in development, to an analytics endpoint (or console.warn)
in production. Audit src/main.jsx first.
```

**GLO-82 — Service worker caching**
```
Add vite-plugin-pwa (or equivalent) for offline caching of static assets.
Strategy: cache-first for assets, network-first for API calls.
Audit vite.config.js and verify no existing service worker before implementing.
```

**GLO-80 — Break monolithic page components**
```
Scope: GlobalMarketsTerminal.jsx (135KB chunk) is a candidate for component extraction.
STEP 0: Read the file fully. Map self-contained sections that could be extracted without
changing props or state shape. Report the extraction plan — do not extract without approval.
This is architecture-impacting — treat with extra care.
```

---

## End-of-Cycle Verification

Run these before closing Cycle 3:

```bash
# Color system integrity
grep -r '#3b82f6' src/BrazilTerminal.jsx     # → 0 (GLO-85 fixed)
grep -r '#FF5252' src/                        # → 0 (only token definitions)
grep -r 'DM Sans' src/                        # → 0

# No className in new feature files
grep -n 'className' src/context/AlertsContext.jsx
grep -n 'className' src/clube/pages/ClubeProfilePage.jsx

# Build
npm run build                                  # → succeeds, ~50+ chunks

# Migration files
ls server/migrations/                          # → new price_alerts migration present
```

Manual checks:
- Create a price alert for any asset above current price — wait for polling — confirm toast appears and alert deactivates
- Login as `club_manager` → navigate to `/clubes` → confirm profile setup page is accessible
- Login as `admin` → confirm user management view shows role badges
- Login as `user` → confirm no access to `/clubes` or `/admin`

---

## Cycle 3 → Cycle 4 Handoff Preview

Once Cycle 3 is done, Cycle 4 picks up the FE work that now has backends:
- **GLO-38** — Watchlist FE polish (backend: done in Cycle 1 pre-work)
- **GLO-40** — Price alerts FE enhancements (built on Cycle 3's GLO-41)
- **GLO-20/21** — Brazil terminal yellow accent (nav tab indicator)
- **GLO-16** — Watchlist feature — save and pin assets
- **GLO-34** — Role-based redirect FE final polish

The Clube core loop accelerates in Cycles 5–6: member invite flow, NAV entry modal, member dashboard.
