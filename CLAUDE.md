# CLAUDE.md — GMT Global Markets Terminal

Project-level standing brief. Read this before every session. Complements the
parent workspace CLAUDE.md (life/scheduling context) — this file is purely technical.

---

## What this project is

GMT is a real-time financial data platform built by a solo developer (Felipe).
Two products share one repo:
- **GMT Terminal** — global and Brazil market intelligence dashboard (`src/`)
- **Clube GMT** — Brazilian investment club (clube de investimento) management (`src/clube/`)

---

## Non-negotiable technical constraints

- **Plain JavaScript only** — no TypeScript, ever
- **Inline styles for all layout/color/spacing** — use inline style objects, not CSS
  classes or new styled-components. Legacy styled-components exist (package is still
  installed) — do not add more. `className` is permitted only for CSS animations
  (`fade-in`, `gmt-section-reveal`, `gmt-group-card`, `gmt-blink`) and print media
  queries (`no-print`) defined in global stylesheets.
- **ES modules throughout** — backend uses `import/export`, never `require()`.
  `"type": "module"` is set in package.json.
- **React 18 + Vite 6 + Express 4 + Supabase (Postgres) + Railway (backend) + Vercel (frontend)**
- **lightweight-charts v5** — uses `addSeries(SeriesDefinition, opts)`.
  Never use v4's `addCandlestickSeries()` — it does not exist in v5
- **Color system:**
  - Gold (`#C5A059`, `#D4B06A`) — Brazil Terminal and Clube GMT only
  - Blue (`#3b82f6`, `#2563eb`) — Global Terminal and all logged-out pages
  - Never use gold on global terminal UI or logged-out pages

---

## Architecture — how data actually flows

This is the most important section. Misunderstanding this causes the most damage.

