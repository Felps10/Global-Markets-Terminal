# Claude Code Prompt — Cycle 2: Auth UX + Design Polish
> Paste this entire file as your first message in a new Claude Code session.
> One issue per session. Use the issue-specific prompts at the bottom for each GLO ticket.

---

## Context: What Was Done in Cycle 1

Cycle 1 was a pure performance sprint. All 6 issues shipped and are closed in Linear.

**What changed in the codebase:**

- **`src/dataServices.js`** — `fredAllMacro()` and `brapiQuote()` converted to `Promise.allSettled`. FRED macro data now fetches all 8 series in parallel. **`fmpBatchProfile()` was intentionally left sequential** — it has a 1-second throttle to avoid FMP 429s. Do not touch this.
- **`src/App.jsx`** — All 35 page components are now `React.lazy()`. The route tree is wrapped in `<Suspense>`. Build produces 25+ route chunks. Main index bundle: 519KB. Largest page: `GlobalMarketsTerminal` at 135KB.
- **`src/services/quotaTracker.js`** — Day counters buffered in-memory with 2s debounced flush to `localStorage`. Reads go through the buffer, never `localStorage.getItem` directly.
- **`src/BrazilTerminal.jsx`** — `getB3AssetEntries()` now caches its result. MacroStrip banner updated to blue tokens (`rgba(21,101,192,0.08)` bg, `#3b82f6` values, 8px radius).
- **`src/components/AssetListView.jsx`** — `@tanstack/react-virtual` integrated. Only ~15-20 DOM nodes rendered at any scroll position. Spacer `<tr>` elements handle scroll position math.

**New dependency added:** `@tanstack/react-virtual`

---

## Project Architecture (Read Before Touching Anything)

**Stack:** React 18 + Vite 6, Express 4, Supabase (Postgres), Vercel + Railway. Plain JavaScript — no TypeScript anywhere.

**Auth:** Supabase Auth (`signInWithPassword`, `onAuthStateChange`). Role stored as TEXT in `user_metadata.role`. Five roles by rank: `user=0`, `club_member=1`, `club_manager=2`, `admin=3`. Auth middleware uses `>=` rank comparison. Both `requireRole()` and `hasRole()` already exist on client (`src/lib/roles.js`) and server (`server/lib/roles.js`).

**What is already built and must not be rebuilt:**
- Auth middleware with role hierarchy: `server/middleware/auth.js:33-50`
- Login response includes role: `server/routes/auth.js:100-108`
- `data-context="brazil"` CSS override: `src/index.css:69-75`
- Watchlist: `server/routes/watchlist.js` + `src/context/WatchlistContext.jsx`
- Admin user management backend: `server/routes/users.js`
- CSS variable system: 27+ tokens in `src/index.css`

---

## Color System — Memorize This Before Writing Any Style

| Token | Hex | Use |
|---|---|---|
| `--c-accent` | `#3b82f6` | UI chrome — buttons, links, focus rings, active states. Global terminal + logged-out pages. |
| `--c-accent-hover` | `#2563eb` | Hover state on interactive elements |
| `--c-accent-data` | `#00C8FF` | Live market data ink — sparklines, live dots, price numbers in charts. **NOT for UI chrome.** |
| `--c-accent-br` | `#F5C518` | Brazil/Clube gold. Auto-applied inside `[data-context="brazil"]`. |
| `--c-error` | `#FF5252` | Errors and danger states. **This token does not yet exist — GLO-9 creates it.** |

`--c-accent` (`#3b82f6`) and `--c-accent-data` (`#00C8FF`) are **intentionally different tokens** for different purposes. Never swap them. Never apply `#00C8FF` to buttons or interactive elements. Never apply gold outside of Brazil/Clube context.

---

## Standing Rules (Apply to Every File in Every Session)

1. **Inline styles only.** `style={{ ... }}` on every element. No `className` for layout, color, or spacing. No Tailwind. No CSS modules. No styled-components.
2. **All hooks before early returns.** `useState`, `useEffect`, `useMemo`, `useCallback` must appear before any `if (!x) return null`.
3. **ES modules only.** No `require()`. All imports use `import`.
4. **Audit before editing.** Read the target file fully before proposing any change. Map every occurrence of what you're replacing before touching a single line.
5. **Never commit to `main`.** All changes go on a feature branch. PRs are opened for manual merge.
6. **`src/clube/` is its own world.** Do not import from global terminal into Clube components or vice versa.
7. **Check before creating.** Run a grep before creating any new component, hook, or context. This codebase has duplicates — the canonical version is in Linear's audit notes.

