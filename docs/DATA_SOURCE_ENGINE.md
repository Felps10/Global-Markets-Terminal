# Data Source Engine — design spec

Status: **DRAFT for review** · Owner: Felipe · Created 2026-07-04

A configurable provider-precedence system for market quotes. Every asset resolves to
an ordered list of providers ("try BRAPI, then Yahoo"); the server fetches all needed
providers, merges by the effective order into one normalized quote per symbol, and an
admin tunes the order per Group/Subgroup in Settings — starting from baked-in
**recommended** defaults.

This supersedes the hardcoded routing introduced in PR #8 (which fixed live-quote
coverage 43 → 191/193 by deriving the Yahoo/CoinGecko symbol set from the taxonomy).

---

## 1. Goals & decisions (resolved)

| # | Decision | Choice |
|---|---|---|
| D1 | Precedence scope | **Global** (admin-set in Settings). The live quote cache is shared across users, so the server pre-merges once. Per-user is a future option, not v1. |
| D2 | Where precedence resolves | **Server-side**, into a normalized `quotes[symbol] = {price, changePct, source, ts}` map exposed by `/api/v1/quotes/live`. Frontend stops merging per-provider arrays. |
| D3 | Default sourcing | **Hybrid / free** for now (no BRAPI/FMP paid plan yet): Yahoo-first for B3 with BRAPI-free as fallback. Engine supports flipping to BRAPI-first / FMP-first later via config only. |
| D4 | Config location | **Code** capability matrix + recommended defaults; **DB** for admin overrides. |
| D5 | Granularity | Effective order resolves **subgroup → group → global default → recommended**, then filtered to providers capable of the asset's class. |

Non-goals for v1: per-user precedence; wiring FMP/Finnhub live fetchers; BRAPI paid batch.

---

## 2. Provider capability matrix (code)

Declares what each provider *can* serve + its constraints, so the UI never offers an
impossible or unavailable choice.

| Provider | Serves | Batch / limits | Status |
|---|---|---|---|
| **Yahoo** (v7) | US & global equities, indices (`^`), FX (`=X`), commodities (`=F`), ETFs, B3 (`.SA`) | ~50/req (chunked); needs crumb/cookie session + `--max-http-header-size=65536`; ~15-min delayed | **LIVE** (quoteFetchManager) |
| **CoinGecko** | Crypto (`meta.cgId`) | free; 1 call, many ids | **LIVE** |
| **BCB SGS** | BR macro & rates (`exchange='BCB'`, `meta.bcbSeries`) | 1 call/series; DB-driven | **LIVE** (bcbService, `/api/v1/brazil`) |
| **AwesomeAPI** | BRL FX pairs | free | **LIVE** (bcbService) |
| **BRAPI** | B3 equities/FIIs/ETFs/indices | **Free: 1 ticker/req, 15k/mo** · Startup R$99,99 (10/req, 150k/mo, 15-min) · Pro R$116,66 (20/req, 500k/mo, 5-min) | **snapshot + proxy only** — needs a live fetcher |
| **FMP** | US fundamentals/quotes | paid tiers | proxy only — not wired |
| **Finnhub** | quotes/fundamentals | paid tiers | proxy only — not wired |
| **FRED** | US macro | free | proxy only — no US-macro assets today |

Capability is expressed as: `PROVIDER_CAPS = { yahoo: ['equity','index','fx','commodity','etf','b3'], brapi: ['b3'], coingecko: ['crypto'], bcb: ['br-macro','br-fx'], ... }`. An asset's "class" is derived from `type` / `exchange` / `meta` (already validated: `exchange='B3'`, `meta.cgId`, `exchange='BCB'`, else Yahoo-formatted `symbol`).

---

## 3. Recommended precedence (baked-in defaults)

The "Recommended" badge in Settings. Shows the *ideal* order; notes when it needs a paid
plan and what the *effective* free order is until then.

| Asset class (subgroups) | Recommended | Effective today (free) |
|---|---|---|
| US equity sectors (technology, financials, healthcare, semiconductors, consumer, industrials, aerospace, automobile, biotech, cleanenergy, oil-gas, reits, emerging) | Yahoo → FMP | Yahoo |
| Indices, FX, commodities (indices, fx, precious-metals, energy-commodities, agriculture), fixed-income ETFs (treasuries, bonds, credit, dividend-income) | Yahoo | Yahoo |
| Crypto (crypto) | CoinGecko → Yahoo | CoinGecko |
| **B3 equities** (brazil-highlights + br-bancos/petroleo/mineracao/agronegocio/varejo/utilities/transporte/industria/construcao/saude/telecom/outros) | **BRAPI → Yahoo `.SA`** *(needs BRAPI Startup/Pro)* | **Yahoo `.SA` → BRAPI-free (fallback for misses)** |
| **B3 FIIs / ETFs** (br-fiis, br-etfs) | **BRAPI → Yahoo `.SA`** | Yahoo `.SA` → BRAPI-free |
| BR indices (br-indices) | BRAPI → Yahoo (`^BVSP`) | Yahoo → BRAPI-free |
| BR macro & rates (br-macro-indicadores, br-juros, br-credito, br-titulos) | BCB | BCB |
| BR FX (br-cambio) | AwesomeAPI/BCB → Yahoo | AwesomeAPI/BCB |

