/**
 * @fileoverview Quota Tracker — Singleton service for tracking API call quota usage.
 *
 * Maintains per-minute counters (in-memory rolling 60s window) and per-day
 * counters (localStorage with date-keyed reset) for all registered APIs.
 *
 * SINGLETON: Import { quotaTracker } — there is exactly one shared instance across
 * the entire application. Never instantiate this directly.
 *
 * Key behaviors:
 *  - canCall()    Pre-flight check before making an API call
 *  - recordCall() Increment counters after a successful call
 *  - markExhausted() Block all calls when 429 persists after retries
 *  - resetCounters() Manual override for testing
 *  - runSelfTest() Browser-console assertions for verifying core behavior
 *
 * @module quotaTracker
 */

import { API_REGISTRY, getApiDef } from './apiRegistry.js';
import { hasValidCache as _apiCacheHasValidCache } from './apiCache.js';

// ─── Health Thresholds (configurable) ────────────────────────────────────────
// Percentage of remaining quota at which health state transitions.
// Modify here — do not hardcode thresholds elsewhere.

const HEALTH_THRESHOLDS = {
  healthy:  0.40, // > 40% remaining → healthy
  warning:  0.20, // > 20% remaining → warning
  critical: 0.05, // >  5% remaining → critical
  // < 5% remaining → exhausted
};

// ─── localStorage Helpers (per-day persistence) ───────────────────────────────

/** @returns {string} Today's date in YYYY-MM-DD format (UTC) */
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** @param {string} apiId @returns {string} */
function getDayStorageKey(apiId) {
  return `quota:daily:${getTodayKey()}:${apiId}`;
}

/** @param {string} apiId @returns {number} */
function getDayUsed(apiId) {
  try {
    return parseInt(localStorage.getItem(getDayStorageKey(apiId)) || "0", 10);
  } catch {
    return 0; // localStorage unavailable — degrade gracefully
  }
}

/** @param {string} apiId @param {number} count */
function incrementDayUsed(apiId, count) {
  try {
    const key = getDayStorageKey(apiId);
    const current = parseInt(localStorage.getItem(key) || "0", 10);
    localStorage.setItem(key, String(current + count));
  } catch { /* localStorage unavailable — skip persistence, tracker still works in-memory */ }
}

/** @param {string} apiId */
function clearDayUsed(apiId) {
  try {
    localStorage.removeItem(getDayStorageKey(apiId));
  } catch { /* ignore */ }
}

// ─── Per-Minute Rolling Window (in-memory) ───────────────────────────────────
// Stores call events as { ts: number, count: number } within the last 60 seconds.

/** @type {Record<string, Array<{ts: number, count: number}>>} */
const minuteWindows = {};

/** Removes entries older than 60 seconds from the rolling window. */
function pruneMinuteWindow(apiId) {
  if (!minuteWindows[apiId]) return;
  const cutoff = Date.now() - 60_000;
  minuteWindows[apiId] = minuteWindows[apiId].filter(e => e.ts > cutoff);
}

/** @param {string} apiId @returns {number} Total quota units used in the last 60s */
function getMinuteUsed(apiId) {
  pruneMinuteWindow(apiId);
  return (minuteWindows[apiId] || []).reduce((sum, e) => sum + e.count, 0);
}

/** @param {string} apiId @param {number} count */
function addToMinuteWindow(apiId, count) {
  pruneMinuteWindow(apiId);
  if (!minuteWindows[apiId]) minuteWindows[apiId] = [];
  minuteWindows[apiId].push({ ts: Date.now(), count });
}

/** @param {string} apiId */
function clearMinuteWindow(apiId) {
  minuteWindows[apiId] = [];
}

// ─── Exhausted State ──────────────────────────────────────────────────────────
// Maps apiId → timestamp at which the exhausted state expires.
// Set by markExhausted() when 429 persists after all retries.

/** @type {Record<string, number>} */
const exhaustedUntil = {};

