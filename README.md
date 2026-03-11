<div align="center">

# 🌐 Global Markets Terminal

### Professional-grade market intelligence. Real-time. Unified. Structured.

[Launch Terminal](#quick-start) · [What is GMT?](#what-is-gmt) · [Quick Start](#quick-start) · [API Reference](#api-reference)

</div>

---

## What is GMT?

The Global Markets Terminal (GMT) is a real-time market data platform that aggregates price and fundamental data from eight professional sources into one unified, structured interface. The problem it solves is fragmentation: serious investors today must juggle Bloomberg for US equities, CoinGecko for crypto, Yahoo Finance for FX rates, Finnhub for company news, BRAPI for Brazilian B3 stocks, and FRED for macro data — often across five or more browser tabs. GMT pulls all of that into a single terminal with a consistent layout, a shared color system, and one place to look.

GMT is built for investors, analysts, and finance professionals who need broad market coverage without constant context-switching. Whether you are monitoring a US tech position, tracking SELIC rate trends in Brazil, following a Bitcoin breakout, or scanning for analyst recommendation changes across a sector, GMT surfaces all of it in one place. The platform tracks 126 assets across 6 major asset classes and 20 market subgroups — covering US equities by GICS sector, Brazilian B3 stocks, emerging market ETFs, global indices, major FX pairs, crypto, commodities, and fixed income.

What sets GMT apart from generic screeners is its three-tier taxonomy: every asset belongs to a Subgroup, every Subgroup belongs to a Group. This mirrors exactly how institutional investors — MSCI, S&P, BlackRock — classify the market, making the platform intuitive for anyone with a finance background while remaining structured enough for systematic analysis. The terminal aesthetic is deliberately minimalist and data-dense: built for professional use during market hours, not for casual browsing.

The vision is to make institutional-quality market intelligence accessible to serious investors who do not have a Bloomberg terminal subscription — and to give them a platform they can extend, customize, and own.

---

## Key Features

**Real-Time Market Dashboard** — Live price quotes with 30-second refresh cycles across all 126 tracked assets, including percentage change, color-coded gain/loss indicators, and collapsible group and subgroup views in both card and list layouts. Sort by ticker or by daily return with a single click.

**Market Heatmap** — A volume-weighted treemap visualization of the full asset universe that makes relative performance immediately visible at a glance. Larger tiles represent larger market-cap assets; color intensity maps to daily price change.

**Three-Tier Taxonomy System** — Every asset is organized into a Group → Subgroup → Asset hierarchy that mirrors institutional classification standards (MSCI GICS). This structure is stored in the database and fully editable by admins, so the platform can evolve without code changes.

**Global Asset Coverage** — 126 assets spanning US equities by GICS sector (Technology, Semiconductors, Financials, Healthcare, Consumer, Real Estate, Aerospace & Defense, Clean Energy, Oil & Gas), Brazilian B3 stocks, Emerging Markets ETFs, Global Indices, Foreign Exchange pairs, Crypto (BTC/ETH/SOL), Precious Metals, Energy Commodities, Agriculture, Treasuries, Corporate Bonds, and Dividend Income ETFs.

**Secure Authentication** — JWT-based authentication with bcrypt password hashing (12 rounds). Two roles: `admin` (full taxonomy management) and `user` (read-only terminal access). Tokens are stored in React state only — never in localStorage or cookies.

**Self-Registration** — Any visitor can create a `user` account directly from the landing page or register page. Client-side password validation enforces length, uppercase, digit, and special character requirements before submission. Rate-limited to 5 registrations per 15 minutes per IP.

**Admin Taxonomy Manager** — Admins can create, rename, and delete Groups and Subgroups via a three-column modal UI at `/admin/taxonomy`. Deleting a Subgroup triggers an asset relocation flow: all assets in the deleted subgroup must be reassigned before deletion proceeds, preventing orphaned data.

**Landing Page with Live Ticker** — A public landing page with a dual-row auto-scrolling price ticker (opposite directions) populated with real-time prices across equities, FX, and crypto. The landing page adapts to auth state: authenticated users see a direct "Launch Terminal" CTA; unauthenticated visitors see Sign Up and Sign In options.

**Intelligent Quota Management** — A layered API client (registry → cache → quota tracker → HTTP client) manages rate limits across all eight data providers. Quota-constrained calls are cached with per-endpoint TTLs, low-priority calls are deferred to an in-memory queue when quota is tight, and 429 responses trigger exponential backoff with Retry-After support.

**Protected Routing by Role** — React Router routes are protected by a `ProtectedRoute` component that redirects unauthenticated users to `/login` and non-admin users away from `/admin/*`. After login, users are routed to `/app` or `/admin/taxonomy` based on their role.

---

## Tech Stack

### Frontend

| Layer        | Technology                                                     |
|--------------|----------------------------------------------------------------|
| Framework    | React 18 (JavaScript — no TypeScript)                         |
| Styling      | styled-components v6                                           |
| Routing      | React Router v6                                                |
| Build tool   | Vite v6                                                        |
| State        | React Context — `AuthContext`, `TaxonomyContext`               |
| Testing      | Vitest                                                         |
| Fonts        | Syne (hero headlines), IBM Plex Sans (body), JetBrains Mono / Space Mono (terminal UI) |

### Backend

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Runtime       | Node.js (ES modules)                    |
| Framework     | Express 4                               |
| Database      | SQLite via better-sqlite3 (WAL mode)    |
| Auth          | jsonwebtoken + bcryptjs (12 rounds)     |
| Rate limiting | express-rate-limit v8                   |
| Dev tooling   | concurrently (multi-process dev runner) |

### Architecture

The frontend (Vite dev server on `:5173`) never calls external APIs directly. All backend API requests are proxied through the Vite dev server via path-based routing: `/api/v1/*` is forwarded to the Express server on `:4000`, while `/api/yahoo/*`, `/api/finnhub/*`, `/api/coingecko/*`, and other external provider paths are proxied to their respective origins with CORS handling. The Express backend serves the REST API for taxonomy CRUD and authentication; it does not serve the React app in development.

SQLite stores four tables: `users`, `groups`, `subgroups`, and `assets`. The database is seeded on first boot from the static source-of-truth files in `src/data/` — which also serve as the offline fallback for the frontend when the backend is unavailable. `TaxonomyContext` fetches the live taxonomy tree from `GET /api/v1/taxonomy` on mount and keeps it in React state; components fall back to the static arrays if the fetch fails. `AuthContext` manages the JWT in React component state only — token is lost on page refresh, requiring re-login, which is the intended behavior for a terminal application.

---

## Project Structure

```
markets-dashboard/
├── server/                          # Express backend (Node.js, ES modules)
│   ├── index.js                     # App entry point — middleware, route mounting, startup
│   ├── db.js                        # SQLite connection, schema creation (WAL + FK enforced)
│   ├── seed.js                      # Seeds DB from src/data/ on first boot; idempotent
│   ├── middleware/
│   │   └── auth.js                  # JWT authenticate() + requireAdmin() middleware; exports JWT_SECRET
│   └── routes/
│       ├── auth.js                  # POST /register, /login, /logout · GET /me
│       ├── groups.js                # GET, POST, PUT, DELETE /api/v1/groups
│       ├── subgroups.js             # GET, POST, PUT, DELETE /api/v1/subgroups
│       ├── assets.js                # GET /api/v1/assets · PATCH asset relocation
│       └── taxonomy.js              # GET /api/v1/taxonomy — full nested Groups→Subgroups→Assets tree
│
├── src/
│   ├── App.jsx                      # BrowserRouter + all route definitions (public + protected)
│   ├── main.jsx                     # React root — mounts AuthProvider → TaxonomyProvider → App
│   ├── index.css                    # Global CSS reset
│   │
│   ├── GlobalMarketsTerminal.jsx    # Main dashboard — asset list, detail panel, group nav, user badge
│   ├── MarketHeatmapPage.jsx        # Heatmap page wrapper
│   ├── CatalogPage.jsx              # Full asset catalog view
│   ├── NewsPage.jsx                 # Market news feed (Finnhub)
│   ├── dataServices.js              # All external API fetch functions (Yahoo, Finnhub, CoinGecko, etc.)
│   │
│   ├── context/
│   │   ├── AuthContext.jsx          # JWT auth state; exposes login, register, logout, user, isAuthenticated
│   │   └── TaxonomyContext.jsx      # Live taxonomy from backend; exposes groups, subgroups, assets
│   │
│   ├── hooks/
│   │   └── useAuth.js               # Convenience hook — returns useContext(AuthContext)
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx          # Public landing page — navbar, hero, live ticker, trust section, footer
│   │   ├── LoginPage.jsx            # Login form with role-based redirect after auth
│   │   ├── RegisterPage.jsx         # Self-registration form — password strength, field validation
│   │   └── AdminTaxonomyPage.jsx    # Three-column admin UI for taxonomy CRUD
│   │
│   ├── components/
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
│   │   └── __tests__/
│   │       └── e2e.test.js          # Vitest integration tests for the services layer
│   │
│   └── data/                        # Seed source of truth + offline fallback (do not edit manually)
│       ├── groups.js                # 6 Groups
│       ├── subgroups.js             # 20 Subgroups
│       └── assets.js                # 126 Assets with metadata (exchange, type, cgId, isB3, etc.)
│
├── proxy-server.js                  # Yahoo Finance proxy — handles crumb/cookie session on :3001
├── index.html                       # Vite HTML entry point
├── vite.config.js                   # Vite config — React plugin + 9 API proxy rules
├── vitest.config.js                 # Vitest config
├── package.json                     # Scripts: dev, start:server, start:full, build, test
├── .env                             # Local secrets (JWT_SECRET, API keys) — not committed
├── .env.example                     # Template for required environment variables
└── QUOTA_MANAGEMENT.md              # Deep-dive on the quota tracking architecture
```

---

## Data Sources

GMT aggregates data from eight external providers, each accessed through the Vite proxy layer so no API keys are exposed to the browser.

| Provider | Asset Types | Coverage | Tier |
|----------|------------|----------|------|
| **Yahoo Finance** | Equities, ETFs, Indices, FX | US stocks, global indices, 8 major currency pairs | Unofficial proxy (no key) |
| **Finnhub** | Equities, News, Analyst Ratings | Real-time quotes, company news, analyst recommendations | Free — 60 req/min |
| **CoinGecko** | Cryptocurrency | BTC, ETH, SOL spot prices + landing page ticker | Public — ~30 req/min (no key) |
| **Financial Modeling Prep** | Equities — Fundamentals | Company profiles, P/E, EPS, sector, ratios TTM, DCF | Free — 250 req/day |
| **BRAPI** | Brazilian B3 Equities | ~14 B3 stocks in a single batched call | Free (limits undocumented) |
| **BCB (Banco Central do Brasil)** | Brazilian Macro | SELIC interest rate, IPCA inflation, CDI rate | Public — unlimited (no key) |
| **AwesomeAPI** | FX — BRL pairs | USD/BRL, EUR/BRL exchange rates | Public — unlimited (no key) |
| **FRED (Federal Reserve Economic Data)** | US Macro | Fed Funds Rate, CPI, GDP, unemployment, treasury yields, mortgage rates, consumer sentiment, retail sales | Free — unlimited |

GMT's multi-source architecture means no single API outage takes down the entire dashboard. When Yahoo Finance returns a session error, the system falls back to Finnhub quotes automatically. All responses are cached at the endpoint level with per-provider TTLs — from 30 seconds for live prices to 24 hours for company profiles — so the platform remains responsive even under tight rate limits. Data from all providers is normalized into a common quote shape before being consumed by components.

---

## Taxonomy System

Every asset on GMT lives inside a three-tier hierarchy: **Group → Subgroup → Asset**. A Group is the broadest classification (e.g., *Equities*, *Fixed Income*). A Subgroup segments a Group into a meaningful market category (e.g., *Technology*, *Treasuries*). An Asset is an individual ticker tracked within a Subgroup. This mirrors the way institutional investors like MSCI and S&P GICS classify the market, making the structure immediately legible to finance professionals while enabling systematic filtering, heatmap rendering, and per-group macro data display.

```
Equities
├── 🛡  Aerospace & Defense     (GICS: Industrials / A&D)
├── 🔋  Clean Energy            (Thematic: EVs + renewables + utilities)
├── 🛒  Consumer                (GICS: Consumer Discretionary + Staples)
├── 🏦  Financials              (GICS: Financials)
├── 💊  Health Care             (GICS: Health Care)
├── 🛢  Oil & Gas               (GICS: Energy)
├── 🏢  Real Estate             (GICS: Real Estate)
├── 🔬  Semiconductors          (GICS: IT / Semiconductors)
├── ⚡  Technology              (GICS: Information Technology + Comm. Svcs.)
├── 🇧🇷  Brazil Equities         (B3 / Bovespa)
└── 🌍  Emerging Markets        (EM ETFs: EWZ, INDA, MCHI, EWY)

Currencies
└── 💱  Foreign Exchange        (8 major FX pairs)

Indices
└── 🌐  Global Indices          (8 global benchmark indices)

Digital Assets
└── 🪙  Crypto                  (BTC, ETH, SOL via CoinGecko)

Commodities
├── 🥇  Precious Metals         (Gold, silver, platinum ETFs + futures)
├── 🛢  Energy Commodities      (Crude oil, natural gas ETFs + futures)
└── 🌾  Agriculture             (Corn, wheat, soybean commodity ETFs)

Fixed Income
├── 💰  Dividend Income         (High-yield dividend ETFs)
├── 🏛  Treasuries              (US Treasury ETFs across maturity spectrum)
└── 📄  Bonds                   (Investment-grade + high-yield corporate bond ETFs)
```

**6 Groups · 20 Subgroups · 126 Assets**

The taxonomy is stored in SQLite and served via `GET /api/v1/taxonomy`. Admins can restructure it at runtime through the Admin Taxonomy Manager — creating and renaming Groups and Subgroups, and relocating assets when a Subgroup is deleted. The static files in `src/data/` represent the seed state and serve as the offline fallback; they should not be edited manually. Use the admin UI at `/admin/taxonomy` instead.

---

## API Reference

All endpoints are prefixed with `/api/v1`. Authenticated endpoints require an `Authorization: Bearer <token>` header. Admin endpoints additionally require `role: admin` in the JWT payload.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | None | Create a new `user` account. Rate limited: 5 req / 15 min / IP. |
| `POST` | `/auth/login` | None | Authenticate and receive a JWT (8h expiry). |
| `POST` | `/auth/logout` | None | Client-side logout signal (stateless — token is discarded client-side). |
| `GET`  | `/auth/me` | Bearer | Returns the authenticated user's profile from the JWT payload. |

### Taxonomy — Read (any authenticated user)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/taxonomy` | Bearer | Full nested tree: Groups → Subgroups → Assets (single query). |
| `GET` | `/groups` | Bearer | All Groups with subgroup count. |
| `GET` | `/groups/:id` | Bearer | Single Group by ID. |
| `GET` | `/subgroups` | Bearer | All Subgroups, optionally filtered by `?group_id=`. |
| `GET` | `/subgroups/:id` | Bearer | Single Subgroup by ID. |
| `GET` | `/assets` | Bearer | All Assets, optionally filtered by `?subgroup_id=` or `?group_id=`. |

### Taxonomy — Write (admin only)

| Method   | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| `POST`   | `/groups` | Admin | Create a new Group. |
| `PUT`    | `/groups/:id` | Admin | Update a Group. |
| `DELETE` | `/groups/:id` | Admin | Delete a Group (must have no subgroups). |
| `POST`   | `/subgroups` | Admin | Create a new Subgroup. |
| `PUT`    | `/subgroups/:id` | Admin | Update a Subgroup. |
| `DELETE` | `/subgroups/:id` | Admin | Delete a Subgroup (assets must be relocated first). |
| `PATCH`  | `/assets/:id/relocate` | Admin | Move an asset to a different subgroup. |

### Utility

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Returns `{ status: "ok", ts: <epoch> }`. |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone and install

```bash
git clone <repo-url>
cd markets-dashboard
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your API keys (see `.env.example` for required variables). At minimum, set `JWT_SECRET` to a strong random string. All data provider keys are optional — the terminal degrades gracefully when keys are absent.

### 3. Start the full stack

```bash
npm run start:full
```

This runs three processes concurrently:

| Process | Script | Port | Purpose |
|---------|--------|------|---------|
| `proxy` | `npm run server` | `:3001` | Yahoo Finance proxy (crumb/cookie session handler) |
| `api` | `npm run start:server` | `:4000` | Express REST API + SQLite backend |
| `vite` | `npm run dev` | `:5173` | React frontend dev server |

The Express server seeds the database on first boot (admin user + full taxonomy) and prints a startup banner confirming all routes are mounted.

### 4. Open the app

- **Landing page:** [http://localhost:5173](http://localhost:5173)
- **Dashboard:** [http://localhost:5173/app](http://localhost:5173/app) *(requires login)*
- **Admin panel:** [http://localhost:5173/admin/taxonomy](http://localhost:5173/admin/taxonomy) *(requires admin role)*

### Default admin credentials

```
Email:    admin@terminal.local
Password: Admin1234!
```

> ⚠️ Change the default admin password immediately after first login.

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run start:full` | Start all three processes (recommended) |
| `npm run start:server` | Start Express API only |
| `npm run server` | Start Yahoo Finance proxy only |
| `npm run dev` | Start Vite frontend only |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run Vitest test suite |

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for signing JWTs. Use a long random string in production. |
| `VITE_FINNHUB_KEY` | No | Finnhub API key. Without it, news and analyst data will be unavailable. |
| `VITE_FMP_KEY` | No | Financial Modeling Prep API key. Without it, fundamental data is unavailable. |
| `VITE_ALPHA_VANTAGE_KEY` | No | Alpha Vantage key. RSI/MACD endpoints are dormant until activated. |
| `VITE_FRED_KEY` | No | FRED API key. Without it, macro data uses anonymous IP-rate-limited access. |
| `VITE_BRAPI_KEY` | No | BRAPI key for Brazilian B3 data. |

---

## Development Notes

**Taxonomy changes:** Always use the admin UI at `/admin/taxonomy` to modify the taxonomy. Do not edit `src/data/*.js` directly — those files are the seed source and offline fallback only. The database is the source of truth at runtime.

**Adding a new data provider:** Register the API in `src/services/apiRegistry.js` with its limits, endpoints, and cache TTLs. Add fetch functions to `src/dataServices.js`. Add a Vite proxy rule in `vite.config.js`. The quota tracker and deferred queue work automatically for any registered API.

**API quota awareness:** The platform is built to work within the free tiers of all providers. See `QUOTA_MANAGEMENT.md` for a detailed breakdown of the quota tracking architecture, cache TTL rationale, and upgrade paths for each provider.

**React state model:** JWT tokens are stored in React component state only — they are lost on page refresh by design. There is no `localStorage` or `sessionStorage` usage for auth tokens.

---

<div align="center">

Built with React, Express, SQLite, and a lot of `console.log` debugging.

</div>
