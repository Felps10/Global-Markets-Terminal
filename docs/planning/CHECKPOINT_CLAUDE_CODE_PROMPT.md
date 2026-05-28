# GMT — Checkpoint Prompt for Claude Code
> Purpose: Codebase audit of Cycles 1–3 execution + full Cycles 4–9 roadmap review
> Date: 2026-04-05 | After: 3 complete sprints | Before: Cycle 4 starts
> This prompt contains NO code changes. It is a read-only audit + strategic review session.

---

## What This Prompt Is Asking You To Do

Three sprint cycles have been executed. Before Cycle 4 begins, you need to:

1. **Verify** that every file described in the Cycles 1–3 execution record actually exists and contains the described implementation (not just that it was created — that the logic is correct)
2. **Audit** Cycle 4's issue list for items that were already completed in prior cycles, so they can be closed rather than rebuilt
3. **Review** the full Cycles 4–9 roadmap and surface any sequencing risks, dependency problems, or architectural concerns — particularly in the Clube GMT core loop (Cycles 5–8), which is the most complex work ahead
4. **Identify** any technical debt or fragility introduced in Cycles 1–3 that could compound in later cycles
5. **Produce** a structured findings report with explicit recommendations

**This is a read-only session.** Do not write any code, create any files, or make any changes. Every action in this prompt is a `Read`, `Grep`, or `Glob`. The output is a written findings report.

---

## Standing Rules (Apply To All GMT Work)

Before doing anything else, internalize these. They are non-negotiable.

1. **Inline styles only.** `style={{ ... }}` everywhere. Never `className`, never Tailwind, never styled-components. The ONE exception is density mode classes on the root layout shell (not yet built).
2. **Color system — three intentionally different tokens:**
   - `--c-accent: #3b82f6` — interactive UI (buttons, focus rings, links) in global terminal and logged-out pages
   - `--c-accent-data: #00C8FF` — live market data ink (sparklines, prices, live dots). NOT for UI chrome.
   - `--c-accent-br: #F5C518` — Brazil/Clube gold. Auto-applied via `[data-context="brazil"]`. Never in global components.
   - `--c-error: #FF5252` — error/danger. Never hardcoded — always `var(--c-error)`.
3. **Hooks before early returns.** Every `useState`, `useEffect`, `useMemo` must appear before any `if (!x) return null`.
4. **Audit first, always.** Read every file that will be touched. Run `grep` before creating anything new. Dead code and duplicate implementations are a recurring risk.
5. **Gate protocol:** Gate B = propose changes → explicit "yes" → write on new branch. Gate C = PR only, never auto-merge, never commit to `main`.
6. **`src/clube/` is isolated.** Its own brand, own shell, own routes. Never mix with global terminal components.
7. **ES modules only.** `import/export` throughout. No `require()` anywhere.
8. **`server/routes/clubes.js` is 2060 lines.** Always read the full file before adding any Clube backend code. Duplication risk is high.
9. **`fmpBatchProfile()` is intentionally sequential.** Never parallelize — the 1s throttle prevents FMP 429 errors.
10. **`Promise.allSettled` (not `Promise.all`) for FRED.** Tolerates partial failures. `Promise.all` would blank the macro panel on any one failure.

---

## Step 0 — Codebase Audit of Cycles 1–3

Read these files in order. For each, verify the described implementation exists. Flag any discrepancy between this record and what you find. Do not infer — read the actual file.

### Cycle 1 — Performance Sprint

**GLO-74: `Promise.allSettled` for FRED macro fetches**
- Read `src/dataServices.js`
- Verify: `fredAllMacro()` uses `Promise.allSettled`, not `Promise.all`
- Verify: `fmpBatchProfile()` remains sequential (NOT parallelized) — look for the 1-second throttle or `for...of` loop

**GLO-72: React.lazy() + Suspense**
- Read `src/App.jsx`
- Verify: at least 20+ page components are wrapped in `React.lazy()`
- Verify: every lazy component is wrapped in a `<Suspense>` boundary with a fallback

**GLO-76: Debounced localStorage in quotaTracker.js**
- Read `src/services/quotaTracker.js`
- Verify: writes to `localStorage` are debounced (not direct on every call)
- Verify: reads do NOT hit `localStorage.getItem` during the polling cycle