---

## Cycle 2 Issues — Execution Order

Work these in dependency order. GLO-9 and GLO-7 must finish before GLO-12 and GLO-13. GLO-14, GLO-15, and GLO-37 are independent and can run in parallel with design work.

```
MUST COMPLETE FIRST (unblock page redesigns):
  GLO-9  — Tokenize #FF5252 as --c-error
  GLO-7  — Complete DM Sans → IBM Plex Sans migration

THEN (depend on GLO-9 + GLO-7):
  GLO-12 — Login page redesign
  GLO-13 — Register page redesign + password UX
  GLO-11 — Landing page refresh

PARALLEL (independent — can run any time):
  GLO-14 — Role-based post-login redirect (FE only)
  GLO-37 — Silent role promotion — BE notification flag
  GLO-15 — Silent role promotion — FE one-time modal

LAST (low effort, no dependencies):
  GLO-10 — Define --radius tokens (define only, don't mass-replace)
  GLO-8  — Sweep remaining hardcoded accent hex values
```

---

## Issue-Specific Prompts

Use each block below as the prompt for its own Claude Code session.

---

### GLO-9 — Tokenize `#FF5252` as `--c-error`

```
CYCLE 2 / GLO-9 — Tokenize error color

STEP 0 — AUDIT (read-only, no changes yet):
  1. Read `src/index.css` — find the existing CSS variable blocks (there are two: one per theme)
  2. Run: grep -rn "#FF5252\|#ff5252" src/ --include="*.jsx" --include="*.js" --include="*.css"
  3. Count total occurrences and list the top 5 files by occurrence count
  4. Report your findings. Wait for approval before making any changes.

STEP 1 — ADD TOKENS TO index.css:
  Under both the default and dark theme selectors in src/index.css, add:
    --c-error: #FF5252;
    --c-error-dim: rgba(255, 82, 82, 0.12);
  Place them in the existing color variable group. Do not restructure anything else.

STEP 2 — REPLACE OCCURRENCES:
  Replace every hardcoded '#FF5252' and '#ff5252' in src/ with 'var(--c-error)'.
  In inline styles: style={{ color: '#FF5252' }} → style={{ color: 'var(--c-error)' }}
  Work file by file. Do not batch-replace across files in one operation.
  After each file: read it back to confirm no raw hex remains.

STEP 3 — VERIFY:
  Run: grep -rn "#FF5252\|#ff5252" src/
  Expected result: 0 matches.
  If any remain, fix them before proceeding.

STANDING RULES:
  - Inline styles only — do not add CSS classes
  - Do not restructure any files beyond the targeted replacements
  - Do not change any logic, only string substitution of color values

DONE CRITERIA:
  grep -r '#FF5252' src/ → 0 results
  grep -r '#ff5252' src/ → 0 results
  src/index.css has --c-error and --c-error-dim in both theme blocks
```

---

### GLO-7 — Complete DM Sans → IBM Plex Sans Migration

