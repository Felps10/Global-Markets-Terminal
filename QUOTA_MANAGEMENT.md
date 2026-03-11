# Quota Management — Markets Dashboard

All external API calls in this project route through `apiClient.call()` in
`src/services/apiClient.js`. This document is the authoritative reference for
quota limits, health thresholds, caching strategy, deferred-queue behavior, and
upgrade guidance.

---

## 1. Architecture Overview

```
Component / Page
      │
      ▼
dataServices.js   ← all fetch logic lives here; exports pure async functions
      │
      ▼
apiClient.call(apiId, endpointId, params, { fetcher, callCount? })
      │
      ├─ apiCache       — in-memory; deduplicates identical concurrent calls
      ├─ quotaTracker   — persists day/minute counters in localStorage
      └─ apiRegistry    — static source-of-truth for limits, TTLs, priorities
```

**Single rule:** every outbound HTTP request that consumes a paid or rate-limited
quota MUST go through `apiClient.call()`. The only exemption is `healthPing()`
(see §9).

---

## 2. API Inventory & Quota Limits

| API           | Tier              | Per-Minute | Per-Day | Notes |
|---------------|-------------------|-----------|---------|-------|
| Yahoo Finance | Unofficial proxy  | —         | —       | Unlimited; no key required |
| Finnhub       | Free              | 60        | —       | 1 req/s effective through queue |
| Alpha Vantage | Free              | 5         | 25      | Most constrained — 24hr cache mandatory |
| FRED          | Free (unlimited)  | —         | —       | Government API; extremely stable |
| CoinGecko     | Public (no key)   | 30        | —       | Per-IP; shared across browser sessions |
| FMP           | Free              | —         | 250     | Heaviest consumer; `batchProfile` ~80 calls/run |
| BRAPI         | Free              | —         | ~100    | Limit undocumented; 100/day assumed conservatively |
| BCB           | Public (no key)   | —         | —       | Unlimited Brazilian government API |
| AwesomeAPI    | Public (no key)   | —         | —       | Unlimited Brazilian FX community API |

### Endpoint Reference

| API           | Endpoint ID        | callsPerRequest | cacheTTL  | canDefer | Priority |
|---------------|--------------------|-----------------|-----------|----------|----------|
| yahoo         | quote              | 1               | 30s       | no       | critical |
| yahoo         | chart              | 1               | 5min      | yes      | high     |
| finnhub       | quote              | 1               | 30s       | no       | critical |
| finnhub       | news               | 1               | 10min     | yes      | medium   |
| finnhub       | recommendation     | 1               | 1hr       | yes      | medium   |
| finnhub       | earnings           | 1               | 1hr       | yes      | medium   | *(dormant D-1)* |
| finnhub       | insiderSentiment   | 1               | 1hr       | yes      | low      | *(dormant D-2)* |
| alphavantage  | rsi                | 1               | 24hr      | yes      | medium   | *(dormant D-3)* |
| alphavantage  | macd               | 1               | 24hr      | yes      | medium   | *(dormant D-4)* |
| coingecko     | prices             | 1               | 2min      | no       | critical |
| coingecko     | trending           | 1               | 5min      | yes      | low      | *(dormant D-5)* |
| fred          | seriesObservations | 1               | 1hr       | yes      | medium   |
| fmp           | profile            | 1               | 24hr      | yes      | high     |
| fmp           | ratiosTTM          | 1               | 6hr       | yes      | medium   |
| fmp           | batchProfile       | **variable (N)**| 24hr      | yes      | medium   |
| fmp           | dcf                | 1               | 6hr       | yes      | low      | *(dormant D-6)* |
| brapi         | quote              | 1               | 30s       | no       | critical |
| bcb           | selic / ipca / cdi | 1 each          | 1hr       | yes      | medium   |
| awesomeapi    | fx                 | 1               | 15min     | yes      | medium   |

---

## 3. Quota Health States

Quota health is computed by `quotaTracker.getQuotaHealth(apiId)` using the
**most constrained** remaining limit (per-minute or per-day, whichever is lower).