**GLO-73: `@tanstack/react-virtual` virtualization**
- Read `src/components/AssetListView.jsx`
- Verify: `useVirtualizer` (or equivalent from `@tanstack/react-virtual`) is imported and used
- Verify: spacer `<tr>` elements are used to maintain scroll position (not a different approach)
- Verify: visible DOM nodes are approximately 15–20 at any scroll depth (check the `overscan` or equivalent config)

**GLO-22: SELIC/CDI macro banner design tokens**
- Grep for `rgba(21,101,192` in `src/` — should appear in the macro banner component only
- Verify it uses `#3b82f6` values (NOT `#00C8FF` which is market data ink)
- Verify `tabular-nums` and `8px` radius are present

### Cycle 2 — Auth UX + Design Polish

**GLO-9: `--c-error` tokenization**
- Grep for `#FF5252` in `src/` — should return zero matches outside of `index.css` token definitions
- Grep for `var(--c-error)` — should appear in error state components
- Grep for `--c-error-dim` in `src/index.css` — should exist as a token

**GLO-7: DM Sans → IBM Plex Sans migration**
- Grep for `DM Sans` or `DM_Sans` in `src/` — should return zero matches
- Read `src/index.css` lines near the `@import` — verify IBM Plex Sans is imported, DM Sans is not
- Read `index.html` — verify no DM Sans `<link>` tag remains

**GLO-14: Role-based post-login redirect**
- Read `src/pages/LoginPage.jsx` — verify admin→`/admin`, club roles→`/clubes`, user→`/app/global`
- Read `src/pages/LandingPage.jsx` — verify auth state redirect is wired
- Read `src/components/ProtectedRoute.jsx` — verify authenticated users are redirected away from `/login`

**GLO-37 + GLO-15: Silent promotion BE + FE**
- Read `server/routes/users.js` — verify role PATCH sets `notification_pending: true` in `user_metadata`
- Check if `src/components/RolePromotionModal.jsx` exists
- Read `src/context/AuthContext.jsx` — verify it reads `notification_pending` on session load, shows modal, and clears flag on dismiss
- Verify the modal uses `var(--c-accent)` (blue), NOT gold — this is a global terminal component

**GLO-10: Radius tokens**
- Read `src/index.css` — verify `--radius-sm`, `--radius-input`, `--radius-card`, `--radius-lg` are defined in both theme selectors (light + dark, or the main `:root` block)
- Confirm the commit message or surrounding context shows these are additive tokens (no mass-replacement of existing `borderRadius` values)

**GLO-8: Accent hex sweep**
- Grep for `#3b82f6` in `src/` — should return only intentional uses (buttons, links, focus rings in global terminal)
- Grep for `#2563eb` similarly
- Confirm GLO-85 (Brazil blue anomaly) was tracked and carried into Cycle 3

### Cycle 3 — New Feature Primitives

**GLO-85: BrazilTerminal.jsx blue → gold**
- Read `src/BrazilTerminal.jsx` lines 120–170
- Verify: no `#3b82f6` appears at lines 128 or 158 (or wherever blue was flagged in Cycle 2)
- Verify: the replacement color is `#F5C518` or `var(--c-accent-br)`

**GLO-41: Price alerts — full stack**
- Check if `server/migrations/009_price_alerts.sql` exists
- Read it — verify: `price_alerts` table with `id`, `user_id`, `symbol`, `condition` (CHECK IN 'above','below'), `threshold`, `active`, `triggered_at`, `created_at`; indexes on `user_id` and `active WHERE active = true`; RLS enabled; policy scoped to `auth.uid() = user_id`
- Check if `server/routes/alerts.js` exists — verify 4 endpoints: GET, POST, PATCH, DELETE at `/api/v1/alerts`
- Check if `src/context/AlertsContext.jsx` exists — verify `useAlerts()` is exported and `checkAlerts()` is exposed
- Check if `src/components/AlertToast.jsx` exists — verify it uses `var(--c-error)`, fixed bottom-right position, auto-dismiss (~5s)
- Read `src/GlobalMarketsTerminal.jsx` — verify `checkAlerts(merged)` is called after every price data merge (inside the polling cycle, not in a separate timer)
- Read `src/components/AssetDetailDrawer.jsx` — verify "Set Alert" inline form is present
- Read `server/index.js` — verify alerts router is mounted
- Read `src/main.jsx` — verify `AlertsProvider` wraps the app
- Read `src/App.jsx` — verify `<AlertToast />` is rendered at root