```
CYCLE 2 / GLO-7 — Font migration: DM Sans → IBM Plex Sans

STEP 0 — AUDIT (read-only, no changes yet):
  1. Run: grep -rn "DM Sans\|DM+Sans" src/ index.html --include="*.jsx" --include="*.js" --include="*.css" --include="*.html"
  2. List every file with its occurrence count
  3. Read src/index.css line 1 — check the Google Fonts import URL
  4. Read index.html — check the <link> tag for Google Fonts
  5. Report total occurrence count and all file paths. Wait for approval.

STEP 1 — REPLACE IN COMPONENT FILES:
  For each file containing 'DM Sans':
    Replace: fontFamily: 'DM Sans' → fontFamily: 'IBM Plex Sans'
    Replace: fontFamily: "'DM Sans'" → fontFamily: "'IBM Plex Sans'"
    Replace: fontFamily: '"DM Sans"' → fontFamily: '"IBM Plex Sans"'
  Work one file at a time. Read back after each to confirm.
  Known high-count files: HamburgerMenu.jsx (~7 refs), GlobalMarketsTerminal.jsx (~6 refs),
    BrazilTerminal.jsx (~4 refs), plus admin components.

STEP 2 — UPDATE src/index.css:
  Find the Google Fonts @import on line 1.
  Remove 'DM+Sans' from the import URL. IBM Plex Sans should already be in the URL.
  If IBM Plex Sans is not present, add it with weights 300;400;500;600;700.
  Do not change any other CSS.

STEP 3 — UPDATE index.html:
  Find the <link> tag loading Google Fonts.
  Remove the DM+Sans family from the href.
  Confirm IBM+Plex+Sans is present with the same weights.

STEP 4 — VERIFY:
  Run: grep -rn "DM Sans\|DM+Sans" src/ index.html
  Expected result: 0 matches.

STANDING RULES:
  - Inline styles only — do not convert fontFamily to a CSS class
  - Do not change font sizes, weights, or line heights — only the family name
  - Do not restructure any files

DONE CRITERIA:
  grep -r 'DM Sans' src/ → 0 results
  grep -r 'DM+Sans' src/ → 0 results (in index.css and index.html)
  IBM Plex Sans loads correctly in the browser after changes
```

---

### GLO-14 — Role-Based Post-Login Redirect (FE only)

```
CYCLE 2 / GLO-14 — Role-based post-login redirect (frontend only)

CONTEXT:
  The backend already returns role in the login response (server/routes/auth.js:100-108
  returns { token, user: { id, email, name, role } }). This is purely a frontend change.
  Role rank: user=0, club_member=1, club_manager=2, admin=3.
  Redirect targets: admin → /admin | club_manager or club_member → /clubes | user → /app/global

STEP 0 — AUDIT (read-only):
  1. Read src/pages/LoginPage.jsx — find the login submit handler, note where navigation happens
  2. Read src/components/ProtectedRoute.jsx — check if already-authenticated users are redirected
  3. Read src/context/AuthContext.jsx — confirm what the login() function returns and where role lives
  4. Report your findings. Do not make changes yet.

STEP 1 — UPDATE LOGIN HANDLER:
  In LoginPage.jsx, after successful login, read the role from the auth response.
  Implement redirect logic:
    if role === 'admin' → navigate('/admin')
    if role === 'club_manager' || role === 'club_member' → navigate('/clubes')
    else → navigate('/app/global')
  Do not hardcode strings — import ROLE constants from src/lib/roles.js if they exist.

STEP 2 — UPDATE ProtectedRoute.jsx:
  If a user is already authenticated and tries to visit /login, redirect them to the
  appropriate route based on their role using the same logic as Step 1.
  This prevents logged-in users from seeing the login page.

STEP 3 — VERIFY:
  Read both files back and trace the logic path for each role.
  Confirm: no hardcoded route strings that bypass the role check.
  Confirm: all hooks appear before any early returns in ProtectedRoute.

STANDING RULES:
  - Inline styles only — this is logic-only, but if any UI is touched, no className
  - All hooks before early returns
  - Do not create new files — modify existing LoginPage.jsx and ProtectedRoute.jsx only

DONE CRITERIA:
  admin login → lands on /admin
  club_manager login → lands on /clubes
  club_member login → lands on /clubes
  user login → lands on /app/global
  Already-authenticated user visiting /login → redirected (not shown login form)
```

---

### GLO-37 + GLO-15 — Silent Role Promotion Notification