---

## 4. Config model

**Storage:** new table `data_source_config` (single global row; admin-writable, public-read),
or equivalent. RLS: read = anyone/authenticated; write = admin only. Written by the Settings
UI, read by the server merge (cached, ~5-min TTL like `symbolResolver`).

**Shape:**
```jsonc
{
  "version": 1,
  "global": ["yahoo", "coingecko", "brapi"],        // capability-filtered per asset
  "groups":    { "br-mercado": ["brapi", "yahoo"] },
  "subgroups": { "crypto": ["coingecko"], "br-fiis": ["brapi", "yahoo"] }
}
```

**Resolution for an asset** (in `resolvePrecedence(asset)`):
1. `order = subgroups[asset.subgroup_id] ?? groups[asset.group_id] ?? global`
2. filter `order` to providers whose `PROVIDER_CAPS` include the asset's class
3. if empty → fall back to the **recommended** order for that class
4. return the ordered, capability-valid provider list

---

## 5. Server fetch/merge engine

**Fetchers** (in `quoteFetchManager`): keep Yahoo + CoinGecko + BCB; **add a live BRAPI
fetcher** honoring the plan's tickers-per-request (config `BRAPI_BATCH = 1|10|20`) and a
slower cadence for the free tier (only fetch the B3 symbols that are *fallbacks* — i.e.
tickers Yahoo didn't return — until upgraded).

**Merge** (`buildQuotesMap`): each cycle, for every active asset, walk its resolved
precedence and take the first provider that returned a usable value:
```
quotes[displaySymbol] = { price, changePct, source: 'brapi'|'yahoo'|..., ts, sparkline? }
```
Expose via `/api/v1/quotes/live` as `{ quotes, meta }` (keep `yahoo`/`crypto` arrays
during a transition window for backward-compat, then remove).

**Frontend:** `parseYahooResults` + the crypto merge collapse into reading `quotes[sym]`.
`marketData[sym] = quotes[sym]`. A `source` badge per card becomes possible (nice-to-have).

---

## 6. Settings "Data Sources" panel (admin)

- Sectioned by Group → Subgroup. Each row: current order (chips, drag-to-reorder) + a
  **Recommended** hint + "Reset to recommended".
- Providers not capable of that class are hidden; providers needing a paid plan are shown
  disabled with a "requires BRAPI Pro / FMP" note.
- A **global default** control at top. "Reset all to recommended."
- Saves the config JSON via an admin endpoint (`PUT /api/v1/config/data-sources`,
  `requireAdmin`). Read via `GET /api/v1/config/data-sources`.
- Live "source" indicator (optional): show which provider each subgroup is *actually*
  resolving to right now.

---

## 7. Phases

- **Phase A — Routing core + normalized map (server).** Capability matrix, recommended
  defaults, `resolvePrecedence`, live BRAPI-free fallback fetcher, `buildQuotesMap`,
  `/quotes/live` normalized shape. Runs on recommended defaults (no config table yet).
  *Also completes the data fix:* recovers JBSS3/EMBR3 and extends coverage to the Brazil
  terminal. **← build first.**
- **Phase B — Config store + API.** `data_source_config` table + RLS migration; GET/PUT
  admin endpoints; server merge reads the config.
- **Phase C — Settings "Data Sources" UI.** The admin panel above.
- **Phase D — Future providers.** Live FMP/Finnhub fetchers; BRAPI→primary + real batch
  when the plan is upgraded (config-only flip).

## 8. Verification

- Phase A: `curl .../quotes/live | jq '.quotes | length'` ≈ 193 (global) with `.source`
  populated; B3 subgroups fully covered (JBSS3/EMBR3 present, `source:'brapi'`); Brazil
  terminal subgroups fill in. Regression: US/crypto unchanged.
- Phase C: changing a subgroup's order in Settings changes the `source` of its cards after
  the next cache cycle.

## 9. Open questions

- Per-user precedence (deferred; would require exposing per-provider values).
- BRAPI free-tier budget for the *fallback* set — confirm how many B3 tickers Yahoo drops
  across the Brazil terminal (governs whether free fallback stays under 15k/mo).
- Sparkline/history source (Yahoo v8 chart) is separate from quotes — out of scope here.