**GLO-32: promote-manager endpoint**
- Read `server/routes/users.js`
- Verify `POST /users/:id/promote-manager` exists, is admin-only, enforces single-manager constraint (409 if manager exists), sets `notification_pending: true`

**GLO-33: Admin UserManager polish**
- Check if `src/components/admin/UserManager.jsx` exists
- Read it — verify role badges are present with color mapping, IBM Plex Sans is used, inline styles only, no `className`

---

## Known Anomalies — Investigate These First

These were identified during the checkpoint Linear audit. For each, verify codebase reality and report what you find.

### Anomaly 1: GLO-34 and GLO-36 — Likely Already Done in Cycle 2

**GLO-34:** "[FE] Role-based post-login redirect" — This is listed as a Cycle 4 open issue in Linear. However, role-based redirect was implemented in Cycle 2 as part of GLO-14. The implementation touched `LoginPage.jsx`, `RegisterPage.jsx`, `LandingPage.jsx`, and `ProtectedRoute.jsx`.

**Your task:** Read those 4 files. Determine if role-based post-login redirect is fully implemented. If yes, confirm GLO-34 should be closed as Done. If partially done, note exactly what's missing.

**GLO-36:** "[FE] Silent role promotion notification" — Also listed open in Cycle 4. The promotion modal was built in Cycle 2 as GLO-15, implementing `RolePromotionModal.jsx` and the `notification_pending` flag flow in `AuthContext.jsx`.

**Your task:** Check if `RolePromotionModal.jsx` exists. Read `AuthContext.jsx`. Determine if the notification flow is complete. If yes, GLO-36 should be closed as Done.

### Anomaly 2: GLO-39 — Watchlist BE Listed as Open

**GLO-39:** "[BE] Watchlist backend" — Listed as an open Todo issue in Linear. However, `server/routes/watchlist.js` is documented as already existing (74 lines, CRUD scoped per user, pre-cycle work).

**Your task:** Check if `server/routes/watchlist.js` exists. Read it. Verify it has full CRUD (GET, POST, PATCH/PUT, DELETE) scoped by user. If fully implemented, GLO-39 is Done and should be closed. Report what you find.

### Anomaly 3: GLO-50 — May Overlap With Cycle 3 Polish

**GLO-50:** "[FE] Admin promote to club_manager — confirm dialog + toast" — Cycle 4 issue. The backend endpoint (`POST /users/:id/promote-manager`) was built in Cycle 3 as GLO-32. GLO-33 also polished the UserManager UI. The FE promote action (confirm dialog + toast) may already be wired up.

**Your task:** Read `src/components/admin/UserManager.jsx`. Look for: a button or action that calls `/users/:id/promote-manager`, a confirmation dialog, and a toast on success. Report what exists and what's missing.

### Anomaly 4: GLO-19 — Cycle 1 Straggler, Still Open

**GLO-19:** "Asset detail drawer polish" — Was planned for Cycle 1, never completed. `AssetDetailDrawer.jsx` was modified in Cycle 3 to add the "Set Alert" form. The drawer may now look inconsistent (old styles mixed with new Cycle 3 additions).

**Your task:** Read `src/components/AssetDetailDrawer.jsx`. Assess:
- Are there any hardcoded hex colors that should be tokens?
- Is the font IBM Plex Sans throughout?
- Does the "Set Alert" form visually match the drawer's design?
- Is there any DM Sans remaining?
Report findings so GLO-19 can be properly scoped for Cycle 4 or Cycle 5.

### Anomaly 5: GLO-53 — Potential Overlap With GLO-50

**GLO-50** (Cycle 4): FE confirm dialog for admin promoting to club_manager
**GLO-53** (Cycle 5): FE promote to club_manager confirmation flow

These may be the same thing, or GLO-53 may be the member's perspective (notification/modal on the member side). Confirm what's already in `RolePromotionModal.jsx` and what GLO-53 could be adding that's genuinely new.

---

## Cycles 4–9 Roadmap — Full Issue List

### Cycle 4 — Apr 27 – May 4 | "User-Facing Feature Surface" (ACTIVE)

