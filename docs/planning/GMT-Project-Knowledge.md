# Global Markets Terminal — Project Knowledge Base
_Last updated: April 2026 | Source of truth for Claude chat and Cowork contexts._

---

## What is GMT?

Global Markets Terminal is a **decision system** for investors — not just a data dashboard. The differentiator is connecting idea → thesis → decision → execution → recordkeeping → learning, a capability no existing tool including Bloomberg currently provides. It aggregates real-time price and fundamental data from eight professional sources into one unified, structured interface.

GMT has evolved into a **two-product brand architecture:**

1. **GMT Terminal** (Mini / free forever + Pro / subscription) — global and Brazil market intelligence, dark terminal aesthetic
2. **Clube GMT** — Brazilian investment club (clube de investimento) management system, CVM Resolution 11 compliant, treated as a separate brand within the same codebase under `src/clube/`

GMT is built for investors, analysts, and finance professionals who need broad market coverage without constant context-switching.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, plain JavaScript (no TypeScript) |
| Styling | **Inline styles only** — no CSS classes, no styled-components |
| Routing | React Router v6 |
| State | React Context — `AuthContext`, `TaxonomyContext` |
| Fonts | JetBrains Mono + DM Sans |
| Base color | Dark palette anchored at `#080f1a` |
| Backend | Express 4, Node.js ES modules |
| Database | **Supabase (hosted Postgres)** — schema v2 |
| Auth | Supabase Auth directly in browser |
| Frontend deploy | Vercel (auto-deploys on push to `main`) |
| Backend deploy | Railway (Express API + snapshot cron service) |
| Charts | lightweight-charts v5 — uses `addSeries(SeriesDefinition, opts)` API |

---

## Architecture

The frontend (Vite on `:5173`) never calls external APIs directly. All backend requests go through Vite proxy rules or the Express server on `:4000` (local) / `global-markets-terminal.up.railway.app` (prod).

**Frontend is live at:** `global-markets-terminal.vercel.app`
**Backend is live at:** `global-markets-terminal.up.railway.app`
**GitHub repo:** `https://github.com/Felps10/Global-Markets-Terminal` (branch: `main`)

---

## Database — Supabase Schema v2

