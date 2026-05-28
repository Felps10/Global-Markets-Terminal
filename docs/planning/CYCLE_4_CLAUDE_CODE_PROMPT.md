# GMT — Cycle 4 Claude Code Prompt
> Sprint: Apr 27 – May 4, 2026 | Theme: User-Facing Feature Surface
> 6 active issues | Checkpoint-verified | Supersedes any prior Cycle 4 draft

---

## Context: What Was Confirmed Before This Sprint

Three cycles are complete and checkpoint-audited. The codebase is clean:

- **Cycle 1:** Performance — `Promise.allSettled` FRED, React.lazy, virtualizer, debounced quotaTracker, macro tokens
- **Cycle 2:** Auth UX + Design — `--c-error` tokenized, DM Sans gone, role redirect live, `RolePromotionModal` built, radius tokens defined
- **Cycle 3:** Feature Primitives — Price alerts end-to-end (`009_price_alerts.sql` → `alerts.js` → `AlertsContext.jsx` → `AlertToast.jsx`), `promote-manager` endpoint, admin UserManager polished, Brazil blue anomaly fixed

**Issues closed before this sprint (do not reopen or re-implement):**
- GLO-34 — Done in Cycle 2 (`getRedirectForRole()` in all 3 auth pages)
- GLO-36 — Done in Cycle 2 (`RolePromotionModal.jsx` + `notification_pending` in `AuthContext`)
- GLO-39 — Pre-existing (`server/routes/watchlist.js`, 74 lines, fully functional)
- GLO-53 — Duplicate of GLO-15 (`RolePromotionModal` covers member notification)

---

## Standing Rules (Non-Negotiable — Every Session)

1. **Inline styles only.** `style={{ ... }}` everywhere. Never `className`, Tailwind, or styled-components.
2. **Color tokens — three distinct roles:**
   - `var(--c-accent)` `#3b82f6` — interactive UI (buttons, focus rings) in global terminal and logged-out pages
   - `var(--c-accent-data)` `#00C8FF` — live market data ink (prices, sparklines). Never for UI chrome.
   - `var(--c-accent-br)` `#F5C518` — Brazil/Clube gold. Applied via `[data-context="brazil"]`. Never in global components.
   - `var(--c-error)` `#FF5252` — errors. Never hardcoded.
3. **All hooks before early returns.** `useState / useEffect / useMemo` must appear before any `if (!x) return null`.
4. **Audit first, always.** Step 0 of every issue is read-only. Run `grep -r 'ComponentName' src/` before creating anything.
5. **Gate B:** Propose changes → wait for explicit "yes" → write on a new branch.
6. **Gate C:** Open PR. Never auto-merge. Never commit directly to `main`.
7. **`src/clube/` is isolated.** Its own brand (gold), its own shell (`ClubeShell`), its own routes. Do not import global terminal components into Clube views.
8. **ES modules only.** `import / export`. No `require()` anywhere.
9. **`server/routes/clubes.js` is 2060 lines with ~40+ existing endpoints.** Read the full file before writing any Clube backend code. Duplication risk is high.
10. **Do not create a second AlertsContext, WatchlistContext, or polling timer.** These already exist from prior cycles.

---

## Sprint Execution Order

```
GLO-20 → GLO-21  (Brazil accent — quick, sequential, clear wins)
GLO-50           (Admin promote FE — security-relevant, well-scoped)
GLO-38/16        (Watchlist FE polish — urgent priority)
GLO-40/17        (Price alerts FE management view)
GLO-26/45        (Clube profile — longest, audit-gated, do last)
```

---

## Issue 1 of 6 — GLO-20
### Apply `data-context="brazil"` to BrazilTerminal route wrapper

**Why this matters:** The `[data-context="brazil"]` CSS override block exists in `index.css` and is working on `ClubeShell.jsx`. But `BrazilTerminal` does NOT have it. This means `var(--c-accent)` still resolves to blue `#3b82f6` inside the Brazil terminal instead of gold. GLO-21 depends on this.