| # | ID | Title | Status | Priority | Risk |
|---|---|---|---|---|---|
| 1 | GLO-34 | [FE] Role-based post-login redirect | Open (audit — likely Done) | High | May be Done in C2 |
| 2 | GLO-36 | [FE] Silent role promotion notification | Open (audit — likely Done) | Medium | May be Done in C2 |
| 3 | GLO-50 | [FE] Admin promote to club_manager — confirm dialog + toast | Open | High | Audit UserManager.jsx first |
| 4 | GLO-38/16 | [FE] Watchlist — star/pin UI, nav group, optimistic updates | Open | Urgent | Backend done; FE context exists |
| 5 | GLO-40/17 | [FE] Price alerts — management view + in-app notification polish | Open | High | Context + Toast exist from C3 |
| 6 | GLO-20 | Apply yellow accent to Brazil terminal route wrapper | Open | High | `data-context="brazil"` already in CSS |
| 7 | GLO-21 | Brazil terminal nav tab — yellow active state indicator | Open | High | Depends on GLO-20 |
| 8 | GLO-26/45 | Clube profile setup — FE form + BE audit | Open | High | Carried from C3; audit clubes.js (2060 lines) first |
| 9 | GLO-18 | Density mode toggle — compact / comfortable / spacious | Open | Medium | New UX feature; scope carefully |

**Sequencing notes for Cycle 4:**
- Start with the audit items (GLO-34, GLO-36, GLO-39) — close them if done, this reduces the sprint load immediately
- GLO-20 must precede GLO-21
- GLO-38 and GLO-40 can proceed in parallel (independent FE concerns)
- GLO-26/45 requires full audit of `clubes.js` before writing anything — do this last or in its own dedicated session

---

### Cycle 5 — May 4–11 | "Clube Core Loop — Setup + Invite"

| # | ID | Title | Priority | Note |
|---|---|---|---|---|
| 1 | GLO-54 | [Parent] Manager Dashboard | — | Parent issue for GLO-56 |
| 2 | GLO-56 | [BE] Manager Dashboard data API | High | Manager-only endpoints; audit clubes.js first |
| 3 | GLO-23 | Clube tab — club-aware navigation for members | High | Shows only to `club_member` and above |
| 4 | GLO-53 | [FE] Promote to club_manager — member confirmation | Medium | May overlap with GLO-50/RolePromotionModal |
| 5 | GLO-27 | [Parent] Member invite system | — | Parent issue for GLO-47 + GLO-46 |
| 6 | GLO-47 | [BE] Member invite — invite token + email flow | High | No email service yet — scope carefully |
| 7 | GLO-46 | [FE] Member invite — form + status UI | High | Depends on GLO-47 |
| 8 | GLO-44 | Clube profile FE — display name, inception date, benchmark | High | Depends on GLO-26/45 from Cycle 4 |

**Architectural concern for Cycle 5:**
GLO-47 (member invite BE) requires an email delivery mechanism. GMT has no email service configured yet (no SendGrid, SES, Resend, or similar). Options:
- **Invite link flow** — generate a signed token, store in Supabase, send URL out-of-band (manager copies link). No email service needed.
- **Email service** — adds infra dependency. Not recommended for this cycle.
Report which approach `clubes.js` currently implements (if any) and recommend the safer path.

---

### Cycle 6 — May 11–18 | "Clube Core Loop — NAV + Dashboard"

| # | ID | Title | Priority | Note |
|---|---|---|---|---|
| 1 | GLO-55 | [FE] Manager Dashboard — metrics, performance chart | High | Depends on GLO-56 from Cycle 5 |
| 2 | GLO-25 | [Parent] NAV modal | — | Parent issue for GLO-43 + GLO-42 |
| 3 | GLO-43 | [BE] NAV entry — cotização recording | High | Core Clube data model |
| 4 | GLO-42 | [FE] NAV entry modal — weekly cotização input form | High | Depends on GLO-43 |
| 5 | GLO-24 | NAV dashboard — member-facing performance view | High | Depends on GLO-42/43 |

**Data model concern:** The cotização (NAV entry) is the most critical data model in Clube. Before building GLO-43, verify that `clubes.js` (or a related migration) already has a `cotas` or `cotizacoes` table defined. If not, a new migration is needed first — this should be a prerequisite step in the Cycle 6 prompt.

---

### Cycle 7 — May 18–25 | "Clube Intelligence — Views + AI"

| # | ID | Title | Priority | Note |
|---|---|---|---|---|
| 1 | GLO-66 | [Parent] Cotista/Gestor view separation | — | Parent for GLO-60 |
| 2 | GLO-60 | [BE] Role-differentiated data endpoints for Cotista vs Gestor | High | Gestor sees everything; Cotista sees summary |
| 3 | GLO-28 | AI reports in Portuguese — monthly club performance narrative | High | Requires OpenAI or similar API key |
| 4 | GLO-29 | [Parent] PDF export | — | Parent for GLO-48 |
| 5 | GLO-48 | [BE] PDF export — report generation | High | `puppeteer` or similar; Railway memory constraint |