- Migration: `server/migrations/002_schema_v2.sql`
- Seed: `npm run seed` (uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
- **9 groups, 36 subgroups, 269 assets** (173 global + 96 Brazil)
- `br-macro-indicadores` = canonical subgroup ID for Brazil macro indicators
- DLR = Digital Realty Trust (REIT, not a dollar ETF)
- Taxonomy migration reference: `005_taxonomy_v3.sql` (in project files)
- Asset mapping reference: `asset_taxonomy_mapping_v2.csv` (in project files)

---

## Authentication

- **Supabase Auth** directly in browser
- `AuthContext.jsx` calls `supabase.auth.signInWithPassword`, `getSession`, `onAuthStateChange`
- `taxonomyService.js` pulls Bearer token from Supabase session via `authHeaders()`
- Required Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **The JWT-in-React-state architecture described in any older docs is outdated and wrong**

---

## Role System

Single `role` field in Supabase `user_metadata`. Source of truth: `src/lib/roles.js` and `server/lib/roles.js`.

```
curious_browser  (unauthenticated)
       ↓  self-register
     user
       ↓  club_manager invites (promotes to club_member)
  club_member
       ↓  system_admin only
  club_manager
       ↓  system_admin only
  admin
```

| Role | Rank |
|------|------|
| user | 0 |
| club_member | 1 |
| club_manager | 2 |
| admin | 3 |

Route protection uses `>=` rank comparison, not equality. Club Manager promotion is admin-only.

**Key role decisions:**
- One club at a time. No multi-tenancy. Role is global on the user record.
- One manager per club. No co-manager concept.
- `club_manager` can promote `user` → `club_member`. This is the invite flow.
- Members must have a GMT account first. Manager shares `/register` link, then promotes.

---

## Permission Matrix

| Capability | Browser | User | Club member | Club manager | Admin |
|-----------|---------|------|-------------|--------------|-------|
| Landing page + live ticker | ✓ | ✓ | ✓ | ✓ | ✓ |
| Register for an account | ✓ | — | — | — | — |
| Global terminal (prices, heatmap) | — | ✓ | ✓ | ✓ | ✓ |
| Brazil terminal (B3, macro, FX) | — | ✓ | ✓ | ✓ | ✓ |
| Asset detail drawer | — | ✓ | ✓ | ✓ | ✓ |
| Watchlist + settings | — | ✓ | ✓ | ✓ | ✓ |
| View NAV + performance dashboard | — | — | ✓ | ✓ | ✓ |
| View member list + quotas | — | — | ✓ | ✓ | ✓ |
| View NAV history + AI reports | — | — | ✓ | ✓ | ✓ |
| Invite user to clube (→ club_member) | — | — | — | ✓ | ✓ |
| Record NAV (cotização) | — | — | — | ✓ | ✓ |
| Generate AI report | — | — | — | ✓ | ✓ |
| Edit clube profile + settings | — | — | — | ✓ | ✓ |
| Promote user → club_manager | — | — | — | — | ✓ |
| Taxonomy CRUD (groups, assets) | — | — | — | — | ✓ |
| View all users + roles | — | — | — | — | ✓ |

---

## Frontend Routes

- `/app/global` — Global terminal
- `/app/brasil` — Brazil terminal
- `/app/settings` — Settings
- `/clube/*` — Clube GMT public pages
- Theme is set at `TerminalLayout` level
- All child routes are protected by layout-based route guards
- 47-test routing smoke test suite installed

---

## Color & Design Token System

Three-token accent system — defined in `src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `var(--c-accent)` | `#3b82f6` | UI interactions: buttons, active nav, links, focus |
| `var(--c-accent-data)` | `#00C8FF` | Market data ink: live dot, charts, sparklines |
| `var(--c-accent-br)` | `#F5C518` | Brazil/Clube context only |

**Rule:** Gold is reserved exclusively for Brazil Terminal and Clube GMT. Blue is the universal interactive color for global terminal and all logged-out pages. Zero hardcoded `#3b82f6` outside `index.css`.

---

## Brazil Terminal

- 3-block architecture: **Mercado** (green), **Renda Fixa** (gold), **Macro** (red)
- 3 block-groups: `br-mercado`, `br-renda-fixa`, `br-macro`
- 15 subgroups, 96 B3 assets
- Live data only for `acoes-b3`
- `brazilBlocks.js` is static UI config for filters only — not a data source

---

## Clube GMT

- Built under `src/clube/`
- `ClubeHeader` (bilingual, auth-aware, gold brand), `ClubeFooter` (CVM legal disclaimer)
- 5 public pages, `ClubeShell` with role-aware navigation differentiating club members from managers
- `data-context="brazil"` on `ClubeShell` root triggers gold accent via CSS override block in `index.css`
- Eventual separate domain: `clubegmt.com` (not yet live; `src/clube/` approach chosen first)

**Club Manager core loop:**
1. Configures clube (name, inception date, benchmark — CDI or IBOV)
2. Invites members by promoting registered GMT users
3. Weekly ritual: records the cotização (NAV entry)
4. Monthly ritual: generates the AI report in Portuguese before meetings
- Aha moment: AI report replaces the manual Excel + WhatsApp workflow
- Retention risk: Growth ceiling when clube matures and needs contribution tracking, tax records, CVM compliance

**Club Member core loop:**
- Read-only access to clube dashboard (NAV, performance, member list, AI reports)
- Uses Brazil terminal to track club's holdings independently
- Retention risk: Passive — engagement coupled to manager activity

**Onboarding gaps (open):**
- No email invite flow — members register first, then get promoted
- Role change is silent — member discovers upgrade on next login
- No bulk member import

---

## Market Snapshot System

- Supabase `market_snapshot` table + public `GET /api/v1/snapshot` endpoint
- `captureSnapshot.js` writes to Supabase (no local server needed)
- `useSnapshot` React hook with instant static fallback
- Railway cron service (`snapshot-cron`): runs `node scripts/captureSnapshot.js` at `0 19 * * 1-5`
- Config: `scripts/snapshot-cron.railway.toml`; `Dockerfile` at `server/Dockerfile`

---

## Data Sources

| Provider | Asset Types | Key |
|----------|------------|-----|
| Yahoo Finance | Equities, ETFs, Indices, FX | None (proxy on `:3001`) |
| Finnhub | Equities, News, Analyst | `VITE_FINNHUB_KEY` |
| CoinGecko | Crypto (BTC/ETH/SOL) | None |
| FMP | Fundamentals, Profiles | `VITE_FMP_KEY` |
| BRAPI | B3 equities | `VITE_BRAPI_TOKEN` (100 calls/day) |
| BCB SGS API | SELIC, IPCA, CDI | None |
| AwesomeAPI | USD/BRL, EUR/BRL | None |
| FRED | US Macro | `VITE_FRED_KEY` |
| Alpha Vantage | RSI/MACD signals | `VITE_ALPHAVANTAGE_KEY` (5 calls/min) |

---

## Vercel Environment Variables

`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FINNHUB_KEY`, `VITE_FMP_KEY`, `VITE_BRAPI_TOKEN`, `VITE_FRED_KEY`, `VITE_ALPHAVANTAGE_KEY`

---

## Project Structure

```
markets-dashboard/
├── server/                          # Express backend (Node.js ES modules)
│   ├── index.js                     # App entry point
│   ├── db.js                        # Supabase connection
│   ├── migrations/
│   │   └── 002_schema_v2.sql        # Current schema
│   ├── middleware/
│   │   └── auth.js                  # Supabase JWT verification + requireAdmin()
│   ├── lib/
│   │   └── roles.js                 # ROLE_RANK source of truth
│   └── routes/
│       ├── auth.js                  # POST /register, /login · GET /me
│       ├── groups.js                # CRUD /api/v1/groups
│       ├── subgroups.js             # CRUD /api/v1/subgroups
│       ├── assets.js                # GET /api/v1/assets
│       ├── taxonomy.js              # GET /api/v1/taxonomy (full nested tree)
│       └── snapshot.js              # GET /api/v1/snapshot
│
├── src/
│   ├── App.jsx                      # BrowserRouter + all route definitions
│   ├── main.jsx                     # AuthProvider → TaxonomyProvider → App
│   ├── index.css                    # CSS tokens (c-accent, c-accent-data, c-accent-br) + global reset
│   ├── lib/
│   │   └── roles.js                 # ROLE_RANK (mirrors server/lib/roles.js)
│   ├── context/
│   │   ├── AuthContext.jsx          # Supabase auth state
│   │   └── TaxonomyContext.jsx      # Live taxonomy from backend
│   ├── hooks/
│   │   └── useSnapshot.js           # Market snapshot with static fallback
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── AdminTaxonomyPage.jsx
│   ├── clube/                       # Clube GMT brand module
│   │   ├── ClubeShell.jsx           # Sets data-context="brazil" + data-theme="dark"
│   │   ├── ClubeHeader.jsx
│   │   ├── ClubeFooter.jsx
│   │   └── [5 public pages]
│   └── components/
│       ├── ProtectedRoute.jsx
│       └── admin/                   # AssetFormModal, GroupFormModal, etc.
│
├── scripts/
│   ├── captureSnapshot.js           # Writes to Supabase market_snapshot
│   └── snapshot-cron.railway.toml   # Railway cron config
├── proxy-server.js                  # Yahoo Finance proxy (:3001)
├── vite.config.js                   # Proxy rules + React plugin
└── package.json
```

---

## Admin Panel

Full CRUD on groups/subgroups/assets via modals at `/admin/taxonomy`. `AssetFormModal` has type-driven meta JSON templates, exchange→currency auto-suggest, inline delete confirmation, subgroup dropdown grouped by group display name.

---

## External Tools & Services

| Tool | Purpose |
|------|---------|
| Linear | Issue tracking — `linear.app/globalmarketsterminal` |
| Figma | Design — Team `1613431461873100662`, Project `580142922` |
| Canva | Brand assets — design `DAHFN8koePo`, brand folder `FAHFOECaMiY` |
| Mixpanel | Analytics — production token config pending |

---

## Development Principles

- **Audit-first:** Every Claude Code prompt begins with a mandatory Step 0 read-only audit before any code changes. This catches dead components, wrong file targets, and stale architectural assumptions. Felipe enforces this consistently.
- **Small, auditable prompts:** One concern per prompt. Surface clarifying questions rather than assuming. Large monolithic prompts cause Claude Code to stall.
- **Inline styles only:** No CSS classes, no styled-components anywhere in the codebase.
- **Hooks before early returns:** All `useMemo`/`useEffect`/`useState` before any `if (!x) return null`. Violations cause React hooks ordering crashes — a recurring bug pattern.
- **No feature duplication:** Existing modules own their domain (e.g., Fundamental Lab owns multi-asset comparison).
- **Color system rule:** Gold (`#C5A059`, `#D4B06A`, `#F5C518`) is reserved exclusively for Brazil Terminal and Clube GMT. Blue (`#3b82f6`) is the universal interactive color.
- **Irreversible operations** require two-step confirmation flows.
- **Static data vs. live DB:** Frontend taxonomy derives from `globalTaxonomy` context (Supabase-sourced); `brazilBlocks.js` is static UI config only.
- **Gate protocol:** Always confirm (Gate A/B/C) before executing Figma↔Code↔GitHub changes.
- **Git:** Felipe runs all git commands on his own machine. Sandbox shares the OneDrive mount — lock file conflicts occur if git runs in the sandbox.

---

## On the Horizon

- Mixpanel production token configuration
- Terminal Mini Brasil asset expansion
- Watchlist and price alerts (highest-ROI feature for `user` tier)
- Pricing page with Terminal Pro paywall
- `clubegmt.com` separate domain (lower priority; `src/clube/` approach chosen first)
- CVM compliance reporting (roadmap gate for mature clubes)