---

### Step 0 — Read-Only Audit

```bash
# Find where BrazilTerminal is rendered in the route tree
grep -n 'BrazilTerminal' src/App.jsx

# Confirm the CSS override block exists
grep -n 'data-context' src/index.css

# Check ClubeShell for the pattern to replicate
grep -n 'data-context' src/clube/ClubeShell.jsx 2>/dev/null || grep -rn 'data-context="brazil"' src/

# Confirm BrazilTerminal root element
head -60 src/BrazilTerminal.jsx
```

Report: What is the outermost JSX element in `BrazilTerminal.jsx`? Is it a `<div>`, a fragment, or something else?

---

### Step 1 — Add the attribute

Open `src/BrazilTerminal.jsx`. On the outermost wrapper element (likely a `<div>` with `style={{ ... }}`), add:

```jsx
data-context="brazil"
```

**If the outermost element is a React fragment `<>...</>`,** wrap it in a `<div data-context="brazil" style={{ ... }}>` and move the existing root styles onto it.

**Do not change any existing styles.** This is a one-attribute addition only.

---

### Step 2 — Verify in App.jsx (if needed)

If `BrazilTerminal` is rendered inside a route wrapper div in `App.jsx`, that wrapper could also receive `data-context="brazil"` as a belt-and-suspenders addition. Check if this is relevant — it should not be needed if the BrazilTerminal root element has the attribute.

---

### Done Criteria — GLO-20

- [ ] `data-context="brazil"` is on the outermost element of `BrazilTerminal.jsx`
- [ ] No other styles changed
- [ ] `grep -n 'data-context' src/BrazilTerminal.jsx` returns a result
- [ ] The Brazil terminal renders without visual regression (manual check in browser)

---

## Issue 2 of 6 — GLO-21
### Brazil terminal nav tab — gold active state indicator

**Depends on:** GLO-20 completed. The `data-context` attribute must be in place first.

**Why this matters:** When the user is on the Brazil terminal route, the nav tab indicator should be gold, not blue. This is a single targeted style change.

---

### Step 0 — Read-Only Audit

```bash
# Find the nav tab component(s)
grep -rn 'BrazilTerminal\|brazil\|/app/brazil' src/App.jsx
grep -rn 'NavTab\|navTab\|nav-tab\|activeRoute\|active.*tab\|tab.*active' src/ --include="*.jsx" -l

# Find where the active tab indicator style is currently set
grep -rn 'borderBottom\|activeTab\|isActive\|pathname.*brazil' src/ --include="*.jsx" -l
```

Identify: Which component renders the nav tabs? Where is the active state currently styled?

---

### Step 1 — Apply conditional gold color to the active Brazil tab

In the nav component, find the active tab indicator style. The current active state likely uses `var(--c-accent)` (blue). For the Brazil tab specifically, it should use `var(--c-accent-br)` (gold).

Apply a conditional:

```jsx
// Conceptual pattern — adapt to actual code structure
const isActive = pathname.includes('/app/brazil') // or however route matching works

style={{
  borderBottom: `2px solid ${isActive && isBrazilTab ? 'var(--c-accent-br)' : 'var(--c-accent)'}`,
  color: isActive && isBrazilTab ? 'var(--c-accent-br)' : 'inherit',
}}
```

**Do not change the blue active state for non-Brazil tabs.** This is a targeted override for the Brazil tab only.

---

### Done Criteria — GLO-21

- [ ] Brazil nav tab shows gold active indicator when on `/app/brazil` (or equivalent route)
- [ ] All other nav tabs still use blue active indicator
- [ ] No `var(--c-accent-br)` or `#F5C518` appears in any global terminal (non-Brazil) nav style
- [ ] Manual visual verification in browser

---

## Issue 3 of 6 — GLO-50
### Admin promote to club_manager — wire dedicated endpoint with confirm dialog + toast