```
CYCLE 2 / GLO-37 + GLO-15 — Silent role promotion notification (BE + FE)

CONTEXT:
  When a user's role is changed by an admin, they have no idea. The feature is:
  - BE: when role changes, set notification_pending: true in user_metadata
  - FE: on session load, check this flag → show one-time modal → clear the flag
  This is a small feature. Scope it tightly — one modal, one flag, no persistence layer.

STEP 0 — AUDIT (read-only):
  1. Read server/routes/users.js — find the role PATCH endpoint
  2. Read src/context/AuthContext.jsx — find where session is loaded (onAuthStateChange)
     and where user state is set
  3. Check if any notification/modal component already exists: grep -r 'notification\|Notification\|RoleModal' src/
  4. Report findings. Wait for approval before writing any code.

STEP 1 — BACKEND (GLO-37):
  In the role PATCH endpoint in server/routes/users.js:
  After updating the role, update user_metadata to also set notification_pending: true.
  Use Supabase admin client to update user_metadata (same pattern as setting the role).
  Do not change anything else in the endpoint.

STEP 2 — FRONTEND MODAL (GLO-15, part A):
  Create src/components/RolePromotionModal.jsx.
  It renders a minimal dark-themed modal (inline styles only, no className).
  Content: "Your access level has been updated." + current role name + a single "Got it" button.
  Props: { role, onDismiss }
  Colors: var(--c-accent) for the button, no gold.
  All hooks before any early returns.

STEP 3 — FRONTEND WIRING (GLO-15, part B):
  In src/context/AuthContext.jsx, after session is confirmed:
  Check user_metadata.notification_pending — if true:
    Show RolePromotionModal (set a local state flag)
    On dismiss: call Supabase to update user_metadata and set notification_pending: false
  Do not store this flag anywhere else. Do not persist it to localStorage.

STEP 4 — VERIFY:
  Read all modified files back and trace the full flow:
  role PATCH → metadata updated → user logs in → flag detected → modal shown → dismissed → flag cleared.
  Confirm RolePromotionModal has no className attributes.
  Confirm all hooks are before early returns in AuthContext.

STANDING RULES:
  - Inline styles only — especially in RolePromotionModal
  - No localStorage — the notification_pending flag lives in Supabase user_metadata only
  - Do not create additional state layers — one boolean in AuthContext is enough
  - src/clube/ must not be touched

DONE CRITERIA:
  Role PATCH in server sets notification_pending: true in user_metadata
  Next login after role change shows one-time modal
  Dismissing modal clears the flag in Supabase
  Modal never appears twice for the same role change
```

---

### GLO-12 — Login Page Redesign

```
CYCLE 2 / GLO-12 — Login page redesign
PREREQUISITE: GLO-9 (--c-error token) and GLO-7 (IBM Plex Sans) must be done first.

STEP 0 — AUDIT (read-only):
  1. Read src/pages/LoginPage.jsx in full
  2. List every color value currently hardcoded (hex or rgba)
  3. List every fontFamily value
  4. Identify the form structure: inputs, labels, button, error display, any logo/branding
  5. Check if a MiniGlobe or logo component is used: grep -r 'MiniGlobe\|Logo' src/pages/LoginPage.jsx
  6. Report findings. Propose the visual changes. Wait for approval before coding.

STEP 1 — APPLY DESIGN SYSTEM TOKENS:
  Replace all hardcoded colors with CSS variable equivalents:
    Interactive elements (button, focus) → var(--c-accent) / var(--c-accent-hover)
    Error states → var(--c-error) / var(--c-error-dim)
    Background → var(--c-bg) or #080f1a if token unavailable
    Text → var(--c-text) or #e2e8f0 if token unavailable
    Borders → var(--c-border) or appropriate token
  Font: IBM Plex Sans for form labels and inputs. JetBrains Mono for any monospaced elements.

STEP 2 — POLISH (keep existing functionality):
  Refine spacing, input height, and button style to match the terminal aesthetic.
  Do not change: form validation logic, submit handler, navigation after login.
  Do not add new features. Do not add new state.
  Do not use gold — this is a global/logged-out page.

STEP 3 — VERIFY:
  Read the file back in full.
  Run: grep -n "DM Sans\|#FF5252\|#3b82f6" src/pages/LoginPage.jsx
    — DM Sans → 0 results
    — #FF5252 → 0 results (should be var(--c-error))
    — #3b82f6 → 0 results (should be var(--c-accent))
  Confirm no className attributes exist in the file.
  Confirm all hooks are before early returns.

STANDING RULES:
  - Inline styles only
  - No gold (#C5A059, #D4B06A, #F5C518) — login is not a Brazil/Clube context
  - Do not break existing auth logic
  - Do not add className, Tailwind, or CSS modules

DONE CRITERIA:
  All colors use CSS variable tokens
  Font is IBM Plex Sans (body) / JetBrains Mono (code/mono)
  Login form functions correctly after changes
  No DM Sans, no hardcoded #FF5252, no hardcoded accent hex
```