**AI dependency concern:** GLO-28 requires an LLM API. Verify whether `OPENAI_API_KEY` or similar is in the Railway environment. If not, this feature cannot be built without first provisioning the API key and testing the Railway integration. Surface this as a blocking prerequisite.

**PDF concern:** GLO-48 using `puppeteer` may exceed Railway's container memory (puppeteer = ~200MB+ headless Chrome). Consider `pdfkit` or `jsPDF` on the FE as an alternative. Report the tradeoff.

---

### Cycle 8 — May 25 – Jun 1 | "Clube Intelligence — Advanced Features"

| # | ID | Title | Priority | Note |
|---|---|---|---|---|
| 1 | GLO-67 | [FE] Cotista/Gestor differentiated view | High | Depends on GLO-60 from Cycle 7 |
| 2 | GLO-68 | [Parent] Risco panel | — | Parent for GLO-59 |
| 3 | GLO-59 | [BE] Risco panel — drawdown gauge, VaR, volatility | High | Complex calculation backend |
| 4 | GLO-52 | [BE] Fila de Operações — queued trade log | Medium | Clube operational feature |
| 5 | GLO-57 | [BE] Próximos Prazos — calendar of deadlines/obligations | Medium | CVM compliance calendar |
| 6 | GLO-58 | [BE] AI PDF — report PDF generation backend | High | Depends on GLO-48 from Cycle 7 |
| 7 | GLO-61 | [BE] AI report generation endpoint | High | Depends on GLO-28 from Cycle 7 |
| 8 | GLO-63 | [BE] AI report storage + history | Medium | Supabase table needed |

**Calculation concern:** GLO-59 (Risco panel) requires drawdown gauge, VaR (Value at Risk), and volatility. These are non-trivial financial calculations. Before building, confirm:
- What price history is available in Supabase? (The `market_snapshot` table captures daily snapshots — is this sufficient for 30/60/90-day rolling calculations?)
- VaR requires a full return series. If daily snapshots only go back a few weeks, VaR will be statistically meaningless.
Surface the data availability concern before committing to the full Risco panel scope.

---

### Cycle 9 — Jun 1–8 | "Clube Intelligence — FE Completion"

| # | ID | Title | Priority | Note |
|---|---|---|---|---|
| 1 | GLO-65 | [FE] Fila de Operações — trade queue UI | Medium | Depends on GLO-52 from Cycle 8 |
| 2 | GLO-64 | [FE] Próximos Prazos — calendar UI | Medium | Depends on GLO-57 from Cycle 8 |
| 3 | GLO-62 | [FE] AI report + PDF — member-facing view | High | Depends on GLO-58+63 from Cycle 8 |

---

## Audit Tasks — What To Investigate and Report

After completing Step 0 (file-by-file verification) and the anomaly investigation, produce findings on each of these questions:

### Section A — Cycles 1–3 Execution Integrity

1. **Do all described new files exist?** List any that are missing.
2. **Does the price alerts implementation have any gaps?** Pay close attention to:
   - Is `checkAlerts()` integrated into the existing polling cycle (not a new `setInterval`)?
   - Do triggered alerts deactivate themselves (no re-triggering)?
   - Is the RLS policy correctly scoped to `auth.uid() = user_id`?
3. **Is there any hardcoded hex remaining?** Run: `grep -rn '#FF5252\|#3b82f6\|#2563eb\|#00C8FF\|#F5C518\|#C5A059\|#D4B06A' src/ --include="*.jsx" --include="*.js" --include="*.css"`. Report what you find and whether each occurrence is intentional (token definition) or a violation.
4. **Are there any React hooks placed after early returns?** Run: `grep -rn 'return null\|return <' src/ --include="*.jsx" -l` and check the top-suspect files.
5. **Is the build still green?** (If you can run `npm run build` — report the chunk count and any errors. If not possible in this session, note it as a required verification step before Cycle 4 starts.)

### Section B — Cycle 4 Readiness