/**
 * Compute how long an API should remain exhausted based on its limit type.
 * - APIs with a per-day limit: blocked until next midnight UTC
 * - APIs with only a per-minute limit: blocked for 60 seconds
 * - Fallback: 60 seconds
 *
 * @param {import('./apiRegistry.js').ApiDefinition} api
 * @returns {number} Duration in milliseconds
 */
function computeExhaustedDuration(api) {
  if (api.limits.perDay !== null) {
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - Date.now();
  }
  if (api.limits.perMinute !== null) {
    return 60_000;
  }
  return 60_000; // fallback
}

// ─── Session Call Log (observability only, not persisted) ────────────────────
// Tracks calls made during this browser session for QuotaDashboard display.
// Format: { apiId: { endpointId: callCount, _total: totalCallCount } }

/** @type {Record<string, Record<string, number>>} */
const sessionLog = {};

/**
 * @param {string} apiId
 * @param {string} endpointId
 * @param {number} count
 */
function logSessionCall(apiId, endpointId, count) {
  if (!sessionLog[apiId]) sessionLog[apiId] = { _total: 0 };
  sessionLog[apiId][endpointId] = (sessionLog[apiId][endpointId] || 0) + count;
  sessionLog[apiId]._total = (sessionLog[apiId]._total || 0) + count;
}

// ─── Effective Cost Resolution ────────────────────────────────────────────────
// Central logic for determining how many quota units a call consumes.
// Used by both canCall() and recordCall() to ensure consistency.

/**
 * Resolve the effective quota cost for a call.
 * Throws for variable-cost endpoints missing their required callCount.
 *
 * @param {string} apiId
 * @param {string} endpointId
 * @param {number|undefined} suppliedCount  - Caller-provided count (required when callsPerRequest === 0)
 * @param {'canCall'|'recordCall'} caller   - For error messages
 * @returns {number} Resolved quota units
 * @throws {Error} If endpoint has callsPerRequest: 0 and suppliedCount is absent or zero
 */
function resolveEffectiveCost(apiId, endpointId, suppliedCount, caller) {
  const api = getApiDef(apiId);
  if (!api) return suppliedCount ?? 1;

  const ep = api.endpoints.find(e => e.id === endpointId);
  if (!ep) return suppliedCount ?? 1;

  if (ep.callsPerRequest > 0) {
    // Fixed cost — use the registry value; suppliedCount is ignored
    return ep.callsPerRequest;
  }

  if (ep.callsPerRequest === 0) {
    // Variable cost — callCount is required from the caller
    if (suppliedCount == null || suppliedCount === 0) {
      throw new Error(
        `[QuotaTracker.${caller}] "${apiId}/${endpointId}" has callsPerRequest: 0 (variable cost). ` +
        `An explicit callCount > 0 is required. Got: ${suppliedCount}. ` +
        `See Layer 4 contract in apiRegistry.js batchProfile endpoint.`
      );
    }
    return suppliedCount;
  }

  return suppliedCount ?? 1;
}

// ─── QuotaTracker Singleton ───────────────────────────────────────────────────

/**
 * @typedef {Object} QuotaStatus
 * @property {number|null} perMinuteLimit
 * @property {number} perMinuteUsed
 * @property {number|null} perMinuteRemaining   - null if no per-minute limit
 * @property {number|null} perDayLimit
 * @property {number} perDayUsed
 * @property {number|null} perDayRemaining      - null if no per-day limit
 * @property {number} sessionTotal              - Total calls this browser session
 * @property {Record<string, number>} sessionByEndpoint - Per-endpoint session breakdown
 * @property {'healthy'|'warning'|'critical'|'exhausted'} health
 * @property {string} nextDayResetISO           - ISO timestamp of next UTC midnight
 * @property {boolean} exhausted                - True if explicitly rate-limited after retries
 * @property {string|null} exhaustedUntilISO    - ISO timestamp when exhausted state expires
 */