---

### GLO-13 — Register Page Redesign + Password UX

```
CYCLE 2 / GLO-13 — Register page redesign + password UX
PREREQUISITE: GLO-9 (--c-error token) and GLO-7 (IBM Plex Sans) must be done first.

STEP 0 — AUDIT (read-only):
  1. Read src/pages/RegisterPage.jsx in full
  2. Identify: existing password strength meter (if any), validation error display, field list
  3. List all hardcoded colors and font families
  4. Check: grep -r 'strength\|password\|Password' src/pages/RegisterPage.jsx
  5. Report findings and propose changes. Wait for approval.

STEP 1 — APPLY DESIGN SYSTEM TOKENS:
  Same token replacement as GLO-12:
    Interactive → var(--c-accent)
    Errors → var(--c-error) / var(--c-error-dim)
    Background, text, borders → appropriate tokens
  Font: IBM Plex Sans for labels/inputs.

STEP 2 — PASSWORD UX IMPROVEMENTS:
  If a strength meter exists: ensure it uses the color system correctly.
    Weak → var(--c-error), Medium → #F59E0B (amber), Strong → #22C55E (green)
  If no strength meter exists: add a minimal one — 3-segment bar, color-coded, below the password input.
    Segments fill left-to-right based on: length ≥ 8 (first), has uppercase + digit (second),
    has special character (third).
  Password requirements hint text: show below the field using var(--c-text-muted) or equivalent.
  Show/hide toggle on password field: eye icon as an inline text button (not a real button element
  unless it already exists). No external icon library unless one is already imported.

STEP 3 — VERIFY:
  Read file back in full.
  Run: grep -n "DM Sans\|#FF5252\|#3b82f6" src/pages/RegisterPage.jsx → 0 results each
  Confirm no className attributes.
  Confirm all hooks are before early returns.
  Confirm registration flow (submit, error, success) still works logically.

STANDING RULES:
  - Inline styles only
  - No gold — register is not a Brazil/Clube context
  - Do not break existing validation or submit logic
  - Do not add new form fields

DONE CRITERIA:
  All colors tokenized
  Password strength indicator present and functional
  Requirements displayed clearly below field
  No DM Sans, no hardcoded #FF5252 or accent hex
```

---

### GLO-11 — Landing Page Refresh

```
CYCLE 2 / GLO-11 — Landing page refresh with canonical tokens + snapshot data
PREREQUISITE: GLO-9 and GLO-7 must be done first.

STEP 0 — AUDIT (read-only):
  1. Read src/pages/LandingPage.jsx in full
  2. List all hardcoded colors, font families, and any data-fetching logic
  3. Check if the public snapshot endpoint is already called:
     grep -r 'snapshot\|/api/v1/snapshot' src/pages/LandingPage.jsx
  4. Read the snapshot hook if one exists: grep -r 'useSnapshot' src/
  5. Report findings and propose what changes are needed. Wait for approval.

STEP 1 — APPLY DESIGN SYSTEM TOKENS:
  Replace hardcoded colors with CSS variable tokens.
  CTA buttons → var(--c-accent) / var(--c-accent-hover)
  No gold — landing page is not a Brazil/Clube context.
  Font: IBM Plex Sans for body copy, JetBrains Mono for any ticker/data elements.

STEP 2 — INTEGRATE SNAPSHOT DATA:
  The public endpoint GET /api/v1/snapshot requires no auth.
  If useSnapshot hook already exists: use it. Do not create a duplicate.
  If it does not exist: fetch snapshot data in a useEffect on component mount.
  Display 3-5 live market prices in the hero section (indices, BTC, or top equities).
  Use var(--c-accent-data) (#00C8FF) for the price numbers — this is market data ink.
  Use var(--c-accent) (#3b82f6) for CTA buttons — this is interactive UI.
  Handle fetch failure gracefully: show placeholder dashes, do not crash.

STEP 3 — VERIFY:
  Read file back in full.
  Run: grep -n "DM Sans\|#FF5252\|#3b82f6\|#00C8FF" src/pages/LandingPage.jsx
    — DM Sans → 0
    — #FF5252 → 0
    — #3b82f6 → 0 (must be var(--c-accent))
    — #00C8FF → 0 (must be var(--c-accent-data))
  Confirm all hooks before early returns.
  Confirm the page renders without errors when snapshot fetch fails.

STANDING RULES:
  - Inline styles only
  - No gold — this is a logged-out global page
  - Do not add auth-dependent logic to this page
  - Snapshot data is display-only — no interaction

DONE CRITERIA:
  All colors tokenized
  3-5 live prices visible in hero from /api/v1/snapshot
  Graceful degradation when snapshot unavailable
  No DM Sans, no hardcoded hex values
```