**Why this matters:** `POST /users/:id/promote-manager` exists in `server/routes/users.js` (lines 128–167) and enforces a single-manager 409 guard. However, the UserManager UI currently uses a generic `PATCH /users/:id/role` dropdown for all role changes — this bypasses the constraint entirely. An admin could accidentally set two managers. This is a correctness issue, not just polish.

**What is needed:** A dedicated "Promote to Manager" button in `UserManager.jsx` that calls the specialized endpoint. The generic role dropdown stays for all other role changes (e.g., admin → user) but must no longer be usable for promoting to `club_manager`.

---

### Step 0 — Read-Only Audit

```bash
# Read UserManager in full
cat -n src/components/admin/UserManager.jsx

# Read the promote-manager endpoint
grep -n 'promote-manager\|promote_manager' server/routes/users.js -A 30

# Find the generic PATCH role call in the FE
grep -n 'PATCH.*role\|role.*PATCH\|/users.*role' src/ --include="*.jsx" -rn

# Check if RolePromotionModal is imported anywhere in UserManager
grep -n 'RolePromotionModal\|ConfirmModal\|modal\|Modal' src/components/admin/UserManager.jsx
```

Report: How is the current role dropdown structured? What does the generic PATCH call look like? Does UserManager already have any modal/confirmation pattern?

---

### Step 1 — Add "Promote to Manager" button

In `UserManager.jsx`, for each user row where `role !== 'club_manager'` and `role !== 'admin'`, add a "Promote to Manager" button alongside (not replacing) the existing role controls. Style it using `var(--c-accent)` at rest, with a gold accent on the label to signal Clube context:

```jsx
// Conceptual — adapt to actual component structure
{user.role !== 'club_manager' && user.role !== 'admin' && (
  <button
    onClick={() => handlePromoteClick(user)}
    style={{
      background: 'transparent',
      border: `1px solid var(--c-accent)`,
      color: 'var(--c-accent)',
      borderRadius: 'var(--radius-sm)',
      padding: '4px 10px',
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: 12,
      cursor: 'pointer',
    }}
  >
    Promote to Manager
  </button>
)}
```

---

### Step 2 — Add confirm dialog

On click, show an inline confirmation (not a new modal component — use local state):

```jsx
const [pendingPromote, setPendingPromote] = React.useState(null)

// In the JSX, when pendingPromote is set, show confirmation inline:
{pendingPromote?.id === user.id && (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: 'var(--c-text-2)' }}>
      Set as sole club manager?
    </span>
    <button onClick={() => confirmPromote(user.id)} style={{ ... }}>Confirm</button>
    <button onClick={() => setPendingPromote(null)} style={{ ... }}>Cancel</button>
  </div>
)}
```

---

### Step 3 — Call `/promote-manager` and handle 409

```js
async function confirmPromote(userId) {
  try {
    const res = await fetch(`/api/v1/users/${userId}/promote-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 409) {
      // A manager already exists — show error toast
      setToast({ type: 'error', message: 'A club manager already exists. Demote them first.' })
      setPendingPromote(null)
      return
    }

    if (!res.ok) throw new Error('Promote failed')

    setToast({ type: 'success', message: 'User promoted to club manager.' })
    setPendingPromote(null)
    refetchUsers() // or update local state optimistically
  } catch (err) {
    setToast({ type: 'error', message: 'Promote failed. Try again.' })
  }
}
```

---

### Step 4 — Toast feedback

If `UserManager.jsx` does not already have a toast system, add a minimal local one (fixed bottom-right, 4s auto-dismiss, `var(--c-error)` for errors and `var(--c-accent)` for success). Do not import `AlertToast` — that is for market price alerts, not admin UI feedback.

---

### Step 5 — Remove `club_manager` from the generic role dropdown

In the existing role dropdown (if one exists), remove `club_manager` as a selectable option. Demoting from `club_manager` to another role is still fine via the dropdown — what must be prevented is promoting TO `club_manager` through the generic path.

---

### Done Criteria — GLO-50

- [ ] "Promote to Manager" button visible for eligible users (not admin, not already club_manager)
- [ ] Clicking triggers an inline confirmation, not an immediate action
- [ ] Confirmation calls `POST /users/:id/promote-manager` (not the generic PATCH)
- [ ] 409 response shows a clear "A manager already exists" message
- [ ] Success shows a toast and refreshes the user list
- [ ] `club_manager` is no longer selectable via the generic role dropdown (to prevent bypass)
- [ ] All styles: inline, IBM Plex Sans, `var(--c-accent)` blue for actions — no gold in admin UI

---

## Issue 4 of 6 — GLO-38/16
### Watchlist FE — star/pin on asset rows, nav group, optimistic updates

**Priority: Urgent**

**What exists:** `WatchlistContext.jsx` (82 lines) with `addToWatchlist`, `removeFromWatchlist`, `watchlist` array, and `useWatchlist()` hook. `server/routes/watchlist.js` has GET/POST/DELETE. The backend is fully functional.

**What's needed:** The star/pin UI on individual asset rows (in the asset list and/or detail drawer), a nav group or filter showing only watchlisted assets, and optimistic updates so the UI doesn't feel sluggish.

---

### Step 0 — Read-Only Audit

```bash
# Read WatchlistContext in full
cat -n src/context/WatchlistContext.jsx

