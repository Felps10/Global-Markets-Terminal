/**
 * @fileoverview API Cache — In-memory TTL cache with stale-while-revalidate.
 *
 * All cache TTLs are read from apiRegistry. Callers never specify TTL directly.
 * Endpoints with cacheTTL: 0 are never cached — get() always returns a miss,
 * set() is a no-op.
 *
 * STALE-WHILE-REVALIDATE:
 *   Fresh  (age < TTL)        → serve from cache immediately
 *   Stale  (TTL ≤ age < 2×TTL) → serve stale + trigger background refresh callback
 *   Expired (age ≥ 2×TTL)    → treat as miss, delete entry, require fresh fetch
 *
 * CACHE KEY FORMAT: {apiId}:{endpointId}:{paramHash}
 *   paramHash = stable JSON.stringify with keys sorted alphabetically.
 *   Two callers with the same params in different key order → same cache key.
 *
 * SHARED CACHE: This module is a singleton (module-level state).
 *   All consumers of the same endpoint+params hit the same cache entry.
 *   Two components requesting identical data → exactly one API call.
 *
 * NO BACKGROUND TIMER:
 *   Expired entries are evicted lazily on access and via clearExpired().
 *   This is intentional for a personal dashboard — no timer overhead needed.
 *
 * @module apiCache
 */

import { getEndpointDef, getDormantEndpoints, API_REGISTRY } from './apiRegistry.js';

// ─── Cache Store ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CacheEntry
 * @property {*} data
 * @property {number} ts         - Timestamp (ms) when entry was stored
 * @property {string} apiId
 * @property {string} endpointId
 * @property {string} paramHash
 */

/** @type {Map<string, CacheEntry>} */
const cache = new Map();

// ─── Stats Store ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EndpointStats
 * @property {string} apiId
 * @property {string} endpointId
 * @property {number} hits
 * @property {number} misses
 * @property {number} staleServed
 * @property {number} bgRefreshTriggered
 */

/** @type {Record<string, EndpointStats>} */
const statsStore = {};

/** @param {string} apiId @param {string} endpointId @returns {string} */
function statKey(apiId, endpointId) {
  return `${apiId}:${endpointId}`;
}

/** @param {string} apiId @param {string} endpointId @returns {EndpointStats} */
function getStat(apiId, endpointId) {
  const k = statKey(apiId, endpointId);
  if (!statsStore[k]) {
    statsStore[k] = { apiId, endpointId, hits: 0, misses: 0, staleServed: 0, bgRefreshTriggered: 0 };
  }
  return statsStore[k];
}

// ─── Stable Param Hash ────────────────────────────────────────────────────────

/**
 * Produce a stable, order-independent string hash for a params value.
 * Object keys are sorted alphabetically before serialization.
 *
 * Examples:
 *   stableParamHash({ b: 2, a: 1 }) === stableParamHash({ a: 1, b: 2 }) // true
 *   stableParamHash("AAPL")         // '"AAPL"'
 *   stableParamHash(null)           // 'null'
 *
 * @param {*} params - Any JSON-serializable value
 * @returns {string}
 */
export function stableParamHash(params) {
  if (params === null || params === undefined) return "null";
  if (typeof params !== "object" || Array.isArray(params)) return JSON.stringify(params);
  const sorted = {};
  Object.keys(params).sort().forEach(k => { sorted[k] = params[k]; });
  return JSON.stringify(sorted);
}

// ─── Cache Key ────────────────────────────────────────────────────────────────

/** @param {string} apiId @param {string} endpointId @param {string} paramHash @returns {string} */
function makeCacheKey(apiId, endpointId, paramHash) {
  return `${apiId}:${endpointId}:${paramHash}`;
}

// ─── TTL Helper ───────────────────────────────────────────────────────────────

/** @param {string} apiId @param {string} endpointId @returns {number} milliseconds */
function getTTLms(apiId, endpointId) {
  const ep = getEndpointDef(apiId, endpointId);
  return ep ? ep.cacheTTL * 1000 : 0;
}

// ─── Core Operations ──────────────────────────────────────────────────────────