**The browser never calls Supabase PostgREST directly.**
`supabase.*` in `src/` is used exclusively for auth session management:
- `supabase.auth.getSession()`
- `supabase.auth.onAuthStateChange()`
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signOut()`

Zero `supabase.from()` calls exist in `src/`. If you find yourself writing one, stop — route it through Express instead.

**All data goes through Express:**
`fetch('/api/v1/...')` with `Authorization: Bearer <token>` header.
Token is retrieved from `supabase.auth.getSession()` via `getToken()` in
`AuthContext.jsx` — never from localStorage.

**Server-side Supabase client:**
`server/db.js` uses `SUPABASE_SERVICE_ROLE_KEY` with `persistSession: false`.
Service role bypasses RLS by design — this is correct and intentional.
Never use the service role key in any file under `src/`.

**`VITE_SUPABASE_ANON_KEY`:**
Public and intentionally in the browser bundle. Auth session only.
`src/lib/supabase.js` creates the client with `persistSession: false` and
`autoRefreshToken: false`. Never use it to query data tables.

**Taxonomy data flow:**
`TaxonomyContext` fetches via `fetchTaxonomy()` and `fetchTaxonomyTree()` from
`src/services/taxonomyService.js` → Express `/api/v1/taxonomy` → Supabase (service role).
`brazilBlocks.js` is static UI config for filter layout only — it is not a data source.
Never edit `brazilBlocks.js` expecting it to affect what data loads.

**Snapshot cron:**
`scripts/captureSnapshot.js` runs on Railway and writes to `market_snapshot`
using service role. The public `GET /api/v1/snapshot` endpoint serves this data
to unauthenticated landing page visitors.

**External API proxies:**
In dev, Vite proxies `/proxy/*` paths directly to external APIs.
In production, Express proxies them — all `/proxy/*` routes require `authenticate`
middleware except `/api/yahoo` (used by the capture script, no Bearer token).

---

## Database rules — enforced without exception

Every time a table is created or modified:

1. **RLS must be enabled in the same migration** — never in a separate later migration.
   Read `server/migrations/RLS_POLICY_GUIDE.md` and assign a pattern (A/B/C/D) before
   writing `CREATE TABLE`.

2. **Never create tables in the Supabase dashboard.** Write the migration file first,
   run it in the SQL Editor, commit the file. If a table was created in the dashboard
   (schema drift), create a retroactive `CREATE TABLE IF NOT EXISTS` migration before
   the next commit.

3. **Migration conventions:**
   - Location: `server/migrations/NNN_description.sql`
   - Must be idempotent and wrapped in `BEGIN; ... COMMIT;`
   - Run manually in Supabase SQL Editor — there is no migration runner

4. **Do not touch:** `user_watchlists` and `user_preferences` already have correct
   RLS policies (Pattern D). Do not alter them.

5. **Do not recreate `profiles`.** It was dropped in migration 006. User identity
   and role live in Supabase Auth `user_metadata`.

---

## Mandatory audit-first rule

**Every session must begin with a read-only audit before any code changes.**

The audit must:
- Read the actual files relevant to the task
- Grep for the specific symbols, patterns, or table names involved
- Confirm what exists before assuming anything
- Report findings before proposing solutions

**This rule exists because past sessions have:**
- Edited dead components that were no longer mounted anywhere
- Targeted the wrong file after a refactor moved the logic
- Added tables without RLS
- Used `brazilBlocks.js` as a data source when it is UI config
- Used v4 `lightweight-charts` API on a v5 installation
- Written hooks after early returns, causing React ordering crashes

---

## React rules

**Hooks must come before early returns — always.**
All `useState`, `useEffect`, `useMemo`, `useCallback` declarations must appear
before any `if (!x) return null` guard. Violations cause React hooks ordering
crashes. Check every component edit before reporting done.

---

## Role system

Single `role` field in Supabase `user_metadata`. Hierarchy defined in
`src/lib/roles.js` and `server/lib/roles.js` (single source of truth):
```
user < club_member < club_manager < admin
```

Use `ROLE_RANK` map for comparisons — never string equality checks for roles
that need hierarchy awareness. `hasRole(userRole, minRole)` is the canonical
comparison function (available on both client and server).

Server middleware: `authenticate` validates the Bearer token and attaches
`req.user` (with `.role`). `requireRole(minRole)` gates routes by hierarchy.

---

## Key file locations

| What | Where |
|---|---|
| Auth context | `src/context/AuthContext.jsx` |
| Taxonomy context | `src/context/TaxonomyContext.jsx` |
| Brazil UI config (not data) | `src/brazilBlocks.js` |
| Express entry | `server/index.js` |
| Supabase server client | `server/db.js` |
| Supabase browser client (auth only) | `src/lib/supabase.js` |
| Auth middleware | `server/middleware/auth.js` |
| Role rank map | `src/lib/roles.js` + `server/lib/roles.js` |
| Snapshot cron | `scripts/captureSnapshot.js` |
| Clube GMT source | `src/clube/` |
| RLS policy guide | `server/migrations/RLS_POLICY_GUIDE.md` |
| Migrations | `server/migrations/NNN_description.sql` |
| Vite config (dev proxies) | `vite.config.js` |

---

## Explicit anti-patterns

Things that have caused real bugs in this codebase — never do these:

- Add TypeScript
- Add CSS classes for layout/color/spacing (use inline style objects)
- Add new styled-components (legacy ones exist — leave them, don't add more)
- Use `addCandlestickSeries()` — v4 only, does not exist in v5
- Write `supabase.from()` anywhere in `src/` — data goes through Express
- Disable RLS on new tables
- Create tables in the Supabase dashboard without a migration file
- Recreate `profiles` — intentionally dropped in migration 006
- Edit `brazilBlocks.js` expecting it to affect data loading
- Place hooks after early returns
- Use gold colors on Global Terminal or logged-out pages
- Use string equality for role checks that need hierarchy (`user.role === 'admin'`
  is fine for exact admin checks; use `hasRole()` / `ROLE_RANK` for hierarchy)
- Use `require()` — the project is ES modules (`"type": "module"`)

---

## Prompt discipline

- One concern per prompt — do not combine unrelated changes
- Surface ambiguities before acting, not after
- Never assume a column type, route shape, or component prop — read the file
- If grep returns unexpected results, report them before proceeding
- Small auditable changes over large monolithic ones
- Always run the verification checklist before reporting done