# Find where assets are rendered as rows
grep -n 'AssetRow\|assetRow\|asset-row\|useWatchlist\|watchlist' src/ --include="*.jsx" -rn -l

# Read AssetListView to understand row structure
head -80 src/components/AssetListView.jsx
grep -n 'style\|onClick\|star\|pin\|watch' src/components/AssetListView.jsx | head -40

# Check if star/pin is already rendered anywhere
grep -rn '★\|☆\|star\|pin\|pinned' src/ --include="*.jsx"

# Check the main terminal nav structure for group filtering
grep -n 'group\|filter\|nav\|sidebar' src/GlobalMarketsTerminal.jsx | head -30
```

Report: Where do asset rows live? What does a single row look like today? Is there already any watch/pin icon rendered?

---

### Step 1 — Star icon on asset rows

In `AssetListView.jsx` (or wherever asset rows are rendered), add a star icon to each row. The icon should:

- Show `★` (filled) if the asset is in `watchlist`, `☆` (outline) if not
- On click: call `addToWatchlist(asset)` or `removeFromWatchlist(asset.symbol)` from `useWatchlist()`
- Apply an **optimistic update** — update local display immediately, then resolve the server call async
- Use `var(--c-accent-br)` gold for the filled star (it's a saved/personal state, not a live data signal)
- Cursor: `pointer`. Font size slightly smaller than asset ticker to not dominate the row.

```jsx
const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
const isPinned = watchlist.some(w => w.symbol === asset.symbol)

<span
  onClick={(e) => {
    e.stopPropagation() // don't open detail drawer
    isPinned ? removeFromWatchlist(asset.symbol) : addToWatchlist(asset)
  }}
  style={{
    cursor: 'pointer',
    color: isPinned ? 'var(--c-accent-br)' : 'var(--c-text-3)',
    fontSize: 14,
    lineHeight: 1,
    userSelect: 'none',
  }}
>
  {isPinned ? '★' : '☆'}