const quotaTracker = {

  // ── canCall ────────────────────────────────────────────────────────────────

  /**
   * Pre-flight quota check. Call this BEFORE making any API request.
   * Returns false if the call would exceed a known limit, or if the API is
   * currently marked as exhausted. Always returns true for unlimited APIs.
   *
   * @param {string} apiId
   * @param {string} endpointId
   * @param {number} [expectedCallCount]
   *   Number of quota units this call will consume.
   *   REQUIRED when the endpoint has callsPerRequest: 0 (variable cost).
   *   Optional for fixed-cost endpoints — registry value is used instead.
   * @returns {boolean}
   */
  canCall(apiId, endpointId, expectedCallCount) {
    const api = getApiDef(apiId);
    if (!api) {
      console.warn(`[QuotaTracker.canCall] Unknown apiId: "${apiId}". Blocking call.`);
      return false;
    }

    // Resolve effective cost — may throw for variable endpoints missing callCount
    let effectiveCost;
    try {
      effectiveCost = resolveEffectiveCost(apiId, endpointId, expectedCallCount, "canCall");
    } catch (err) {
      console.error(err.message);
      return false; // canCall returns false rather than propagating the throw
    }

    // Check exhausted flag
    if (exhaustedUntil[apiId]) {
      if (Date.now() < exhaustedUntil[apiId]) return false;
      delete exhaustedUntil[apiId]; // Expired — auto-clear
    }

    // Unlimited APIs — always permit, track only for observability
    if (api.limits.perDay === null && api.limits.perMinute === null) {
      return true;
    }

    // Per-minute check
    if (api.limits.perMinute !== null) {
      const used = getMinuteUsed(apiId);
      if (used + effectiveCost > api.limits.perMinute) {
        console.warn(
          `[QuotaTracker] ${apiId} per-minute limit would be exceeded: ` +
          `${used} used + ${effectiveCost} needed > ${api.limits.perMinute} limit`
        );
        return false;
      }
    }

    // Per-day check
    if (api.limits.perDay !== null) {
      const used = getDayUsed(apiId);
      if (used + effectiveCost > api.limits.perDay) {
        console.warn(
          `[QuotaTracker] ${apiId} per-day limit would be exceeded: ` +
          `${used} used + ${effectiveCost} needed > ${api.limits.perDay} limit`
        );
        return false;
      }
    }

    return true;
  },

  // ── recordCall ────────────────────────────────────────────────────────────

  /**
   * Record a completed API call. Call this AFTER a successful response.
   * Increments per-minute window (in-memory), per-day counter (localStorage),
   * and session log (observability).
   *
   * @param {string} apiId
   * @param {string} endpointId
   * @param {number} [callCount]
   *   Quota units consumed. REQUIRED when endpointId has callsPerRequest: 0.
   *   For fixed-cost endpoints, the registry value overrides this parameter.
   * @throws {Error} If endpointId has callsPerRequest: 0 and callCount is absent or zero.
   */
  recordCall(apiId, endpointId, callCount) {
    const api = getApiDef(apiId);
    if (!api) {
      console.warn(`[QuotaTracker.recordCall] Unknown apiId: "${apiId}". Skipping.`);
      return;
    }

    // Resolve effective count — throws for variable endpoints missing callCount
    const effectiveCount = resolveEffectiveCost(apiId, endpointId, callCount, "recordCall");

    // Per-minute window (in-memory)
    addToMinuteWindow(apiId, effectiveCount);

    // Per-day counter (localStorage — persists across page refreshes within same day)
    incrementDayUsed(apiId, effectiveCount);

    // Session log (in-memory observability only)
    logSessionCall(apiId, endpointId, effectiveCount);
  },

  // ── getRemainingQuota ─────────────────────────────────────────────────────

  /**
   * Get the full quota status for a given API.
   * Includes current usage, limits, health state, and reset time.
   *
   * @param {string} apiId
   * @returns {QuotaStatus}
   */
  getRemainingQuota(apiId) {
    const api = getApiDef(apiId);

    const perMinuteUsed = getMinuteUsed(apiId);
    const perDayUsed = getDayUsed(apiId);

    const perMinuteLimit = api?.limits.perMinute ?? null;
    const perDayLimit = api?.limits.perDay ?? null;

    const nextMidnight = new Date();
    nextMidnight.setUTCHours(24, 0, 0, 0);

    const isExhausted = !!(exhaustedUntil[apiId] && Date.now() < exhaustedUntil[apiId]);

    return {
      perMinuteLimit,
      perMinuteUsed,
      perMinuteRemaining: perMinuteLimit !== null
        ? Math.max(0, perMinuteLimit - perMinuteUsed)
        : null,
      perDayLimit,
      perDayUsed,
      perDayRemaining: perDayLimit !== null
        ? Math.max(0, perDayLimit - perDayUsed)
        : null,
      sessionTotal: sessionLog[apiId]?._total || 0,
      sessionByEndpoint: this.getSessionLog(apiId),
      health: this.getQuotaHealth(apiId),
      nextDayResetISO: nextMidnight.toISOString(),
      exhausted: isExhausted,
      exhaustedUntilISO: isExhausted ? new Date(exhaustedUntil[apiId]).toISOString() : null,
    };
  },

  // ── getQuotaHealth ────────────────────────────────────────────────────────

  /**
   * Compute the health state for an API based on remaining quota percentage.
   * Uses the most constrained limit (per-minute or per-day) as the signal.
   *
   * Thresholds (configurable via HEALTH_THRESHOLDS at top of file):
   *   healthy   > 40% remaining
   *   warning   20–40% remaining
   *   critical  5–20% remaining
   *   exhausted < 5% remaining OR explicitly marked exhausted after 429
   *
   * Unlimited APIs (no limits) always return "healthy".
   *
   * @param {string} apiId
   * @returns {'healthy'|'warning'|'critical'|'exhausted'}
   */
  getQuotaHealth(apiId) {
    const api = getApiDef(apiId);
    if (!api) return "healthy";

    // Explicitly exhausted after 429 + retry failure
    if (exhaustedUntil[apiId] && Date.now() < exhaustedUntil[apiId]) {
      return "exhausted";
    } else if (exhaustedUntil[apiId]) {
      delete exhaustedUntil[apiId]; // Auto-clear expired exhaustion
    }

    // Unlimited APIs are always healthy — tracked for observability only
    if (api.limits.perDay === null && api.limits.perMinute === null) {
      return "healthy";
    }

    // Calculate worst-case remaining percentage across all applicable windows
    let minPctRemaining = 1.0;

    if (api.limits.perMinute !== null && api.limits.perMinute > 0) {
      const used = getMinuteUsed(apiId);
      const pct = (api.limits.perMinute - used) / api.limits.perMinute;
      minPctRemaining = Math.min(minPctRemaining, pct);
    }

    if (api.limits.perDay !== null && api.limits.perDay > 0) {
      const used = getDayUsed(apiId);
      const pct = (api.limits.perDay - used) / api.limits.perDay;
      minPctRemaining = Math.min(minPctRemaining, pct);
    }

    minPctRemaining = Math.max(0, minPctRemaining);

    if (minPctRemaining > HEALTH_THRESHOLDS.healthy)  return "healthy";
    if (minPctRemaining > HEALTH_THRESHOLDS.warning)  return "warning";
    if (minPctRemaining > HEALTH_THRESHOLDS.critical) return "critical";
    return "exhausted";
  },

  // ── markExhausted ─────────────────────────────────────────────────────────

  /**
   * Mark an API as exhausted, blocking all further calls until the duration expires.
   * Called by apiClient when 429 persists after all retry attempts.
   *
   * Duration is computed automatically based on the API's limit type:
   *   - Per-day limit  → blocked until next UTC midnight
   *   - Per-minute only → blocked for 60 seconds
   *   - Fallback       → 60 seconds
   *
   * @param {string} apiId
   * @param {number} [overrideDurationMs] - Override automatic duration computation
   */
  markExhausted(apiId, overrideDurationMs) {
    const api = getApiDef(apiId);
    const duration = overrideDurationMs ?? (api ? computeExhaustedDuration(api) : 60_000);
    exhaustedUntil[apiId] = Date.now() + duration;
    // For per-day APIs, persist exhaustion to localStorage so it survives page reload.
    // Setting the day counter to the limit causes getQuotaHealth() to return 'exhausted'
    // on subsequent loads until the UTC date key rolls over at midnight.
    if (api?.limits.perDay != null) {
      try {
        localStorage.setItem(getDayStorageKey(apiId), String(api.limits.perDay));
      } catch { /* localStorage unavailable — in-memory exhaustion still applies this session */ }
    }
    console.warn(
      `[QuotaTracker] "${apiId}" marked EXHAUSTED. ` +
      `Calls blocked until ${new Date(exhaustedUntil[apiId]).toISOString()}.`
    );
  },

  // ── resetCounters ─────────────────────────────────────────────────────────

  /**
   * Reset all quota counters for a given API.
   * Clears: per-minute rolling window (in-memory), per-day counter (localStorage),
   * exhausted flag, and session log.
   *
   * Use for testing or manual operator override.
   * This does NOT reset the actual API provider's counter.
   *
   * @param {string} apiId
   */
  resetCounters(apiId) {
    clearMinuteWindow(apiId);
    clearDayUsed(apiId);
    delete exhaustedUntil[apiId];
    if (sessionLog[apiId]) sessionLog[apiId] = { _total: 0 };
    console.info(`[QuotaTracker] Counters reset for "${apiId}".`);
  },

  // ── getAllQuotaStatus ──────────────────────────────────────────────────────

  /**
   * Get quota status for every registered API in one call.
   * Used by QuotaDashboard to render the full status panel.
   *
   * @returns {Record<string, QuotaStatus>}
   */
  getAllQuotaStatus() {
    const result = {};
    Object.keys(API_REGISTRY).forEach(apiId => {
      result[apiId] = this.getRemainingQuota(apiId);
    });
    return result;
  },

  // ── getSessionLog ─────────────────────────────────────────────────────────

  /**
   * Get per-endpoint call counts for a given API from the current session log.
   *
   * @param {string} apiId
   * @returns {Record<string, number>}  e.g. { quote: 12, news: 3, _total: 15 }
   */
  getSessionLog(apiId) {
    return { ...(sessionLog[apiId] || { _total: 0 }) };
  },

  // ── hasValidCache ─────────────────────────────────────────────────────────

  /**
   * Check whether a fresh (non-stale) cache entry exists for the given params hash.
   * STUB: returns false until Layer 3 (apiCache.js) is built.
   * Updated in Layer 3 to delegate to apiCache.hasValidCache().
   *
   * NOTE: The rolling minute window prunes stale entries on read (not on a timer).
   * This is intentional for a personal dashboard — no background timer needed.
   * Entries accumulate in memory but are harmless and corrected on next access.
   *
   * @param {string} apiId
   * @param {string} endpointId
   * @param {string} paramHash  - Stable hash from apiCache.stableParamHash(params)
   * @returns {boolean}
   */
  hasValidCache(apiId, endpointId, paramHash) {
    return _apiCacheHasValidCache(apiId, endpointId, paramHash);
  },

  // ── runSelfTest ───────────────────────────────────────────────────────────

  /**
   * Run console assertions to verify core quota tracker behavior.
   * Safe to call from the browser console during development.
   * Does NOT affect production data — all side effects are cleaned up.
   *
   * Usage: quotaTracker.runSelfTest()
   */
  runSelfTest() {
    console.group("[QuotaTracker] Self-Test Suite");

    let passed = 0;
    let failed = 0;

    function assert(condition, label) {
      if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
      } else {
        console.error(`  ✗ FAIL: ${label}`);
        failed++;
      }
    }

    // ── Test 1: Unlimited APIs always pass canCall ─────────────────────────
    const t1 = quotaTracker.canCall("yahoo", "quote");
    assert(t1 === true, "canCall(yahoo, quote) → true [unlimited API always permitted]");

    // ── Test 2: recordCall on unlimited API doesn't throw ─────────────────
    let t2Passed = true;
    try {
      quotaTracker.recordCall("yahoo", "quote");
    } catch (e) {
      t2Passed = false;
    }
    assert(t2Passed, "recordCall(yahoo, quote) completes without error");
    // Clean up test 2's session log entry
    if (sessionLog["yahoo"]) sessionLog["yahoo"] = { _total: 0 };

    // ── Test 3: Variable-cost endpoint throws without callCount ───────────
    let t3Threw = false;
    try {
      quotaTracker.recordCall("fmp", "batchProfile"); // missing callCount
    } catch (e) {
      t3Threw = true;
      assert(
        e.message.includes("callsPerRequest: 0"),
        `recordCall(fmp, batchProfile) throws with correct message: "${e.message.slice(0, 80)}..."`
      );
    }
    assert(t3Threw, "recordCall(fmp, batchProfile) without callCount correctly throws");

    // ── Test 4: Variable-cost endpoint records correct count ───────────────
    const dayBefore = getDayUsed("fmp");
    quotaTracker.recordCall("fmp", "batchProfile", 10);
    const dayAfter = getDayUsed("fmp");
    assert(
      dayAfter === dayBefore + 10,
      `recordCall(fmp, batchProfile, 10) increments per-day counter by 10 (${dayBefore} → ${dayAfter})`
    );
    // Clean up test 4
    try { localStorage.setItem(getDayStorageKey("fmp"), String(dayBefore)); } catch {}
    clearMinuteWindow("fmp");

    // ── Test 5: canCall returns false when exhausted ───────────────────────
    quotaTracker.markExhausted("fmp", 5_000); // 5-second exhaustion
    const t5 = quotaTracker.canCall("fmp", "profile", 1);
    assert(t5 === false, "canCall(fmp) while marked exhausted → false");
    delete exhaustedUntil["fmp"]; // Clean up

    // ── Test 6: canCall returns true after exhausted period clears ─────────
    exhaustedUntil["fmp"] = Date.now() - 1; // Expired in the past
    const t6 = quotaTracker.canCall("fmp", "profile", 1);
    assert(t6 === true, "canCall(fmp) after exhausted period expires → true");
    // exhaustedUntil["fmp"] auto-deleted by canCall

    // ── Test 7: getQuotaHealth returns "healthy" for unlimited APIs ────────
    const t7 = quotaTracker.getQuotaHealth("yahoo");
    assert(t7 === "healthy", `getQuotaHealth(yahoo) → "healthy" [unlimited API]`);

    // ── Test 8: getQuotaHealth threshold transitions ───────────────────────
    // Simulate FMP at 80% used (200/250) → should be "exhausted" (<5% left)
    const fmpLimit = API_REGISTRY.fmp.limits.perDay; // 250
    const dayKeyFmp = getDayStorageKey("fmp");
    const savedFmp = localStorage.getItem(dayKeyFmp);
    try {
      localStorage.setItem(dayKeyFmp, String(Math.floor(fmpLimit * 0.97))); // 3% remaining
      assert(quotaTracker.getQuotaHealth("fmp") === "exhausted", "Health at 3% remaining → 'exhausted'");
      localStorage.setItem(dayKeyFmp, String(Math.floor(fmpLimit * 0.85))); // 15% remaining
      assert(quotaTracker.getQuotaHealth("fmp") === "critical", "Health at 15% remaining → 'critical'");
      localStorage.setItem(dayKeyFmp, String(Math.floor(fmpLimit * 0.70))); // 30% remaining
      assert(quotaTracker.getQuotaHealth("fmp") === "warning", "Health at 30% remaining → 'warning'");
      localStorage.setItem(dayKeyFmp, String(Math.floor(fmpLimit * 0.40))); // 60% remaining
      assert(quotaTracker.getQuotaHealth("fmp") === "healthy", "Health at 60% remaining → 'healthy'");
    } finally {
      // Restore original FMP day counter
      if (savedFmp !== null) localStorage.setItem(dayKeyFmp, savedFmp);
      else localStorage.removeItem(dayKeyFmp);
    }

    // ── Test 9: getRemainingQuota structure ────────────────────────────────
    const q9 = quotaTracker.getRemainingQuota("fmp");
    assert(q9.perDayLimit === 250, `getRemainingQuota(fmp).perDayLimit === 250`);
    assert(q9.perMinuteLimit === null, `getRemainingQuota(fmp).perMinuteLimit === null [no per-min limit]`);
    assert(typeof q9.nextDayResetISO === "string", `getRemainingQuota(fmp).nextDayResetISO is a string`);
    assert(typeof q9.health === "string", `getRemainingQuota(fmp).health is a string`);
    assert("perDayRemaining" in q9, `getRemainingQuota(fmp) has perDayRemaining field`);
    assert("exhausted" in q9, `getRemainingQuota(fmp) has exhausted field`);

    // ── Test 10: resetCounters clears everything ───────────────────────────
    quotaTracker.recordCall("brapi", "quote"); // Adds to brapi counters
    quotaTracker.markExhausted("brapi", 60_000);
    quotaTracker.resetCounters("brapi");
    assert(getDayUsed("brapi") === 0, "resetCounters(brapi) clears per-day counter");
    assert(getMinuteUsed("brapi") === 0, "resetCounters(brapi) clears per-minute window");
    assert(!exhaustedUntil["brapi"], "resetCounters(brapi) clears exhausted flag");
    assert(quotaTracker.getSessionLog("brapi")._total === 0, "resetCounters(brapi) clears session log");

    // ── Test 11: Per-day counter survives page-refresh simulation ─────────
    const dayKeyBcb = getDayStorageKey("bcb");
    const savedBcb = localStorage.getItem(dayKeyBcb);
    try {
      localStorage.setItem(dayKeyBcb, "5");
      // Simulate what happens after a page refresh — getDayUsed reads from localStorage
      const refreshedCount = getDayUsed("bcb");
      assert(refreshedCount === 5, `Per-day counter survives page refresh simulation: getDayUsed("bcb") === 5`);
    } finally {
      if (savedBcb !== null) localStorage.setItem(dayKeyBcb, savedBcb);
      else localStorage.removeItem(dayKeyBcb);
    }

    // ── Test 12: canCall for variable-cost endpoint without callCount returns false
    const t12 = quotaTracker.canCall("fmp", "batchProfile"); // no expectedCallCount
    assert(t12 === false, "canCall(fmp, batchProfile) without expectedCallCount → false (not a throw)");

    // ── Summary ───────────────────────────────────────────────────────────
    console.log("");
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
      console.log("  ✓ All tests passed. QuotaTracker is operating correctly.");
    } else {
      console.error(`  ✗ ${failed} test(s) failed. Review the output above.`);
    }
    console.groupEnd();

    return { passed, failed };
  },
};

export { quotaTracker };

/**
 * Quick pre-flight check: is this API currently exhausted or near-depleted?
 * Returns true when health is 'exhausted' — either explicitly marked after a 429
 * or because < 5% of the daily/minute quota remains.
 *
 * @param {string} apiId
 * @returns {boolean}
 */
export function isExhausted(apiId) {
  return quotaTracker.getQuotaHealth(apiId) === 'exhausted';
}
