<div align="center">

# Global Markets Terminal

### Professional-grade market intelligence. Real-time. Unified. Structured.

[Launch Terminal](#quick-start) · [What is GMT?](#what-is-gmt) · [Quick Start](#quick-start) · [API Reference](#api-reference)

</div>

---

## What is GMT?

The Global Markets Terminal (GMT) is a real-time market data platform that aggregates price and fundamental data from eight professional sources into one unified, structured interface. The problem it solves is fragmentation: serious investors today must juggle Bloomberg for US equities, CoinGecko for crypto, Yahoo Finance for FX rates, Finnhub for company news, BRAPI for Brazilian B3 stocks, and FRED for macro data — often across five or more browser tabs. GMT pulls all of that into a single terminal with a consistent layout, a shared color system, and one place to look.

GMT is built for investors, analysts, and finance professionals who need broad market coverage without constant context-switching. Whether you are monitoring a US tech position, tracking SELIC rate trends in Brazil, following a Bitcoin breakout, or scanning for analyst recommendation changes across a sector, GMT surfaces all of it in one place. The platform tracks 424+ assets across 9 groups and 32 subgroups — split between a **Global Terminal** (US equities by GICS sector, global indices, FX pairs, crypto, commodities, fixed income) and a **Brazil Terminal** (B3 stocks by sector, FIIs, ETFs, renda fixa, macro indicators).

What sets GMT apart from generic screeners is its three-tier taxonomy: every asset belongs to a Subgroup, every Subgroup belongs to a Group, and Groups are organized under L1 terminal nodes (Global / Brasil). This mirrors exactly how institutional investors — MSCI, S&P, BlackRock — classify the market, making the platform intuitive for anyone with a finance background while remaining structured enough for systematic analysis. The terminal aesthetic is deliberately minimalist and data-dense: built for professional use during market hours, not for casual browsing.

The vision is to make institutional-quality market intelligence accessible to serious investors who do not have a Bloomberg terminal subscription — and to give them a platform they can extend, customize, and own.

---

## Key Features

**Real-Time Market Dashboard** — Live price quotes with 30-second refresh cycles across all tracked assets, including percentage change, color-coded gain/loss indicators, and collapsible group and subgroup views in both card and list layouts. Sort by ticker or by daily return with a single click.

**Market Heatmap** — A volume-weighted treemap visualization of the full asset universe that makes relative performance immediately visible at a glance. Larger tiles represent larger market-cap assets; color intensity maps to daily price change.

**Three-Tier Taxonomy System** — Every asset is organized into an L1 → Group → Subgroup → Asset hierarchy that mirrors institutional classification standards (MSCI GICS). This structure is stored in Supabase (hosted Postgres) and fully editable by admins, so the platform can evolve without code changes.

**Dual-Terminal Architecture** — GMT ships with two terminal views: a **Global Terminal** covering US equities, indices, FX, crypto, commodities, and fixed income, and a **Brazil Terminal** covering B3 stocks (by sector), FIIs, ETFs, indices, renda fixa, and macro indicators. Each terminal filters taxonomy data to its own asset universe.

**Global Asset Coverage** — 424+ assets spanning US equities by GICS sector (Technology, Semiconductors, Biotech, Financials, Healthcare, Consumer, Industrials, Automobile, Real Estate, Aerospace & Defense, Clean Energy, Oil & Gas), Brazilian B3 stocks (12 sectors with 117 equities), FIIs (42), ETFs (18), Emerging Markets ETFs, Global Indices, Foreign Exchange (14 pairs including EM currencies), Crypto (BTC/ETH/SOL/XRP + more), Precious Metals, Energy Commodities, Agriculture, Treasuries, Corporate Bonds, Credit (HYG, JNK, LQD), Dividend Income ETFs, and Brazilian renda fixa (juros, crédito, títulos públicos) and macro indicators (IPCA, PIB, emprego, câmbio).

**Secure Authentication** — Supabase Auth handles user creation, password hashing, and session management. Two roles: `admin` (full taxonomy management + user admin) and `user` (read-only terminal access). Sessions are persisted by the Supabase SDK via `localStorage` and survive page refreshes.

**Self-Registration** — Any visitor can create a `user` account directly from the landing page or register page. Server-side password validation enforces length, uppercase, digit, and special character requirements. Rate-limited to 5 registrations per 15 minutes per IP.

**Admin Taxonomy Manager** — Admins can create, rename, and delete Groups and Subgroups via a three-column modal UI at `/admin/taxonomy`. Deleting a Subgroup triggers an asset relocation flow: all assets in the deleted subgroup must be reassigned before deletion proceeds, preventing orphaned data.

**Clube de Investimento** — A portfolio management module for Brazilian investment clubs (clubes de investimento). Tracks cotistas (members), posicoes (positions with target weights), NAV history, and regulatory compliance (67% equities rule).

**Landing Page with Live Ticker** — A public landing page with a dual-row auto-scrolling price ticker (opposite directions) populated with real-time prices across equities, FX, and crypto. The landing page adapts to auth state: authenticated users see a direct "Launch Terminal" CTA; unauthenticated visitors see Sign Up and Sign In options.

**Intelligent Quota Management** — A layered API client (registry → cache → quota tracker → HTTP client) manages rate limits across all eight data providers. Quota-constrained calls are cached with per-endpoint TTLs, low-priority calls are deferred to an in-memory queue when quota is tight, and 429 responses trigger exponential backoff with Retry-After support.

**Protected Routing by Role** — React Router routes are protected by a `ProtectedRoute` component that redirects unauthenticated users to `/login` and non-admin users away from `/admin/*`. After login, users are routed to `/app` or `/admin/taxonomy` based on their role.

---

## Tech Stack

### Frontend

| Layer        | Technology                                                     |
|--------------|----------------------------------------------------------------|
| Framework    | React 18 (JavaScript — no TypeScript)                         |
| Styling      | Inline styles (no CSS-in-JS library)                           |
| Routing      | React Router v6                                                |
| Build tool   | Vite v6                                                        |
| State        | React Context — `AuthContext`, `TaxonomyContext`, `PreferencesContext`, `WatchlistContext`, `TickerContext`, `SelectedAssetContext` |
| Auth client  | @supabase/supabase-js (anon key, browser sessions)            |
| Testing      | Vitest                                                         |
| Fonts        | DM Sans (body), JetBrains Mono (terminal UI), Syne (logo), IBM Plex Sans (header nav) |

### Backend

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Runtime       | Node.js (ES modules)                    |
| Framework     | Express 4                               |
| Database      | Supabase (hosted Postgres)              |
| Auth          | Supabase Auth (service-role key server-side) |
| Rate limiting | express-rate-limit v8                   |
| API proxying  | http-proxy-middleware (8 external APIs)  |
| Dev tooling   | concurrently (multi-process dev runner) |

### Architecture

The frontend (Vite dev server on `:5173`) never calls external APIs directly. All backend API requests are proxied through the Vite dev server via path-based routing: `/api/v1/*` is forwarded to the Express server on `:4000`, while `/proxy/yahoo/*`, `/proxy/finnhub/*`, `/proxy/coingecko/*`, and other external provider paths are proxied to their respective origins with CORS handling. In production, the Express backend handles both the REST API and all proxy routes (no separate proxy process). The Express backend serves the REST API for taxonomy CRUD, authentication, clube management, and user preferences; it does not serve the React app in development.

Supabase (hosted Postgres) stores 11 tables: `l1_nodes`, `groups`, `subgroups`, `assets`, `profiles` (unused — retained from Phase 1), `user_watchlists`, `user_preferences`, `clubes`, `cotistas`, `posicoes`, and `nav_historico`. Schema is managed via SQL migration files run manually in the Supabase SQL Editor — the server does not run migrations on boot. The database is seeded from the static source-of-truth files in `src/data/` via `npm run seed` — which also serve as the offline fallback for the frontend when the backend is unavailable. `TaxonomyContext` fetches the live taxonomy tree from `GET /api/v1/taxonomy` on mount and keeps it in React state; components fall back to the static arrays if the fetch fails. `AuthContext` manages Supabase Auth sessions — the Supabase SDK persists sessions in `localStorage`, so users remain logged in across page refreshes.

---

## Routes

```
Public:
  /                    Landing page
  /login               Login
  /register            Register

Terminal (authenticated — shared TerminalLayout with GMTHeader):
  /app                 → redirects to /app/global
  /app/global          Global Markets dashboard
  /app/brasil          Brazil Terminal (B3)
  /app/catalog         Data Catalog & Quota Dashboard
  /app/news            Market News (Finnhub)
  /app/heatmap         Market Heatmap
  /app/watchlist       Watchlist

Markets (authenticated):
  /markets/chart       Chart Center
  /markets/research    Research Terminal
  /markets/fundamentals Fundamental Lab
  /markets/macro       Macro Hub
  /markets/signals     Signal Engine

Clube (authenticated):
  /clube               Clube de Investimento dashboard
  /clube/report        Clube report with AI commentary

Admin (admin role):
  /admin               Admin Taxonomy Manager
```

The Global/Brazil terminal switch is accessible via the hamburger menu (slide-out navigation) with a confirmation dialog. A read-only mode indicator badge in the header center shows the current terminal mode. Theme preference (dark/light) is set at the `TerminalLayout` level via `data-theme` attribute and persists across all routes.

---

## Project Structure

```
markets-dashboard/
├── server/                          # Express backend (Node.js, ES modules)
│   ├── index.js                     # App entry point — middleware, route mounting, proxy setup, startup
│   ├── db.js                        # Supabase client (service-role key, no session persistence)
│   ├── seed.js                      # Seeds DB from src/data/ via `npm run seed`; idempotent upserts
│   ├── middleware/
│   │   └── auth.js                  # Supabase Auth — authenticate() via getUser(token) + requireAdmin()
│   ├── migrations/                  # SQL migrations — run manually in Supabase SQL Editor
│   │   ├── 001_initial_schema.sql   # groups, subgroups, assets, profiles (unused)
│   │   ├── 001_clube_schema.sql     # clubes, cotistas, posicoes, nav_historico
│   │   ├── 002_schema_v2.sql        # terminal_view, block_id, sort_order; Brazil group migration
│   │   ├── 002_user_data.sql        # user_watchlists, user_preferences
│   │   ├── 003_taxonomy_v3.sql      # l1_nodes table, l1_id on groups
│   │   ├── 004_sector_column.sql    # sector column on assets + index
│   │   └── 005_taxonomy_v3.sql      # New subgroups (automobile, credit), 22 global + 56 BR stub assets
│   └── routes/
│       ├── auth.js                  # POST /register, /login, /logout · GET /me
│       ├── groups.js                # GET, POST, PUT, DELETE /api/v1/groups
│       ├── subgroups.js             # GET, POST, PUT, DELETE /api/v1/subgroups
│       ├── assets.js                # GET, POST, PUT, DELETE /api/v1/assets · PATCH relocate + bulk
│       ├── taxonomy.js              # GET /api/v1/taxonomy — nested tree · GET /taxonomy/tree — L1 tree
│       ├── l1.js                    # GET /api/v1/l1 — L1 nodes and drill-down routes
│       ├── users.js                 # GET /api/v1/users · DELETE · PATCH role (admin only)
│       ├── watchlist.js             # GET, POST, DELETE /api/v1/watchlist
│       ├── preferences.js           # GET, PUT /api/v1/preferences
│       ├── clubes.js                # Clube CRUD, posicoes, cotistas, NAV, compliance
│       └── yahoo.js                 # Yahoo Finance proxy — crumb/cookie session management
│
├── src/
│   ├── App.jsx                      # BrowserRouter + all route definitions (public + protected)
│   ├── main.jsx                     # React root — mounts AuthProvider → TaxonomyProvider → App
│   ├── index.css                    # Global CSS reset + theme CSS variables ([data-theme] dark/light)
│   │
│   ├── GlobalMarketsTerminal.jsx    # Global dashboard — asset cards/list, detail panel, command bar
│   ├── BrazilTerminal.jsx           # Brazil dashboard — B3 equities, FIIs, ETFs, macro, renda fixa
│   ├── WatchlistPage.jsx            # Standalone watchlist page
│   ├── MarketHeatmapPage.jsx        # Heatmap page wrapper
│   ├── CatalogPage.jsx              # Full asset catalog + quota dashboard
│   ├── NewsPage.jsx                 # Market news feed (Finnhub)
│   ├── dataServices.js              # All external API fetch functions (Yahoo, Finnhub, CoinGecko, etc.)
│   │
│   ├── context/
│   │   ├── AuthContext.jsx          # Supabase Auth state; login (SDK direct), register (via Express), logout
│   │   ├── TaxonomyContext.jsx      # Live taxonomy from backend; exposes globalTaxonomy, brazilTaxonomy
│   │   ├── PreferencesContext.jsx   # User preferences (theme, defaultView) — synced to user_preferences
│   │   ├── WatchlistContext.jsx     # Watchlist state — pin/unpin assets and subgroups
│   │   ├── TickerContext.jsx        # Shared ticker strip data between layout and terminal
│   │   └── SelectedAssetContext.jsx # Currently selected asset for detail panel
│   │
│   ├── hooks/
│   │   └── useAuth.js               # Convenience hook — returns useContext(AuthContext)
│   │
│   ├── lib/
│   │   └── supabase.js              # Browser Supabase client (anon key, session persistence)
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx          # Public landing page — navbar, hero, live ticker, trust section, footer
│   │   ├── LoginPage.jsx            # Login form with role-based redirect after auth
│   │   ├── RegisterPage.jsx         # Self-registration form — password strength, field validation
│   │   └── AdminTaxonomyPage.jsx    # Three-column admin UI for taxonomy CRUD
│   │
│   ├── components/
│   │   ├── TerminalLayout.jsx       # Layout shell — GMTHeader + HamburgerMenu + Outlet; sets data-theme
│   │   ├── GMTHeader.jsx            # Unified header — top bar, nav bar, ticker strip; mode badge
│   │   ├── HamburgerMenu.jsx        # Slide-out nav — mode switch, pages, markets, theme toggle
│   │   ├── CommandBar.jsx           # Filter/sort/view controls bar (inside GlobalMarketsTerminal)
│   │   ├── AssetListView.jsx        # Flat sortable asset table (list view mode)
│   │   ├── MarketHeatmap.jsx        # Treemap visualization component
│   │   ├── ProtectedRoute.jsx       # Auth guard — redirects unauthenticated or unauthorized users
│   │   └── admin/
│   │       ├── GroupFormModal.jsx   # Create / edit Group modal
│   │       ├── SubgroupFormModal.jsx# Create / edit Subgroup modal
│   │       ├── DeleteGroupModal.jsx # Delete Group with confirmation
│   │       └── DeleteSubgroupModal.jsx # Delete Subgroup with asset relocation flow
│   │
│   ├── services/
│   │   ├── apiRegistry.js           # Source of truth for all external APIs — limits, endpoints, cache TTLs
│   │   ├── apiClient.js             # Unified HTTP wrapper — quota, cache, retry, deferred queue
│   │   ├── apiCache.js              # In-memory TTL cache with stale-while-revalidate support
│   │   ├── quotaTracker.js          # Per-API quota consumption tracking and health status
│   │   ├── taxonomyService.js       # CRUD functions for taxonomy backend API (/api/v1/*)
│   │   ├── userService.js           # Admin user management API client
│   │   └── __tests__/
│   │       └── e2e.test.js          # Vitest integration tests for the services layer
│   │
│   └── data/                        # Seed source of truth + offline fallback (do not edit manually)
│       ├── groups.js                # 9 Groups (6 global + 3 brazil)
│       ├── subgroups.js             # 32 Subgroups (23 global + 9 brazil)
│       └── assets.js                # 424+ Assets with metadata (exchange, type, sector, cgId, isB3, etc.)
│
├── proxy-server.js                  # DEPRECATED — Yahoo proxy (superseded by server/routes/yahoo.js)
├── index.html                       # Vite HTML entry point
├── vite.config.js                   # Vite config — React plugin + 9 API proxy rules (dev only)
├── vitest.config.js                 # Vitest config
├── package.json                     # Scripts: dev, start:server, start:dev, build, seed, test
├── .env                             # Local secrets (Supabase keys, API keys) — not committed
├── .env.example                     # Template for required environment variables
└── QUOTA_MANAGEMENT.md              # Deep-dive on the quota tracking architecture
```

---

## Data Sources

GMT aggregates data from eight external providers. In development, requests are proxied through Vite's dev server. In production, the Express backend proxies all external API calls via `http-proxy-middleware`, so no API keys are exposed to the browser.

| Provider | Asset Types | Coverage | Tier |
|----------|------------|----------|------|
| **Yahoo Finance** | Equities, ETFs, Indices, FX | US stocks, global indices, 14 major currency pairs | Unofficial proxy (no key) |
| **Finnhub** | Equities, News, Analyst Ratings | Real-time quotes, company news, analyst recommendations | Free — 60 req/min |
| **CoinGecko** | Cryptocurrency | BTC, ETH, SOL + 5 more altcoins | Public — ~30 req/min (no key) |
| **Financial Modeling Prep** | Equities — Fundamentals | Company profiles, P/E, EPS, sector, ratios TTM, DCF | Free — 250 req/day |
| **BRAPI** | Brazilian B3 Equities & ETFs | B3 stocks, FIIs, ETFs (batched calls by sector) | Free (limits undocumented) |
| **BCB (Banco Central do Brasil)** | Brazilian Macro & Renda Fixa | SELIC, IPCA, CDI, interest rate curve, public bond yields | Public — unlimited (no key) |
| **AwesomeAPI** | FX — BRL pairs | USD/BRL, EUR/BRL exchange rates | Public — unlimited (no key) |
| **FRED (Federal Reserve Economic Data)** | US Macro | Fed Funds Rate, CPI, GDP, unemployment, treasury yields, mortgage rates, consumer sentiment, retail sales | Free — unlimited |

GMT's multi-source architecture means no single API outage takes down the entire dashboard. When Yahoo Finance returns a session error, the system falls back to Finnhub quotes automatically. All responses are cached at the endpoint level with per-provider TTLs — from 30 seconds for live prices to 24 hours for company profiles — so the platform remains responsive even under tight rate limits. Data from all providers is normalized into a common quote shape before being consumed by components.

---

## Taxonomy System

Every asset on GMT lives inside a hierarchy: **L1 → Group → Subgroup → Asset**. L1 is the terminal node (Global or Brasil). A Group is the broadest asset classification within a terminal (e.g., *Equities*, *Renda Fixa*). A Subgroup segments a Group into a meaningful market category (e.g., *Technology*, *Bancos & Financeiro*). An Asset is an individual ticker tracked within a Subgroup. This mirrors the way institutional investors like MSCI and S&P GICS classify the market, making the structure immediately legible to finance professionals while enabling systematic filtering, heatmap rendering, and per-group macro data display.

```
GLOBAL TERMINAL (6 Groups · 23 Subgroups · ~174 Assets)

Equities
├── 🛡  Aerospace & Defense     (8 assets)
├── 🚗  Automobile              (3 — TSLA, BYDDY, RIVN)
├── 🧬  Biotech                 (6 assets)
├── 🔋  Clean Energy            (6 assets)
├── 🛒  Consumer                (10 assets)
├── 🌍  Emerging Markets        (4 EM ETFs)
├── 🏦  Financials              (13 assets)
├── 💊  Health Care             (11 assets)
├── 🏭  Industrials             (8 — CAT, DE, FDX, GE, HON, MMM, UNP, UPS)
├── 🛢  Oil & Gas               (8 assets)
├── 🏢  Real Estate             (8 — PLD, AMT, EQIX, SPG, O, WELL, DLR, AVB)
├── 🔬  Semiconductors          (10 assets)
└── ⚡  Technology              (13 assets)

Currencies
└── 💱  Foreign Exchange        (14 pairs — majors + EM)

Indices
└── 🌐  Global Indices          (11 benchmarks + VIX)

Digital Assets
└── 🪙  Crypto                  (8 — BTC, ETH, SOL, XRP, ADA, DOGE, AVAX, DOT)

Commodities
├── 🥇  Precious Metals         (6 — gold, silver, platinum ETFs + futures)
├── 🛢  Energy Commodities      (5 — crude, natgas ETFs + futures)
└── 🌾  Agriculture             (5 — corn, wheat, soy ETFs)

Fixed Income
├── 💰  Dividend Income         (6 high-yield ETFs)
├── 📊  Credit                  (3 — HYG, JNK, LQD)
├── 🏛  Treasuries              (6 US Treasury ETFs)
└── 📄  Bonds                   (2 — AGG, BND)


BRAZIL TERMINAL (3 Groups · 9 Subgroups · ~250 Assets)

Mercado (🟢)
├── 📊  Ações B3               (117 equities across 12 sectors)
├── 🏢  FIIs                   (43 fundos imobiliários)
├── 📦  ETFs B3                (18 ETFs)
└── 📊  Índices & Benchmarks   (15 indices + rates)

Renda Fixa (🟡)
├── 📈  Juros                  (17 — SELIC, CDI, curva DI, NTN-B)
├── 💳  Crédito                (7 — spreads, debentures, LCI/LCA)
└── 🏛  Títulos Públicos       (9 — LFT, NTN-B, NTN-F, LTN)

Macro (🔴)
├── 📊  Macro Brasil           (15 indicators — IPCA, PIB, emprego)
└── 💱  Câmbio & Liquidez      (10 — USD/BRL, PTAX, reservas)
```

**9 Groups · 32 Subgroups · 424+ Assets**

The taxonomy is stored in Supabase (hosted Postgres) and served via `GET /api/v1/taxonomy` (flat tree) and `GET /api/v1/taxonomy/tree` (L1-nested tree). Admins can restructure it at runtime through the Admin Taxonomy Manager — creating and renaming Groups and Subgroups, and relocating assets when a Subgroup is deleted. The static files in `src/data/` represent the seed state and serve as the offline fallback; they should not be edited manually. Use the admin UI at `/admin/taxonomy` instead.

---

## API Reference

All endpoints are prefixed with `/api/v1`. Authenticated endpoints require an `Authorization: Bearer <token>` header obtained from a Supabase Auth session. Admin endpoints additionally require `role: admin` in the user's `user_metadata`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | None | Create a new `user` account via Supabase Auth. Rate limited: 5 req / 15 min / IP. |
| `POST` | `/auth/login` | None | Authenticate via Supabase Auth and receive a session token. |
| `POST` | `/auth/logout` | None | Client-side logout signal (stateless — Supabase SDK handles session cleanup). |
| `GET`  | `/auth/me` | Bearer | Returns the authenticated user's profile from Supabase Auth. |

### Taxonomy — Read (public, no auth required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/taxonomy` | None | Full nested tree: Groups → Subgroups → Assets. Supports `?view=global\|brazil`. |
| `GET` | `/taxonomy/tree` | None | L1-nested tree: L1 → Groups → Subgroups (with asset counts). |
| `GET` | `/groups` | None | All Groups with subgroup count. Supports `?terminalView=global\|brazil`. |
| `GET` | `/groups/:id` | None | Single Group by ID. |
| `GET` | `/subgroups` | None | All Subgroups. Supports `?groupId=` and `?sectionId=`. |
| `GET` | `/subgroups/:id` | None | Single Subgroup by ID. |
| `GET` | `/assets` | None | All Assets. Supports `?subgroupId=`, `?groupId=`, `?terminal_view=`. |
| `GET` | `/l1` | None | All L1 terminal nodes. |
| `GET` | `/l1/:l1Id/groups` | None | Groups under a given L1 node. |
| `GET` | `/l1/:l1Id/assets` | None | Assets under a given L1 node. Supports `?groupId=`, `?subgroupId=`. |

### Taxonomy — Write (admin only)

| Method   | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| `POST`   | `/groups` | Admin | Create a new Group. |
| `PUT`    | `/groups/:id` | Admin | Update a Group. |
| `DELETE` | `/groups/:id` | Admin | Delete a Group (must have no subgroups). |
| `POST`   | `/subgroups` | Admin | Create a new Subgroup. |
| `PUT`    | `/subgroups/:id` | Admin | Update a Subgroup. |
| `DELETE` | `/subgroups/:id` | Admin | Delete a Subgroup (assets must be relocated first). |
| `POST`   | `/assets` | Admin | Create a new Asset. |
| `PUT`    | `/assets/:id` | Admin | Update an Asset. |
| `DELETE` | `/assets/:id` | Admin | Delete an Asset. |
| `PATCH`  | `/assets/:id/relocate` | Admin | Move an asset to a different subgroup. |
| `PATCH`  | `/assets/bulk-relocate` | Admin | Move multiple assets to a target subgroup. |

### User Management (admin only)

| Method  | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET`   | `/users` | Admin | List all users (from Supabase Auth). |
| `DELETE` | `/users/:id` | Admin | Delete a user (cannot delete self or other admins). |
| `PATCH` | `/users/:id/role` | Admin | Change a user's role (`admin` or `user`). |

### Watchlist & Preferences (authenticated)

| Method   | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| `GET`    | `/watchlist` | Bearer | Get user's pinned assets/subgroups. |
| `POST`   | `/watchlist` | Bearer | Pin an asset or subgroup. |
| `DELETE` | `/watchlist/:type/:target_id` | Bearer | Unpin an item. |
| `GET`    | `/preferences` | Bearer | Get user preferences (theme, default view, etc.). |
| `PUT`    | `/preferences` | Bearer | Update user preferences. |

### Clube de Investimento (authenticated / admin for writes)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/clubes` | Bearer | List all clubes. |
| `GET`  | `/clubes/:id` | Bearer | Get a single clube. |
| `POST` | `/clubes` | Admin | Create a new clube. |
| `PUT`  | `/clubes/:id` | Admin | Update a clube. |
| `GET`  | `/clubes/:id/posicoes` | Bearer | Get clube positions (with asset details). |
| `PUT`  | `/clubes/:id/posicoes` | Admin | Replace all positions (weights must sum to 1.0). |
| `GET`  | `/clubes/:id/cotistas` | Bearer | Get cotistas with current NAV valuation. |
| `POST` | `/clubes/:id/cotistas` | Admin | Add a cotista. |
| `PUT`  | `/clubes/:id/cotistas/:cid` | Admin | Update a cotista. |
| `GET`  | `/clubes/:id/nav` | Bearer | Full NAV history. |
| `GET`  | `/clubes/:id/nav/latest` | Bearer | Latest NAV entry. |
| `POST` | `/clubes/:id/nav` | Admin | Record a new NAV entry. |
| `GET`  | `/clubes/:id/compliance` | Bearer | Regulatory compliance check (67% RV rule). |

### Utility

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Returns `{ status: "ok", ts: <epoch> }`. |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone <repo-url>
cd markets-dashboard
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration files from `server/migrations/` in the SQL Editor (in order: `001_initial_schema.sql`, `001_clube_schema.sql`, `002_schema_v2.sql`, `002_user_data.sql`, `003_taxonomy_v3.sql`, `004_sector_column.sql`, `005_taxonomy_v3.sql`)
3. Copy your project URL, service role key, and anon key from Settings → API

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Supabase credentials (see `.env.example` for the full list). At minimum, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. All data provider keys are optional — the terminal degrades gracefully when keys are absent.

### 4. Seed the database

```bash
npm run seed
```

This upserts 9 groups, 32 subgroups, and 424+ assets from the static files in `src/data/`.

### 5. Start the full stack

```bash
npm run start:dev
```

This runs two processes concurrently:

| Process | Script | Port | Purpose |
|---------|--------|------|---------|
| `api` | `npm run start:server` | `:4000` | Express REST API + Supabase backend + external API proxies |
| `vite` | `npm run dev` | `:5173` | React frontend dev server |

### 6. Open the app

- **Landing page:** [http://localhost:5173](http://localhost:5173)
- **Dashboard:** [http://localhost:5173/app](http://localhost:5173/app) *(requires login)*
- **Admin panel:** [http://localhost:5173/admin/taxonomy](http://localhost:5173/admin/taxonomy) *(requires admin role)*

### Create an admin user

Use the Supabase dashboard (Authentication → Users) to create a user, then set `role: admin` in their `user_metadata`. Or register through the app and promote via the Supabase SQL Editor:

```sql
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}' WHERE email = 'your@email.com';
```

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start Express API + Vite frontend (recommended for development) |
| `npm run start:server` | Start Express API only |
| `npm run start` | Start Express API (production — used by Railway/Docker) |
| `npm run dev` | Start Vite frontend only |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run seed` | Seed taxonomy data into Supabase (idempotent) |
| `npm test` | Run Vitest test suite |

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (server-side). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side, never expose to browser). |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (browser-side, exposed via Vite). |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (browser-side). |
| `VITE_FINNHUB_KEY` | No | Finnhub API key. Without it, news and analyst data will be unavailable. |
| `VITE_FMP_KEY` | No | Financial Modeling Prep API key. Without it, fundamental data is unavailable. |
| `VITE_ALPHA_VANTAGE_KEY` | No | Alpha Vantage key. RSI/MACD endpoints are dormant until activated. |
| `VITE_FRED_KEY` | No | FRED API key. Without it, macro data uses anonymous IP-rate-limited access. |
| `VITE_BRAPI_TOKEN` | No | BRAPI token for Brazilian B3 data. |
| `VITE_API_URL` | No | Production backend URL. Leave empty in development (Vite proxy handles routing). |

---

## Development Notes

**Taxonomy changes:** Always use the admin UI at `/admin/taxonomy` to modify the taxonomy. Do not edit `src/data/*.js` directly — those files are the seed source and offline fallback only. The database is the source of truth at runtime.

**Adding a new data provider:** Register the API in `src/services/apiRegistry.js` with its limits, endpoints, and cache TTLs. Add fetch functions to `src/dataServices.js`. Add a Vite proxy rule in `vite.config.js` and a corresponding production proxy in `server/index.js`. The quota tracker and deferred queue work automatically for any registered API.

**API quota awareness:** The platform is built to work within the free tiers of all providers. See `QUOTA_MANAGEMENT.md` for a detailed breakdown of the quota tracking architecture, cache TTL rationale, and upgrade paths for each provider.

**Auth model:** Sessions are managed by the Supabase SDK. The browser client (`src/lib/supabase.js`) uses the anon key and persists sessions via `localStorage`. The server client (`server/db.js`) uses the service-role key with no session persistence. `AuthContext` listens to `onAuthStateChange` to keep React state in sync with the Supabase session.

**Theme system:** Theme preference (dark/light) is stored in the `user_preferences` table and applied at the layout level (`TerminalLayout`) via the `data-theme` attribute. CSS variables are defined in `src/index.css` under `[data-theme="dark"]` and `[data-theme="light"]` selectors — this is the single source of truth for all theme colors across the app.

**Terminal mode switch:** The Global/Brazil terminal switch lives in the hamburger menu (not in the header). Clicking the inactive mode shows a confirmation dialog inside the menu panel before navigating. The header shows a read-only mode indicator badge (green for Global, gold for Brasil).

---

<div align="center">

Built with React, Express, Supabase, and a lot of `console.log` debugging.

</div>