</span>
```

---

### Step 2 — Watchlist nav group / filter

In `GlobalMarketsTerminal.jsx`, add a "Watchlist" filter option alongside the existing group/subgroup nav. When active, the asset list shows only watchlisted assets.

- Use a button or tab with the same style as existing group nav items
- When "Watchlist" is selected, filter `assets` to `watchlist.map(w => w.symbol)` before rendering
- If watchlist is empty, show an empty state: "No assets pinned yet — click ★ on any asset to save it here."
- This does NOT change the URL — it's a local filter state.

---

### Step 3 — Optimistic updates in WatchlistContext

Read `WatchlistContext.jsx`. If `addToWatchlist` / `removeFromWatchlist` currently wait for the server before updating the array, refactor to optimistic pattern:

```js
function addToWatchlist(asset) {
  // 1. Update state immediately
  setWatchlist(prev => [...prev, asset])
  // 2. Send to server async
  fetch('/api/v1/watchlist', { method: 'POST', ... })
    .catch(() => {
      // 3. Roll back on failure
      setWatchlist(prev => prev.filter(w => w.symbol !== asset.symbol))
    })
}
```

If the context already does this — note it in the report and skip this step.

---

### Done Criteria — GLO-38/16

- [ ] Star icon visible on every asset row — filled gold (★) if pinned, outline (☆) if not
- [ ] Clicking star adds/removes from watchlist without page reload
- [ ] "Watchlist" filter in group nav — shows only pinned assets when selected
- [ ] Empty watchlist shows a helpful prompt, not a blank panel
- [ ] Optimistic updates — UI responds instantly, server call is async
- [ ] No duplicate `WatchlistContext` created
- [ ] `e.stopPropagation()` on star click so it doesn't open the detail drawer

---

## Issue 5 of 6 — GLO-40/17
### Price alerts — FE management view (list, toggle, delete) + inline form polish

**What exists from Cycle 3:**
- `AlertsContext.jsx` — `useAlerts()`, `checkAlerts()`, `createAlert()`, `deleteAlert()`, `toggleAlert()`, `deactivateAlert()`
- `AlertToast.jsx` — fixed bottom-right, `var(--c-error)`, 5s auto-dismiss
- `AssetDetailDrawer.jsx` — "Set Alert" inline form
- `GlobalMarketsTerminal.jsx` — `checkAlerts(merged)` called in existing polling cycle

**What's needed:** A dedicated alerts management view where users can see all their alerts, toggle them on/off, and delete them. Also polish the "Set Alert" form in the drawer if needed.

---

### Step 0 — Read-Only Audit

```bash
# Read AlertsContext in full
cat -n src/context/AlertsContext.jsx

# Read the "Set Alert" form in the drawer
grep -n 'alert\|Alert\|setAlert\|createAlert' src/components/AssetDetailDrawer.jsx

# Check if an alerts view/page already exists
grep -rn 'AlertsPage\|alerts-page\|/alerts\|ManageAlerts' src/ --include="*.jsx" -l
ls src/pages/ 2>/dev/null