/**
 * Check whether a FRESH (non-stale) cache entry exists for the given param hash.
 * Returns false for stale entries — caller must still decide whether to fetch fresh
 * or accept stale via get().
 *
 * Used by quotaTracker.hasValidCache() for pre-call quota decisions.
 * If this returns true, the call can be skipped entirely — quota is not consumed.
 *
 * @param {string} apiId
 * @param {string} endpointId
 * @param {string} paramHash - Pre-computed hash from stableParamHash()
 * @returns {boolean}
 */
export function hasValidCache(apiId, endpointId, paramHash) {
  const ttlMs = getTTLms(apiId, endpointId);
  if (ttlMs === 0) return false; // Non-cacheable endpoint

  const key = makeCacheKey(apiId, endpointId, paramHash);
  const entry = cache.get(key);
  if (!entry) return false;

  return Date.now() - entry.ts < ttlMs; // True only for genuinely fresh entries
}

/**
 * Retrieve a cached response for the given API call.
 *
 * Return values:
 *   { data, fromCache: true,  stale: false }  — fresh cache hit
 *   { data, fromCache: true,  stale: true  }  — stale hit; background refresh triggered if callback provided
 *   { data: null, fromCache: false }           — miss (or cacheTTL: 0 endpoint)
 *
 * STALE-WHILE-REVALIDATE:
 *   If the entry is stale (TTL ≤ age < 2×TTL), returns stale data immediately
 *   and calls refreshCallback() asynchronously in the background.
 *   refreshCallback should fetch fresh data and call apiCache.set() with the result.
 *   If no callback is supplied, stale data is returned without triggering a refresh.
 *
 * @param {string} apiId
 * @param {string} endpointId
 * @param {*} params                  - Raw call params; hash computed internally
 * @param {Function} [refreshCallback] - Async fn supplied by apiClient for background refresh
 * @returns {{ data: any, fromCache: boolean, stale: boolean }}
 */
export function get(apiId, endpointId, params, refreshCallback) {
  const ttlMs = getTTLms(apiId, endpointId);
  const stat  = getStat(apiId, endpointId);

  if (ttlMs === 0) {
    stat.misses++;
    return { data: null, fromCache: false, stale: false };
  }

  const paramHash = stableParamHash(params);
  const key       = makeCacheKey(apiId, endpointId, paramHash);
  const entry     = cache.get(key);

  if (!entry) {
    stat.misses++;
    return { data: null, fromCache: false, stale: false };
  }

  const age = Date.now() - entry.ts;

  // ── Fresh hit ─────────────────────────────────────────────────────────────
  if (age < ttlMs) {
    stat.hits++;
    return { data: entry.data, fromCache: true, stale: false };
  }

  // ── Stale-but-usable (TTL ≤ age < 2×TTL) — serve + background refresh ───
  if (age < ttlMs * 2) {
    stat.hits++;
    stat.staleServed++;
    if (refreshCallback) {
      stat.bgRefreshTriggered++;
      Promise.resolve()
        .then(() => refreshCallback())
        .catch(err =>
          console.warn(`[ApiCache] Background refresh failed (${apiId}/${endpointId}):`, err.message)
        );
    }
    return { data: entry.data, fromCache: true, stale: true };
  }

  // ── Expired (age ≥ 2×TTL) — evict and treat as miss ──────────────────────
  cache.delete(key);
  stat.misses++;
  return { data: null, fromCache: false, stale: false };
}

/**
 * Store a response in the cache.
 * Silent no-op if the endpoint has cacheTTL: 0.
 *
 * @param {string} apiId
 * @param {string} endpointId
 * @param {*} params  - Raw call params; hash computed internally
 * @param {*} data    - Response data to store
 */
export function set(apiId, endpointId, params, data) {
  const ttlMs = getTTLms(apiId, endpointId);
  if (ttlMs === 0) return; // Non-cacheable — silently skip

  const paramHash = stableParamHash(params);
  const key       = makeCacheKey(apiId, endpointId, paramHash);

  cache.set(key, { data, ts: Date.now(), apiId, endpointId, paramHash });
}

/**
 * Invalidate a specific cache entry by params.
 * Use when you know the cached data is stale due to a write or external event.
 *
 * @param {string} apiId
 * @param {string} endpointId
 * @param {*} params
 */
export function invalidate(apiId, endpointId, params) {
  const paramHash = stableParamHash(params);
  cache.delete(makeCacheKey(apiId, endpointId, paramHash));
}

/**
 * Evict all entries that have exceeded 2× their TTL.
 * Call opportunistically (e.g. on each major fetch cycle).
 * No background timer is used — intentional for a personal dashboard.
 */