6. **GLO-34:** Is role-based post-login redirect fully implemented? Which file, which lines? Close or scope the remaining work.
7. **GLO-36:** Is the silent promotion notification flow (`RolePromotionModal.jsx` + `notification_pending` in `AuthContext`) fully implemented? Close or scope.
8. **GLO-39:** Does `server/routes/watchlist.js` exist with full CRUD? Close the issue.
9. **GLO-50:** Does `UserManager.jsx` already have a promote action wired to `POST /users/:id/promote-manager`? What's missing?
10. **GLO-20/21:** Is `data-context="brazil"` already applied to the Brazil route wrapper? Or does GLO-20 genuinely need to add it?
11. **GLO-26/45 (Clube profile):** Scan `server/routes/clubes.js` for any existing profile GET/POST/PUT endpoints (search for `profile`, `setup`, `club_name`, `inception`, `benchmark`). Report what exists.

### Section C — Cycles 5–9 Architectural Concerns

12. **Member invite (GLO-47):** What email infrastructure, if any, is currently configured? Check `server/` for any SendGrid, Resend, nodemailer, or similar import. Recommend the invite-link-only approach if no email service exists.
13. **NAV / cotização data model (GLO-43):** Scan `server/migrations/` for any table related to `cotas`, `cotizacoes`, `nav`, or `entries`. If it doesn't exist, Cycle 6 needs a migration step added before GLO-43.
14. **AI reports (GLO-28):** Check `server/` for any OpenAI or Anthropic API client import. Is there an API key reference? If not, flag as a blocking prerequisite.
15. **PDF export (GLO-48):** Check `package.json` for `puppeteer`, `pdfkit`, `jspdf`, or similar. If absent, recommend the approach and note Railway's memory constraints.
16. **`market_snapshot` history (GLO-59):** Read `server/migrations/` for the snapshot table. How many rows are expected? Does the schema store enough historical data for drawdown and VaR calculations? (Minimum: 60 daily snapshots for 3-month VaR.)
17. **`clubes.js` scope:** Do a quick structure scan — how many route handlers exist? What are the main endpoint groups? This sets the baseline for all Clube backend work in Cycles 5–8.

### Section D — Technical Debt from Cycles 1–3

18. **`--c-error` adoption:** `--c-error` was tokenized in Cycle 2. But radius tokens (`--radius-sm`, etc.) were defined as additive — not yet replacing existing `borderRadius` values. Is there a plan to migrate existing hardcoded radius values, or will this accumulate permanently?
19. **`AssetDetailDrawer.jsx` consistency:** With the Cycle 3 "Set Alert" form added, is the drawer's visual language consistent? Or does the alert form look like a different design era from the rest of the drawer?
20. **GLO-19 (open straggler):** Based on reading `AssetDetailDrawer.jsx`, provide a concrete scope of what "Asset detail drawer polish" would actually require in terms of specific changes.

---

## Expected Output Format

Structure your findings as follows:

```
## CHECKPOINT FINDINGS — GMT Codebase Audit (2026-04-05)

### ✅ Confirmed — Cycles 1–3 Implementation
[List each verified item with file + line confirmation]

### ⚠️ Anomalies Found
[Each anomaly from the investigation section — what you found vs. what was expected]

### 🔴 Issues to Close Immediately
[Issues confirmed Done in prior cycles — list with reason]

### 🟡 Cycle 4 — Issues Needing Scope Clarification
[Items where the audit found partial implementation or changed scope]

### 🔵 Cycle 4 Sequencing Recommendation
[Suggested execution order given what you found]

### 🏗️ Cycles 5–9 Architectural Risks
[Numbered list of concerns, each with: risk, impact, recommended mitigation]

### 🧹 Technical Debt Register (Post C1–C3)
[Items to address before they compound]

### 📋 Recommended Changes to Cycle Plan
[Any issues to move, split, close, or add based on audit findings]
```

---

## What Success Looks Like

After this prompt, the following should be true:

1. Every file from Cycles 1–3 is verified to exist and match the described implementation — or the gaps are explicitly named
2. GLO-34, GLO-36, GLO-39 are either confirmed Done (and can be closed in Linear) or their remaining scope is precisely defined
3. The Clube backend in `clubes.js` is mapped — we know what's already there before Cycles 5–8 begin building on top of it
4. Every external dependency needed for Cycles 5–9 (email, AI, PDF, historical snapshot data) is either confirmed available or flagged as a prerequisite to resolve before that cycle starts
5. A sequencing recommendation for Cycle 4 is produced, taking into account what auditing revealed

---

*This is a read-only checkpoint. No code changes. Output only. After review, the Cycle 4 prompt will be written with full knowledge of what's actually in the codebase.*