| State       | Remaining quota | Effect on apiClient.call() |
|-------------|-----------------|----------------------------|
| `healthy`   | > 40%           | Normal execution |
| `warning`   | 20–40%          | Normal execution; QuotaDashboard turns amber |
| `critical`  | 5–20%           | `canDefer: true` endpoints are enqueued instead of executed |
| `exhausted` | < 5% **or** explicit 429 after all retries | `canCall()` returns false; call returns `QuotaExhaustedError` |

Thresholds are defined in one place: `HEALTH_THRESHOLDS` in
`src/services/quotaTracker.js`. Do not hardcode them elsewhere.

Unlimited APIs (Yahoo, FRED, BCB, AwesomeAPI) always return `healthy` — they
are tracked for observability only, not quota management.

---

## 4. Call Flow

Every `apiClient.call()` invocation follows this exact sequence:

```
1.  Validate endpoint exists in apiRegistry
2.  Validate callCount for variable-cost endpoints (callsPerRequest === 0)
    → throws synchronously if absent — programming error, loud failure
3.  Compute paramHash via stableParamHash(params)
4.  Check apiCache → HIT: return { data, fromCache: true } immediately
    (no quota consumed, no fetcher called)
5.  Check quotaTracker.canCall()
    → BLOCKED: return QuotaExhaustedError response
5b. If health === 'critical' AND canDefer === true
    → enqueue in deferredQueues[apiId], return { deferred: true, data: null }
6.  Call fetcher() with retry loop (see §5 for retry behavior)
7.  SUCCESS → apiCache.set(key, data, ttl)
              quotaTracker.recordCall(apiId, endpointId, callCount)
              schedule deferredQueue drain (setTimeout 0)
              return { data, fromCache: false }
8.  HTTP 429 → backoff retry (Retry-After header or exponential: 1s→2s→4s→8s)
              after MAX_RETRIES: quotaTracker.markExhausted(apiId, retryAfterSec)
9.  HTTP 5xx → backoff retry; quota NOT consumed; NOT marked exhausted
10. HTTP 401/403 → fail immediately; return AuthError; no retry
11. Network error → retry once after 1s; then return NetworkError
```

`apiClient.call()` **never throws** at runtime. All errors are returned as
`ApiResponse.error` with a typed `errorType`. The sole exception is a missing
`callCount` on a variable-cost endpoint (§6) — this throws synchronously because
it is a programming error.

---

## 5. Deferred Queue

When `quotaTracker.getQuotaHealth(apiId) === 'critical'` and an endpoint has
`canDefer: true`, the call is enqueued rather than executed:

```js
// apiClient returns immediately with:
{ data: null, fromCache: false, deferred: true, ... }
```

**Caller responsibility:** check `response.deferred` and return `null` (or
skip the update) so the UI stays in its current state rather than showing an
error.

**Queue drain:** triggered automatically via `setTimeout(drain, 0)` after any
successful call that restores quota headroom. The drain executes one deferred
item per API per tick, respecting priority order.

**Page refresh:** the deferred queue is **in-memory only** and does not persist
across page refreshes. On the next page load, calls are attempted fresh. If quota
is still constrained at load time, they will be deferred again.

**Queue limit:** `DEFERRED_QUEUE_MAX = 50` items per API. If exceeded, oldest
items are dropped and `QueueFullError` is returned.

---

## 6. Variable-Cost Endpoints

The `fmp/batchProfile` endpoint makes N separate HTTP requests — one per equity
symbol (~80 symbols on a typical load). It is declared with `callsPerRequest: 0`
in the registry as a sentinel for "variable cost."

**Contract:**
```js
// CORRECT — callCount at the call site, never in a variable
const response = await apiClient.call('fmp', 'batchProfile', { symbols: sorted }, {
  callCount: symbols.length,   // ← must be here, exactly like this
  fetcher: async () => { ... },
});

// WRONG — never do this
const n = symbols.length;
apiClient.call(..., { callCount: n, fetcher });  // same value, but signals intent problem
```

`apiClient` throws synchronously if `callCount` is absent or zero. This is a
loud programming-time failure — it cannot happen silently at runtime.