# Check App.jsx for any existing /alerts route
grep -n 'alerts\|Alerts' src/App.jsx
```

Report: Does an alerts management view already exist anywhere? What does the current "Set Alert" form look like in the drawer?

---

### Step 1 — Alerts management panel (inline, not a new page)

Rather than a new page route, add an "Alerts" section to the existing user experience — either:

**Option A (preferred):** A collapsible "My Alerts" panel within `GlobalMarketsTerminal.jsx`, rendered below the group nav or in a side panel. Visible only to authenticated users. Shows all alerts from `useAlerts()`.

**Option B:** A dedicated `/app/alerts` route added to `App.jsx`. Only if the layout cannot accommodate an inline panel cleanly.

**Discuss the tradeoff in your Gate B proposal** before implementing. Default to Option A unless there's a strong layout reason for Option B.

---

### Step 2 — Alerts list UI

For each alert in `alerts` (from `useAlerts()`):

```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: '1px solid var(--c-border)',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
}}>
  <span style={{ color: 'var(--c-text-1)' }}>{alert.symbol}</span>
  <span style={{ color: 'var(--c-text-2)' }}>
    {alert.condition === 'above' ? '↑' : '↓'} {alert.threshold}
  </span>
  <span style={{
    color: alert.active ? 'var(--c-accent-data)' : 'var(--c-text-3)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }}>
    {alert.active ? 'Active' : 'Triggered'}
  </span>
  <button onClick={() => toggleAlert(alert.id, !alert.active)} style={{ /* minimal */ }}>
    {alert.active ? 'Pause' : 'Re-arm'}
  </button>
  <button onClick={() => deleteAlert(alert.id)} style={{ color: 'var(--c-error)', /* minimal */ }}>
    ×
  </button>
</div>
```

If `alerts` is empty, show: `"No alerts set — open any asset and set a price trigger."`

---

### Step 3 — Polish "Set Alert" form in AssetDetailDrawer

Read the existing form. Ensure:

- `condition` toggle (above / below) is clearly styled with `var(--c-accent)` on selected state
- `threshold` input uses `var(--radius-input)` border radius, JetBrains Mono, `tabular-nums`
- Submit button uses `var(--c-accent)` background
- Error state (e.g., invalid threshold) uses `var(--c-error)`
- No `var(--c-accent-br)` or gold anywhere — this is a global terminal feature, not Clube

---

### Done Criteria — GLO-40/17

- [ ] Alerts management view is accessible (inline panel or route) showing all user alerts
- [ ] Each alert row shows: symbol, direction (above/below), threshold, active/triggered status
- [ ] Toggle (pause / re-arm) calls `toggleAlert()` from context — no direct fetch
- [ ] Delete calls `deleteAlert()` — optimistic if possible
- [ ] Empty state is helpful, not blank
- [ ] "Set Alert" form in drawer is visually polished with correct tokens
- [ ] No second AlertsContext or second polling timer created
- [ ] No gold/`--c-accent-br` in this feature — global terminal only

---

## Issue 6 of 6 — GLO-26/45
### Clube profile setup — FE form + backend audit

**This is the longest issue. Do it last and give it its own dedicated session.**

**What's known:**
- `clubes` table already has `nome`, `data_constituicao`, `benchmark_ibov`, `benchmark_cdi`
- `server/routes/clubes.js` is 2060 lines with ~40+ existing endpoints — profile endpoints may already exist
- `src/clube/` is isolated with gold brand, `ClubeShell`, `data-context="brazil"`
- This form is shown to `club_manager` on their first visit to `/clubes` if no club profile exists yet

---

### Step 0 — Read-Only Audit (Non-Negotiable — Do Not Skip)

```bash
# Scan clubes.js for any existing profile/setup endpoints
grep -n 'profile\|setup\|club_name\|nome\|data_constituicao\|benchmark\|inception' server/routes/clubes.js

# Count total route handlers to understand scope
grep -n "router\.\(get\|post\|put\|patch\|delete\)" server/routes/clubes.js | wc -l

# Check what Clube FE pages/components exist
ls src/clube/
grep -rn 'profile\|Profile\|setup\|Setup\|ClubeHome\|ClubeDashboard' src/clube/ --include="*.jsx" -l 2>/dev/null

# Check the Clube routing in App.jsx
grep -n 'clube\|Clube\|/clubes' src/App.jsx
```

**GATE B REQUIRED HERE.** After Step 0, report findings and propose before writing any code:

- Do GET/PATCH endpoints for club profile already exist in `clubes.js`?
- What FE pages exist under `src/clube/`?
- What does the current `/clubes` landing experience look like for a `club_manager`?
- What is the minimal scope of work actually needed?

Do not proceed to Step 1 without explicit confirmation.

---

### Step 1 — Backend (only if profile endpoints don't exist)

If `clubes.js` does NOT have a `GET /clubes/:id` or `PATCH /clubes/:id` for profile data:

Add minimal endpoints following the existing patterns in `clubes.js`:

```js
// GET /api/v1/clubes/:id — return club profile
router.get('/:id', authenticate, async (req, res) => {
  // Fetch from `clubes` table via Supabase
  // Return: id, nome, data_constituicao, benchmark_ibov, benchmark_cdi
})

// PATCH /api/v1/clubes/:id — update club profile (manager or admin only)
router.patch('/:id', authenticate, requireRole('club_manager'), async (req, res) => {
  // Validate: nome required, data_constituicao valid date, benchmarks boolean flags
  // Update `clubes` table
})
```

**If profile endpoints already exist, skip this step entirely.**

---

### Step 2 — Clube profile FE form

In `src/clube/`, create `ClubeProfileSetup.jsx` (or similar — check what name fits the existing file convention). This is the first-time setup form shown to a `club_manager` when the club has no `nome` yet.

Fields:
- **Nome do Clube** — text input, required
- **Data de Constituição** — date input (Brazilian format: DD/MM/YYYY)
- **Benchmark** — radio or segmented control: "IBOVESPA" / "CDI" / "Ambos"
- Save button — calls PATCH endpoint

Styling:
- `data-context="brazil"` on the root wrapper (or rely on ClubeShell's wrapper)
- Gold (`var(--c-accent-br)`) for the save button and active states
- JetBrains Mono for input values, IBM Plex Sans for labels
- `var(--radius-input)` on all inputs
- `var(--c-error)` for validation errors

---

### Step 3 — Show profile setup on first visit

In the Clube landing (whatever renders at `/clubes` for a `club_manager`), check if the club profile is complete. If `clube.nome` is null/empty, render `ClubeProfileSetup` instead of the dashboard.

```jsx
if (!clube?.nome) {
  return <ClubeProfileSetup clubeId={clube.id} onComplete={() => refetchClube()} />
}
```

This is a conditional render — no redirect, no new route.

---

### Done Criteria — GLO-26/45

- [ ] Step 0 audit completed and Gate B proposal submitted before any code written
- [ ] Profile data (nome, data_constituicao, benchmark) can be saved and retrieved
- [ ] `ClubeProfileSetup` form renders for `club_manager` when club has no nome
- [ ] After saving, the form is replaced by the main Clube dashboard
- [ ] Gold brand throughout — `var(--c-accent-br)`, no blue in this component
- [ ] No duplication of existing clubes.js endpoints
- [ ] `grep -r 'ClubeProfileSetup' src/` shows the component before creating it — confirm no duplicate

---

## End-of-Cycle Verification Checklist

Before opening the Cycle 4 PR, run all of these:

```bash
# 1. No hardcoded hex colors remaining (outside index.css token definitions)
grep -rn '#FF5252\|#3b82f6\|#2563eb\|#00C8FF\|#F5C518' src/ --include="*.jsx" --include="*.js"

# 2. No DM Sans remaining
grep -rn 'DM.Sans\|DM+Sans' src/ index.html

# 3. data-context="brazil" is on BrazilTerminal
grep -n 'data-context' src/BrazilTerminal.jsx

# 4. promote-manager endpoint is called somewhere in UserManager
grep -n 'promote-manager' src/components/admin/UserManager.jsx

# 5. No second AlertsContext or WatchlistContext
grep -rn 'createContext' src/ --include="*.jsx" | grep -i 'alert\|watchlist'

# 6. No new setInterval for alerts polling
grep -rn 'setInterval' src/ --include="*.jsx"

# 7. All React hooks before early returns in new files
# (Manual check — read each new file and confirm)

# 8. Build passes
npm run build
```

Report the chunk count and any errors. Expected: ~49–52 chunks (Cycle 4 may add a few if new lazy-loaded pages are created).

---

## Carry-Forward Notes for Cycle 5

- **GLO-18 (Density mode)** — moved to Cycle 5. Needs design spec before implementation. Three modes: compact / comfortable / spacious. CSS variable `--density-scale` approach recommended. Store preference in `localStorage`.
- **GLO-26/45 partial** — if the Clube profile setup is not fully complete in Cycle 4, carry the FE form to Cycle 5. Do not force it — a partial implementation is worse than a clean carry.
- **Cycle 5 blocking prereq** — before GLO-47 (member invite BE), decide on invite-link-only flow (no email service exists). Signed token + URL copy is the correct path.

---

*Cycle 4 is 6 issues. Three of them (GLO-20, GLO-21, GLO-50) are well-bounded — audit-audit-ship. Two (GLO-38, GLO-40) are polish sprints on top of existing infrastructure. One (GLO-26/45) requires a full Gate B before touching code. Follow the order. Trust the audit.*