---

### GLO-10 — Define Radius Tokens (low effort)

```
CYCLE 2 / GLO-10 — Define --radius CSS tokens

STEP 0 — AUDIT:
  1. Read src/index.css — check if any --radius tokens already exist
  2. Run: grep -n "borderRadius" src/index.css
  3. Report. Wait for approval.

STEP 1 — ADD TOKENS:
  In src/index.css, in the existing :root / theme variable block, add:
    --radius-sm: 3px;
    --radius-input: 4px;
    --radius-card: 6px;
    --radius-lg: 8px;
  Place them with other spacing/dimension tokens if they exist, otherwise after color tokens.

STEP 2 — DO NOT MASS-REPLACE:
  Do NOT search-and-replace existing borderRadius values across the codebase.
  There are 332 existing borderRadius values. These will be migrated incrementally in future work.
  Only add the token definitions to index.css.

STEP 3 — VERIFY:
  Read src/index.css and confirm the 4 tokens are present in both theme selectors (if applicable).

DONE CRITERIA:
  --radius-sm, --radius-input, --radius-card, --radius-lg defined in src/index.css
  Zero borderRadius values changed in component files
```

---

### GLO-8 — Sweep Remaining Hardcoded Accent Hex Values (low effort)

```
CYCLE 2 / GLO-8 — Sweep hardcoded accent hex values

NOTE: Run this LAST, after GLO-9 (error token) is done so you don't accidentally
sweep values that should have become --c-error.

STEP 0 — AUDIT:
  1. Run: grep -rn "#3b82f6\|#2563eb\|#1d4ed8" src/ --include="*.jsx" --include="*.js"
  2. Run: grep -rn "var(--c-accent)" src/ --include="*.jsx" --include="*.js"
  3. Compare the two lists — identify files that still use hardcoded accent hex
  4. Report. Wait for approval before replacing.

STEP 1 — REPLACE (carefully):
  For each hardcoded #3b82f6 in UI-context code: replace with var(--c-accent)
  For each hardcoded #2563eb in hover/interaction context: replace with var(--c-accent-hover)
  IMPORTANT: Do not replace if the hardcoded value is inside a Brazil/Clube component
  (those should use gold tokens, not blue at all — flag them as anomalies instead).

STEP 2 — VERIFY:
  Run: grep -rn "#3b82f6\|#2563eb" src/ --include="*.jsx" --include="*.js"
  Report remaining count. Some may be intentional (e.g., inline SVG fill values) — flag those
  rather than blindly replacing.

DONE CRITERIA:
  Non-SVG, non-Brasil/Clube hardcoded accent hex values → replaced with tokens
  Any anomalous gold-context files flagged for review
```

---

## End-of-Cycle Verification

Before closing Cycle 2, run all of these and confirm 0 failures:

```bash
grep -r '#FF5252' src/                    # → 0 (all replaced with var(--c-error))
grep -r 'DM Sans' src/                   # → 0 (all replaced with IBM Plex Sans)
grep -r 'DM+Sans' src/ index.html        # → 0 (removed from Google Fonts import)
grep -r '#3b82f6' src/                   # → ~0 or only flagged intentional exceptions
grep -r 'className' src/pages/           # → 0 (no className on auth/landing pages)
npm run build                            # → succeeds, still produces 25+ chunks
```

Role redirect smoke test (manual):
- Login as `admin` → lands on `/admin`
- Login as `club_manager` → lands on `/clubes`
- Login as `club_member` → lands on `/clubes`
- Login as `user` → lands on `/app/global`
- Visit `/login` while already authenticated → redirected