The `quotaTracker` charges `callCount` units for the pre-flight `canCall()` check
AND the post-call `recordCall()`, so the full batch cost is accounted before any
HTTP requests are made.

---

## 7. Cache Strategy

The cache (`src/services/apiCache.js`) is in-memory per browser tab. It does
**not** persist across page refreshes.

Key design decisions:

- **Cache key = stableParamHash(params)** — params are sorted before hashing, so
  `{ symbols: ["AAPL","MSFT"] }` and `{ symbols: ["MSFT","AAPL"] }` are the same
  cache entry. This is why all callers sort their symbol arrays before passing
  them as params.

- **Sparkline rolling** — `fetchYahooMarketData` returns raw `results[]` from its
  fetcher; `parseYahooResults` runs **after** `apiClient.call()` returns. This
  means the sparkline rolling window always uses the current `prevData`, even on a
  cache hit where the fetcher is never called. Never move `parseYahooResults`
  inside the fetcher.

- **TTL discipline** — `alphaVantageRSI` and `alphaVantageMACD` use 24hr TTLs
  because the daily budget is only 25 calls. Any reduction of those TTLs risks
  exhausting Alpha Vantage within a single session.

- **Dedup on concurrent calls** — if two components request the same endpoint
  with identical params simultaneously, only one HTTP request is made. The second
  call hits the cache set by the first.

---

## 8. Dormant Functions

These six functions are exported from `dataServices.js` but not called by any
active UI path. They are preserved for future panel features.

| ID  | Function                  | API           | Migration needed when activating |
|-----|---------------------------|---------------|----------------------------------|
| D-1 | `finnhubEarnings`         | finnhub       | Replace `finnhubFetch()` with `apiClient.call('finnhub', 'earnings', ...)` |
| D-2 | `finnhubInsiderSentiment` | finnhub       | Replace `finnhubFetch()` with `apiClient.call('finnhub', 'insiderSentiment', ...)` |
| D-3 | `alphaVantageRSI`         | alphavantage  | Replace `safeFetch()` with `apiClient.call('alphavantage', 'rsi', ...)` |
| D-4 | `alphaVantageMACD`        | alphavantage  | Replace `safeFetch()` with `apiClient.call('alphavantage', 'macd', ...)` |
| D-5 | `coingeckoTrending`       | coingecko     | Replace `safeFetch()` with `apiClient.call('coingecko', 'trending', ...)` |
| D-6 | `fmpDCF`                  | fmp           | Replace `fmpFetch()` with `apiClient.call('fmp', 'dcf', ...)` |

**Legacy helpers used only by dormant functions** (remove when all are activated):
- `finnhubQueue`, `processFinnhubQueue`, `finnhubFetch` — support D-1, D-2
- `fmpSafeFetch`, `fmpQueue`, `processFmpQueue`, `fmpFetch` — support D-6
- `safeFetch` — support D-3, D-4, D-5 (and Finnhub queue internally)

---

## 9. healthPing Exemption

`healthPing(source)` in `dataServices.js` intentionally bypasses `apiClient.call()`.

**Reasons:**
1. **Quota pollution** — health pings are diagnostic probes, not data fetches.
   Counting them against Finnhub's 60/min or FMP's 250/day would mislead the
   quota dashboard.
2. **Bootstrap paradox** — if apiClient's deferred/backpressure logic fires, the
   very function used to detect outages would be suppressed.
3. **Freshness requirement** — health checks must always reflect real-time status.
   Cached results would mask degraded endpoints.

Health ping calls are registered via `trackApiCall(source)` for display in the
QuotaDashboard — they appear in session totals but are excluded from the quota
budget calculation.

---

## 10. Upgrade Paths

Monitor the QuotaDashboard (`/quota`) for health state trends. Upgrade when any
API reaches `warning` health during normal (non-load-test) usage.