export function clearExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    const ttlMs = getTTLms(entry.apiId, entry.endpointId);
    if (ttlMs > 0 && now - entry.ts >= ttlMs * 2) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache entries for a specific API.
 * @param {string} apiId
 */
export function clearApi(apiId) {
  const prefix = `${apiId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Clear the entire cache. */
export function clearAll() {
  cache.clear();
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Count live cache entries for a given apiId:endpointId pair.
 * @param {string} apiId @param {string} endpointId @returns {number}
 */
function countEntries(apiId, endpointId) {
  const prefix = `${apiId}:${endpointId}:`;
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) count++;
  }
  return count;
}

/**
 * @typedef {Object} EndpointCacheStats
 * @property {number} hits
 * @property {number} misses
 * @property {number} hitRate             - 0–1
 * @property {number} totalEntries        - Live entries currently in cache
 * @property {number} staleServed
 * @property {number} bgRefreshTriggered
 * @property {boolean} dormant            - True if endpoint has status: 'dormant' in registry
 * @property {number} cacheTTLSec         - From apiRegistry
 */

/**
 * @typedef {Object} CacheStats
 * @property {Record<string, {
 *   byEndpoint: Record<string, EndpointCacheStats>,
 *   totals: { hits: number, misses: number, hitRate: number, totalEntries: number }
 * }>} byApi
 * @property {{
 *   hits: number, misses: number, hitRate: number, totalEntries: number,
 *   staleServed: number, bgRefreshTriggered: number
 * }} global
 */

/**
 * Get cache statistics for all registered endpoints.
 *
 * Each endpoint entry includes a `dormant` flag (from apiRegistry) so the
 * QuotaDashboard can visually separate active from dormant cache entries.
 *
 * @returns {CacheStats}
 */
export function getCacheStats() {
  // Build O(1) dormant lookup
  const dormantKeys = new Set(
    getDormantEndpoints().map(({ apiId, endpoint }) => statKey(apiId, endpoint.id))
  );

  const byApi = {};
  let gHits = 0, gMisses = 0, gEntries = 0, gStale = 0, gBg = 0;

  Object.values(API_REGISTRY).forEach(api => {
    const { id: apiId } = api;
    const byEndpoint = {};
    let aHits = 0, aMisses = 0, aEntries = 0;

    api.endpoints.forEach(ep => {
      const s       = getStat(apiId, ep.id);
      const total   = s.hits + s.misses;
      const entries = countEntries(apiId, ep.id);
      const key     = statKey(apiId, ep.id);

      byEndpoint[ep.id] = {
        hits:               s.hits,
        misses:             s.misses,
        hitRate:            total > 0 ? +(s.hits / total).toFixed(3) : 0,
        totalEntries:       entries,
        staleServed:        s.staleServed,
        bgRefreshTriggered: s.bgRefreshTriggered,
        dormant:            dormantKeys.has(key),
        cacheTTLSec:        ep.cacheTTL,
      };

      aHits    += s.hits;
      aMisses  += s.misses;
      aEntries += entries;
      gStale   += s.staleServed;
      gBg      += s.bgRefreshTriggered;
    });

    const aTotal = aHits + aMisses;
    byApi[apiId] = {
      byEndpoint,
      totals: {
        hits:         aHits,
        misses:       aMisses,
        hitRate:      aTotal > 0 ? +(aHits / aTotal).toFixed(3) : 0,
        totalEntries: aEntries,
      },
    };

    gHits    += aHits;
    gMisses  += aMisses;
    gEntries += aEntries;
  });

  const gTotal = gHits + gMisses;
  return {
    byApi,
    global: {
      hits:               gHits,
      misses:             gMisses,
      hitRate:            gTotal > 0 ? +(gHits / gTotal).toFixed(3) : 0,
      totalEntries:       gEntries,
      staleServed:        gStale,
      bgRefreshTriggered: gBg,
    },
  };
}

// ─── Self-Test ────────────────────────────────────────────────────────────────

/**
 * Run console assertions verifying core cache behavior.
 * Cleans up all side effects — safe to run in any environment.
 * Usage: import { runCacheSelfTest } from './apiCache.js'; runCacheSelfTest()
 */
export async function runCacheSelfTest() {
  console.group("[ApiCache] Self-Test Suite");

  let passed = 0, failed = 0;
  function assert(condition, label) {
    if (condition) { console.log(`  ✓ ${label}`); passed++; }
    else           { console.error(`  ✗ FAIL: ${label}`); failed++; }
  }

  // ── Test 1: Stable param hash is order-independent ────────────────────────
  const h1a = stableParamHash({ b: 2, a: 1 });
  const h1b = stableParamHash({ a: 1, b: 2 });
  assert(h1a === h1b, `stableParamHash order-independent: { b:2, a:1 } === { a:1, b:2 } (${h1a})`);

  // ── Test 2: Different params produce different hashes ─────────────────────
  const h2a = stableParamHash({ symbol: "AAPL" });
  const h2b = stableParamHash({ symbol: "MSFT" });
  assert(h2a !== h2b, "Different params → different hashes");

  // ── Test 3: cacheTTL: 0 endpoint is never cached ──────────────────────────
  // coingecko/ping has cacheTTL: 0
  set("coingecko", "ping", {}, { gecko_says: "OK" });
  const t3 = get("coingecko", "ping", {});
  assert(t3.fromCache === false, "cacheTTL: 0 endpoint: set() is no-op, get() always misses");
  assert(t3.data === null, "cacheTTL: 0 endpoint: get() returns data: null");

  // ── Test 4: Cache miss, then hit ──────────────────────────────────────────
  const params4 = { symbol: "TEST_LAYER3" };
  // fmp/profile has cacheTTL: 86400 (24hr)
  const miss = get("fmp", "profile", params4);
  assert(miss.fromCache === false, "Initial get → cache miss");
  set("fmp", "profile", params4, { pe: 25, eps: 5 });
  const hit = get("fmp", "profile", params4);
  assert(hit.fromCache === true, "After set → cache hit");
  assert(hit.stale === false, "Cache hit is fresh (not stale)");
  assert(hit.data?.pe === 25, "Cached data preserved correctly");
  // Cleanup
  invalidate("fmp", "profile", params4);

  // ── Test 5: hasValidCache reflects fresh/miss states ──────────────────────
  const params5 = { symbol: "VALID_CACHE_TEST" };
  const hash5   = stableParamHash(params5);
  assert(!hasValidCache("fmp", "profile", hash5), "hasValidCache: miss → false");
  set("fmp", "profile", params5, { pe: 10 });
  assert(hasValidCache("fmp", "profile", hash5), "hasValidCache: fresh entry → true");
  invalidate("fmp", "profile", params5);

  // ── Test 6: hasValidCache on cacheTTL: 0 endpoint always false ────────────
  const hash6 = stableParamHash({});
  set("coingecko", "ping", {}, { gecko_says: "OK" });
  assert(!hasValidCache("coingecko", "ping", hash6), "hasValidCache: cacheTTL:0 → always false");

  // ── Test 7: Stale-while-revalidate — stale within 2×TTL ──────────────────
  const params7 = { symbol: "STALE_TEST" };
  set("fmp", "profile", params7, { pe: 99 });
  // Manually backdate the entry to just past TTL (86400s), within 2×TTL (172800s)
  const key7 = makeCacheKey("fmp", "profile", stableParamHash(params7));
  const entry7 = cache.get(key7);
  const originalTs7 = entry7.ts;
  entry7.ts = Date.now() - (86_400_000 + 1_000); // 1 second past TTL
  let bgTriggered7 = false;
  const result7 = get("fmp", "profile", params7, async () => { bgTriggered7 = true; });
  assert(result7.fromCache === true, "Stale entry within 2×TTL → fromCache: true");
  assert(result7.stale === true, "Stale entry within 2×TTL → stale: true");
  assert(result7.data?.pe === 99, "Stale entry returns original data");
  // bgTriggered is async — give it a tick to run
  await new Promise(r => setTimeout(r, 10));
  assert(bgTriggered7, "Stale-within-2×TTL → background refresh callback triggered");
  // Restore and cleanup
  entry7.ts = originalTs7;
  invalidate("fmp", "profile", params7);

  // ── Test 8: Expired beyond 2×TTL → treated as miss ───────────────────────
  const params8 = { symbol: "EXPIRED_TEST" };
  set("fmp", "profile", params8, { pe: 42 });
  const key8 = makeCacheKey("fmp", "profile", stableParamHash(params8));
  const entry8 = cache.get(key8);
  entry8.ts = Date.now() - (86_400_000 * 2 + 1_000); // Past 2×TTL
  let bgTriggered8 = false;
  const result8 = get("fmp", "profile", params8, async () => { bgTriggered8 = true; });
  assert(result8.fromCache === false, "Expired (age ≥ 2×TTL) → fromCache: false");
  assert(result8.data === null, "Expired → data: null");
  assert(!cache.has(key8), "Expired entry evicted from cache Map");
  await new Promise(r => setTimeout(r, 10));
  assert(!bgTriggered8, "Expired entry → background refresh NOT triggered");

  // ── Test 9: Two callers, one API call ─────────────────────────────────────
  let fetchCount9 = 0;
  const params9 = { symbol: "SHARED_TEST" };
  // Simulate two consumers checking cache before fetching
  const miss9a = get("finnhub", "quote", params9);
  if (!miss9a.fromCache) {
    fetchCount9++;
    set("finnhub", "quote", params9, { c: 150.0 });
  }
  const hit9b = get("finnhub", "quote", params9);
  if (!hit9b.fromCache) fetchCount9++; // Should not run
  assert(fetchCount9 === 1, "Two callers with same params → exactly 1 fetch");
  assert(hit9b.fromCache === true, "Second caller gets cache hit");
  invalidate("finnhub", "quote", params9);

  // ── Test 10: getCacheStats accuracy ───────────────────────────────────────
  // Reset FMP stats for a clean count
  const fmpStatKey = statKey("fmp", "ratiosTTM");
  const savedStats = statsStore[fmpStatKey] ? { ...statsStore[fmpStatKey] } : null;
  if (statsStore[fmpStatKey]) statsStore[fmpStatKey] = { ...statsStore[fmpStatKey], hits: 0, misses: 0 };

  set("fmp", "ratiosTTM", { symbol: "STATS_TEST" }, { peRatio: 30 });
  get("fmp", "ratiosTTM", { symbol: "STATS_TEST" }); // hit
  get("fmp", "ratiosTTM", { symbol: "NOTEXIST" });   // miss

  const stats10 = getCacheStats();
  const ep10    = stats10.byApi?.fmp?.byEndpoint?.ratiosTTM;
  assert(ep10 !== undefined, "getCacheStats() includes fmp/ratiosTTM");
  assert(ep10.hits >= 1, `getCacheStats fmp/ratiosTTM hits ≥ 1 (got ${ep10.hits})`);
  assert(ep10.misses >= 1, `getCacheStats fmp/ratiosTTM misses ≥ 1 (got ${ep10.misses})`);
  assert(ep10.hitRate > 0 && ep10.hitRate <= 1, `getCacheStats hitRate in [0,1] (got ${ep10.hitRate})`);
  assert(ep10.dormant === false, "fmp/ratiosTTM is not dormant");
  assert(ep10.cacheTTLSec === 21600, "fmp/ratiosTTM cacheTTLSec === 21600");
  // Check a known dormant endpoint
  const ep10d = stats10.byApi?.fmp?.byEndpoint?.dcf;
  assert(ep10d?.dormant === true, "fmp/dcf is flagged dormant in getCacheStats");

  invalidate("fmp", "ratiosTTM", { symbol: "STATS_TEST" });
  if (savedStats) statsStore[fmpStatKey] = savedStats;
  else delete statsStore[fmpStatKey];

  // ── Test 11: global summary is sum of per-API ─────────────────────────────
  const stats11 = getCacheStats();
  let manualGlobalHits = 0, manualGlobalMisses = 0;
  Object.values(stats11.byApi).forEach(a => {
    manualGlobalHits   += a.totals.hits;
    manualGlobalMisses += a.totals.misses;
  });
  assert(
    stats11.global.hits === manualGlobalHits,
    `global.hits (${stats11.global.hits}) === sum of per-API hits (${manualGlobalHits})`
  );
  assert(
    stats11.global.misses === manualGlobalMisses,
    `global.misses (${stats11.global.misses}) === sum of per-API misses (${manualGlobalMisses})`
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log("  ✓ All tests passed. ApiCache is operating correctly.");
  else              console.error(`  ✗ ${failed} test(s) failed. Review the output above.`);
  console.groupEnd();

  return { passed, failed };
}