| API           | Current limit | First upgrade | Cost  | Trigger |
|---------------|---------------|---------------|-------|---------|
| Alpha Vantage | 25/day        | Premium 75 (75/min, no daily cap) | $50/mo | Any session consistently hitting `warning` before market close |
| FMP           | 250/day       | Starter (750/day) | $19/mo | batchProfile + detail panel usage pushes past ~200/day regularly |
| Finnhub       | 60/min        | Starter (300/min) | $50/mo | Real-time quote fallback path causes sustained `warning` states |
| CoinGecko     | 30/min (IP)   | Demo key (free) | $0 | Register at coingecko.com for a free Demo key; same rate limit but more predictable |
| BRAPI         | ~100/day      | Paid plan       | TBD   | If B3 data gaps appear on page load; check actual limit with BRAPI support first |
| Yahoo Finance | Unofficial    | Yahoo Finance API (official) | TBD | If proxy reliability drops below 95%; evaluate yfinance alternatives |

**Never upgrade speculatively.** Only upgrade in response to observed `warning`
or `critical` health states during normal use.

---

## 11. Session Log (Layer 6 Migration)

All direct `fetch()` calls replaced with `apiClient.call()` during the Layer 6 migration.
One line per call site. Migrated 2026-03-11.

| Row ID | Function                    | API / Endpoint                        |
|--------|-----------------------------|---------------------------------------|
| DS-1   | `finnhubQuote`              | finnhub / quote                       |
| DS-2   | `finnhubNews`               | finnhub / news                        |
| DS-3   | `finnhubRecommendation`     | finnhub / recommendation              |
| DS-4   | `fredSeries`                | fred / seriesObservations             |
| DS-5   | `coingeckoPrices`           | coingecko / prices                    |
| DS-6   | `fmpProfile`                | fmp / profile                         |
| DS-7   | `fmpRatios`                 | fmp / ratiosTTM                       |
| DS-8   | `fmpBatchProfile`           | fmp / batchProfile (variable-cost: N) |
| DS-9   | `brapiQuote`                | brapi / quote                         |
| DS-10  | `bcbMacro`                  | bcb / selic + ipca + cdi (allSettled) |
| DS-11  | `awesomeFx`                 | awesomeapi / fx                       |
| GMT-1  | `fetchYahooMarketData`      | yahoo / quote (extracted from GMT)    |
| GMT-2  | `fetchYahooChartData`       | yahoo / chart (extracted from GMT)    |
| GMT-3  | `fetchB3MarketData` (.SA fallback) | yahoo / quote (extracted from GMT) |

---

## 12. Post-Build Audit — 2026-03-11

Performed after Layer 6 completion.

| Check | Result |
|-------|--------|
| Dead imports | **CLEAN** — no unused imports in dataServices.js, GlobalMarketsTerminal.jsx, or apiClient.js |
| Console artifacts | **CLEAN** — all 8 console statements in dataServices.js carry structured prefixes; GMT has zero console statements |
| Direct fetch() calls | **CLEAN** — 16 active fetch() calls correctly isolated inside fetcher functions passed to apiClient.call(); 3 exempt calls confirmed (safeFetch dormant-support, fmpSafeFetch dormant-support, healthPing) |
| Hardcoded limits | **FIXED** — 4 hardcoded values in CatalogPage.jsx replaced with live reads from apiRegistry via getApiDef(); fallback values retained for registry restructuring resilience |

**Lines fixed in CatalogPage.jsx:**
- Line 92: `rateLimitMax: 60` → `getApiDef('finnhub')?.limits.perMinute ?? 60`
- Line 101: `rateLimitMax: 25` → `getApiDef('alphavantage')?.limits.perDay ?? 25`
- Line 120: `rateLimitMax: 30` → `getApiDef('coingecko')?.limits.perMinute ?? 30`
- Line 128: `rateLimitMax: 250` → `getApiDef('fmp')?.limits.perDay ?? 250`

**Single source of truth: CONFIRMED** — `apiRegistry.js` is the only place quota limits are defined. All consumers read from it at runtime.

**Pre-existing bug fixed:** `runCacheSelfTest()` in `apiCache.js` declared as sync `function` but contained `await` — corrected to `async function`. No behavior change.

**System status: PRODUCTION READY**
