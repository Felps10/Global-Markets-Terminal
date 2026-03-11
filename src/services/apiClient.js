/**
 * @fileoverview API Client — Unified HTTP wrapper with quota tracking, caching,
 * exponential backoff retry, and a deferred queue for low-priority calls.
 *
 * ── DEPENDENCY DIRECTION (must not be reversed) ─────────────────────────────
 *   apiClient → apiCache     → apiRegistry
 *   apiClient → quotaTracker → apiRegistry + apiCache
 *   apiRegistry has no dependencies
 *   Nothing imports from apiClient yet (Layer 6 handles migration)
 *
 * ── CALL FLOW (every request follows this exact sequence) ────────────────────
 *   1. Validate endpoint exists in registry
 *   2. Validate callCount for variable-cost endpoints (callsPerRequest: 0)
 *   3. Compute paramHash via stableParamHash
 *   4. Check apiCache → cache hit returns immediately (no quota consumed)
 *   5. Check quotaTracker.canCall() → quota blocked returns QuotaExhaustedError
 *   5b. If health is 'critical' and canDefer → enqueue, return deferred response
 *   6. Call fetcher() with retry logic
 *   7. On success → apiCache.set(), quotaTracker.recordCall(), schedule drain
 *   8. On 429 → backoff retry (Retry-After or exponential), then markExhausted
 *   9. On 5xx → backoff retry, quota NOT consumed, NOT marked exhausted
 *   10. On 401/403 → fail immediately, AuthError returned
 *   11. On network error → retry once, then NetworkError returned
 *
 * ── FETCHER CONTRACT ─────────────────────────────────────────────────────────
 *   The fetcher is an async function supplied by the caller (dataServices.js).
 *   It makes exactly one HTTP request and returns parsed response data on success.
 *   On HTTP errors it must throw ApiHttpError(status, message, retryAfterSec).
 *   On network errors it throws a plain Error. It must NOT retry, cache, or track quota.
 *
 * ── NEVER THROWS (with one documented exception) ─────────────────────────────
 *   apiClient.call() resolves with ApiResponse for all runtime errors.
 *   Exception: missing callCount on variable-cost endpoints throws synchronously
 *   because this is a programming error that must fail loudly during development.
 *
 * ── DEFERRED QUEUE ────────────────────────────────────────────────────────────
 *   Deferred calls do NOT persist across page refreshes — in-memory only.
 *   When a deferred call is executed during drain, its result is stored in the
 *   cache. The original caller (which already received { deferred: true }) can
 *   retry and will get a cache hit on the next attempt.
 *
 * @module apiClient
 */

import { getApiDef, getEndpointDef } from './apiRegistry.js';
import { quotaTracker } from './quotaTracker.js';
import { get as cacheGet, set as cacheSet, stableParamHash } from './apiCache.js';

// ─── Error Types ──────────────────────────────────────────────────────────────

export const ERROR_TYPES = Object.freeze({
  QUOTA_EXHAUSTED: "QuotaExhausted",
  AUTH:            "Auth",
  NETWORK:         "Network",
  SERVER_ERROR:    "ServerError",
  QUEUE_FULL:      "QueueFull",
  BAD_REQUEST:     "BadRequest",
});

/**
 * Standardized HTTP error class for fetchers to throw.
 * Layer 6 migration: wrap every non-OK fetch response with this class.
 *
 * @example
 * if (!res.ok) throw new ApiHttpError(res.status, res.statusText, retryAfterSec);
 */
export class ApiHttpError extends Error {
  /**
   * @param {number} status         - HTTP status code
   * @param {string} [message]      - Optional human-readable message
   * @param {number|null} [retryAfterSec] - Value from Retry-After header, if present
   */
  constructor(status, message, retryAfterSec = null) {
    super(message || `HTTP ${status}`);
    this.name          = "ApiHttpError";
    this.status        = status;
    this.retryAfterSec = retryAfterSec;
  }
}

// ─── Retry Config ─────────────────────────────────────────────────────────────
// Configurable here — do not hardcode elsewhere.

const MAX_RETRIES           = 3;
const BACKOFF_MS            = [1_000, 2_000, 4_000, 8_000]; // per attempt 0→1→2→3
const NETWORK_RETRY_DELAY   = 1_000; // ms — network errors retry exactly once

// ─── Deferred Queue ───────────────────────────────────────────────────────────

/** Max items per API in the deferred queue. Configurable here. */
const DEFERRED_QUEUE_MAX = 50;

/**
 * @typedef {Object} DeferredItem
 * @property {string} apiId
 * @property {string} endpointId
 * @property {*} params
 * @property {Object} options
 * @property {number} enqueuedAt  - timestamp
 */

/** @type {Record<string, DeferredItem[]>} */
const deferredQueues = {};

/** Symbol used as a private option flag to skip the deferred check during drain. */
const DRAIN_FLAG = Symbol("isDraining");

let drainScheduled = false;

// ─── Response Builders ────────────────────────────────────────────────────────

/**
 * @typedef {Object} ApiError
 * @property {string} type       - One of ERROR_TYPES values
 * @property {string} message
 * @property {boolean} retryable
 * @property {number|null} retryAfter - seconds until retry is safe, or null
 */

/**
 * @typedef {Object} ApiResponse
 * @property {*} data
 * @property {boolean} fromCache
 * @property {boolean} deferred
 * @property {number} quotaUsed        - Quota units consumed by this call (0 on cache hit)
 * @property {number|null} quotaRemaining - null for unlimited APIs (Yahoo, BCB, etc.)
 * @property {ApiError|null} error
 */

/** @param {string} apiId @returns {number|null} */
function getQuotaRemaining(apiId) {
  const s = quotaTracker.getRemainingQuota(apiId);
  if (s.perDayRemaining !== null)    return s.perDayRemaining;
  if (s.perMinuteRemaining !== null) return s.perMinuteRemaining;
  return null; // unlimited
}

/** @returns {ApiResponse} */
function makeOk(data, fromCache, quotaUsed, quotaRemaining) {
  return { data, fromCache, deferred: false, quotaUsed, quotaRemaining, error: null };
}

/** @returns {ApiResponse} */
function makeErr(type, message, retryable = false, retryAfter = null) {
  return {
    data: null, fromCache: false, deferred: false,
    quotaUsed: 0, quotaRemaining: null,
    error: { type, message, retryable, retryAfter },
  };
}

/** @returns {ApiResponse} */
function makeDeferred(quotaRemaining) {
  return { data: null, fromCache: false, deferred: true, quotaUsed: 0, quotaRemaining, error: null };
}

// ─── Fetch With Retry ─────────────────────────────────────────────────────────

/**
 * Execute the fetcher with retry logic for 429 and 5xx responses.
 * Network errors are retried exactly once. Auth errors are never retried.
 *
 * Returns a discriminated result — does NOT throw.
 *
 * @param {string} apiId
 * @param {string} endpointId
 * @param {Function} fetcher            - Async fn from the caller; throws ApiHttpError on error
 * @returns {Promise<{
 *   ok: boolean,
 *   data: any,
 *   errorType: 'auth'|'quota'|'server'|'network'|'client'|null,
 *   status: number,
 *   retryAfterSec: number|null,
 *   exhausted: boolean
 * }>}
 */
async function fetchWithRetry(apiId, endpointId, fetcher) {
  let networkAttempted = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await fetcher();
      return { ok: true, data, errorType: null, status: 200, retryAfterSec: null, exhausted: false };

    } catch (err) {

      if (err instanceof ApiHttpError) {
        const { status, retryAfterSec } = err;

        // ── 401 / 403 — Auth error: fail immediately, no retry ────────────────
        if (status === 401 || status === 403) {
          return { ok: false, data: null, errorType: "auth", status, retryAfterSec: null, exhausted: false };
        }

        // ── 429 — Rate limited: backoff retry, then mark exhausted ────────────
        if (status === 429) {
          const backoffMs = retryAfterSec
            ? retryAfterSec * 1000
            : BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
          console.warn(
            `[ApiClient] ${apiId}/${endpointId} HTTP 429 — ` +
            `attempt ${attempt + 1}/${MAX_RETRIES + 1}, backing off ${backoffMs}ms`
          );
          if (attempt === MAX_RETRIES) {
            // Retries exhausted — delegate exhaustion duration to quotaTracker (never compute here)
            quotaTracker.markExhausted(apiId);
            return { ok: false, data: null, errorType: "quota", status, retryAfterSec, exhausted: true };
          }
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }

        // ── 5xx — Server error: backoff retry, quota NOT consumed ─────────────
        if (status >= 500) {
          const backoffMs = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
          console.warn(
            `[ApiClient] ${apiId}/${endpointId} HTTP ${status} (server error) — ` +
            `attempt ${attempt + 1}/${MAX_RETRIES + 1}, backing off ${backoffMs}ms`
          );
          if (attempt === MAX_RETRIES) {
            return { ok: false, data: null, errorType: "server", status, retryAfterSec: null, exhausted: false };
          }
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }

        // ── Other 4xx — Client/bad request: no retry ──────────────────────────
        return { ok: false, data: null, errorType: "client", status, retryAfterSec: null, exhausted: false };
      }

      // ── Network error (no response / timeout / fetch threw) ───────────────
      if (!networkAttempted) {
        networkAttempted = true;
        console.warn(
          `[ApiClient] ${apiId}/${endpointId} network error: "${err.message}". Retrying once in ${NETWORK_RETRY_DELAY}ms`
        );
        await new Promise(r => setTimeout(r, NETWORK_RETRY_DELAY));
        continue;
      }
      return { ok: false, data: null, errorType: "network", status: 0, retryAfterSec: null, exhausted: false };
    }
  }

  // Should not reach here, but satisfy linter
  return { ok: false, data: null, errorType: "network", status: 0, retryAfterSec: null, exhausted: false };
}

// ─── Deferred Queue Drain ─────────────────────────────────────────────────────

/**
 * Schedule a deferred queue drain 500ms after a successful call.
 * Coalesces multiple calls into one drain run (drainScheduled flag).
 */
function scheduleDrain() {
  if (drainScheduled) return;
  drainScheduled = true;
  setTimeout(async () => {
    drainScheduled = false;
    await drainAllQueues();
  }, 500);
}

/**
 * Drain all deferred queues in FIFO order.
 * Stops draining an API's queue if its health is still critical or exhausted.
 * Results are stored in cache — original callers must retry to get the data.
 * Called automatically after each successful call; also available manually via apiClient.drainDeferredQueues().
 */
async function drainAllQueues() {
  for (const apiId of Object.keys(deferredQueues)) {
    const queue = deferredQueues[apiId];
    if (!queue || queue.length === 0) continue;

    while (queue.length > 0) {
      const health = quotaTracker.getQuotaHealth(apiId);
      if (health === "critical" || health === "exhausted") {
        console.log(`[ApiClient] Drain paused for "${apiId}": health is still "${health}" (${queue.length} items pending)`);
        break;
      }

      const item = queue.shift();
      console.log(
        `[ApiClient] Draining deferred call: ${item.apiId}/${item.endpointId} ` +
        `(${queue.length} remaining in ${item.apiId} queue)`
      );

      // Execute with DRAIN_FLAG to bypass the deferred-queue check inside _executeCall
      await _executeCall(item.apiId, item.endpointId, item.params, {
        ...item.options,
        [DRAIN_FLAG]: true,
      }).catch(err => {
        console.warn(`[ApiClient] Deferred call failed (${item.apiId}/${item.endpointId}):`, err.message);
      });

      // Space out drained calls — don't flood after a backlog clears
      if (queue.length > 0) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }
}

// ─── Core Execution ───────────────────────────────────────────────────────────

/**
 * Internal implementation of the call flow. All paths return ApiResponse (no throws).
 * Throws only for programming errors (variable-cost callCount missing).
 */
async function _executeCall(apiId, endpointId, params, options) {
  const { fetcher, callCount } = options;
  const isDraining = !!options[DRAIN_FLAG];

  // ── Step 1: Resolve endpoint ───────────────────────────────────────────────
  const api = getApiDef(apiId);
  const ep  = getEndpointDef(apiId, endpointId);

  if (!api || !ep) {
    return makeErr(ERROR_TYPES.BAD_REQUEST, `Unknown endpoint: "${apiId}/${endpointId}"`, false);
  }

  // ── Step 2: Variable-cost validation (throws synchronously — programming error) ──
  if (ep.callsPerRequest === 0) {
    if (callCount == null || callCount === 0) {
      throw new Error(
        `[ApiClient] "${apiId}/${endpointId}" has callsPerRequest: 0 (variable cost). ` +
        `options.callCount is required and must be > 0. Got: ${callCount}. ` +
        `See the batchProfile contract in apiRegistry.js.`
      );
    }
  }

  const effectiveCallCount = ep.callsPerRequest > 0 ? ep.callsPerRequest : callCount;

  // ── Step 3: Compute param hash ────────────────────────────────────────────
  const paramHash = stableParamHash(params);

  // ── Step 4: Cache check ───────────────────────────────────────────────────
  // Background refresh is fire-and-forget: apiClient supplies the callback,
  // apiCache calls it asynchronously (microtask) for stale-but-usable entries.
  // apiClient never awaits this callback — consistent with apiCache's design.
  const backgroundRefresh = async () => {
    if (!fetcher) return;
    // Check quota before the background refresh — never refresh if exhausted
    if (!quotaTracker.canCall(apiId, endpointId, effectiveCallCount)) {
      console.log(`[ApiClient] Background refresh skipped for ${apiId}/${endpointId}: quota cannot support it`);
      return;
    }
    const result = await fetchWithRetry(apiId, endpointId, fetcher);
    if (result.ok && result.data !== null) {
      cacheSet(apiId, endpointId, params, result.data);
      quotaTracker.recordCall(apiId, endpointId, effectiveCallCount);
    }
  };

  const cached = cacheGet(apiId, endpointId, params, backgroundRefresh);
  if (cached.fromCache) {
    // Cache hit — quota is NOT consumed (zero cost)
    return makeOk(cached.data, true, 0, getQuotaRemaining(apiId));
  }

  // ── Step 5: Quota pre-flight ──────────────────────────────────────────────
  if (!quotaTracker.canCall(apiId, endpointId, effectiveCallCount)) {
    const remaining  = quotaTracker.getRemainingQuota(apiId);
    const resetLabel = remaining.nextDayResetISO
      ? ` Next reset: ${remaining.nextDayResetISO}.`
      : "";
    return makeErr(
      ERROR_TYPES.QUOTA_EXHAUSTED,
      `Quota blocked for "${apiId}". Used: ${remaining.perDayUsed ?? remaining.perMinuteUsed}/${remaining.perDayLimit ?? remaining.perMinuteLimit}.${resetLabel}`,
      false,
    );
  }

  // ── Step 5b: Deferred queue check (skip when draining to prevent re-enqueue)
  if (!isDraining && ep.canDefer && quotaTracker.getQuotaHealth(apiId) === "critical") {
    if (!deferredQueues[apiId]) deferredQueues[apiId] = [];
    const queue = deferredQueues[apiId];
    if (queue.length >= DEFERRED_QUEUE_MAX) {
      return makeErr(
        ERROR_TYPES.QUEUE_FULL,
        `Deferred queue for "${apiId}" is full (${DEFERRED_QUEUE_MAX} items). ` +
        `Try again when quota recovers or call apiClient.clearDeferredQueue("${apiId}").`,
        true,
      );
    }
    queue.push({ apiId, endpointId, params, options, enqueuedAt: Date.now() });
    console.log(`[ApiClient] Deferred "${apiId}/${endpointId}" — queue: ${queue.length}/${DEFERRED_QUEUE_MAX}`);
    return makeDeferred(getQuotaRemaining(apiId));
  }

  // ── Step 6-11: HTTP request with retry ───────────────────────────────────
  if (!fetcher) {
    return makeErr(
      ERROR_TYPES.BAD_REQUEST,
      `No fetcher provided for "${apiId}/${endpointId}". ` +
      `Pass options.fetcher = async () => data when calling apiClient.call().`,
      false,
    );
  }

  const result = await fetchWithRetry(apiId, endpointId, fetcher);

  // ── Step 7 (success path) ─────────────────────────────────────────────────
  if (result.ok) {
    if (result.data !== null) {
      cacheSet(apiId, endpointId, params, result.data);
    }
    // 5xx errors don't reach here (handled in retry loop), so recordCall is safe
    quotaTracker.recordCall(apiId, endpointId, effectiveCallCount);
    // Schedule deferred queue drain — a successful call means quota may have room
    scheduleDrain();
    return makeOk(result.data, false, effectiveCallCount, getQuotaRemaining(apiId));
  }

  // ── Error paths ────────────────────────────────────────────────────────────

  if (result.errorType === "auth") {
    return makeErr(
      ERROR_TYPES.AUTH,
      `Auth error (HTTP ${result.status}) for "${apiId}". ` +
      `Check the API key configured for this source (see apiRegistry.js or .env.local).`,
      false,
    );
  }

  if (result.errorType === "quota") {
    // quotaTracker.markExhausted() was already called inside fetchWithRetry
    // Never compute exhaustion duration here — always delegated to quotaTracker
    return makeErr(
      ERROR_TYPES.QUOTA_EXHAUSTED,
      `"${apiId}" returned HTTP 429 after ${MAX_RETRIES} retries. ` +
      `All calls to this API are now blocked until the quota window resets. ` +
      `Check the QuotaDashboard for reset time.`,
      false,
      result.retryAfterSec,
    );
  }

  if (result.errorType === "server") {
    // 5xx: quota is NOT consumed (recordCall not called — intentional)
    return makeErr(
      ERROR_TYPES.SERVER_ERROR,
      `"${apiId}" returned HTTP ${result.status} (server error) after ${MAX_RETRIES} retries.`,
      true,
    );
  }

  if (result.errorType === "client") {
    return makeErr(
      ERROR_TYPES.BAD_REQUEST,
      `"${apiId}/${endpointId}" returned HTTP ${result.status}. ` +
      `This is likely a misconfigured endpoint path or params. Check apiRegistry.js.`,
      false,
    );
  }

  // network
  return makeErr(
    ERROR_TYPES.NETWORK,
    `Network error calling "${apiId}/${endpointId}". Check connectivity.`,
    true,
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const apiClient = {

  /**
   * Make an API call routed through quota tracking, caching, and retry.
   *
   * Always resolves — never rejects. All runtime error paths return the ApiResponse
   * shape with a non-null error field. The only exception is a missing callCount on
   * a variable-cost endpoint, which throws synchronously (programming error).
   *
   * @param {string} apiId       - Registered API key (e.g. "fmp", "finnhub")
   * @param {string} endpointId  - Registered endpoint key (e.g. "profile", "quote")
   * @param {*} [params={}]      - Call parameters for cache key and context (JSON-serializable)
   * @param {Object} [options={}]
   * @param {Function} options.fetcher
   *   Async function that makes one HTTP request and returns parsed data.
   *   Must throw ApiHttpError for non-OK HTTP responses. Must NOT retry or cache.
   * @param {number} [options.callCount]
   *   REQUIRED when endpointId has callsPerRequest: 0 (variable cost, e.g. batchProfile).
   *   Set to the number of symbols/items in the batch. Throws if absent.
   * @returns {Promise<ApiResponse>}
   *
   * @throws {Error} Only when callCount is missing for a variable-cost endpoint.
   *   This is a programming error — it fails loudly so developers catch it during development.
   */
  async call(apiId, endpointId, params = {}, options = {}) {
    try {
      return await _executeCall(apiId, endpointId, params, options);
    } catch (err) {
      // Variable-cost callCount errors must propagate — they are programming bugs, not runtime errors
      if (err.message?.includes("callsPerRequest: 0")) throw err;
      // Everything else is an unexpected internal error — degrade gracefully
      console.error(`[ApiClient] Unexpected internal error in call("${apiId}/${endpointId}"):`, err);
      return makeErr(ERROR_TYPES.BAD_REQUEST, `Internal error: ${err.message}`, false);
    }
  },

  // ── Deferred Queue Management ──────────────────────────────────────────────

  /**
   * Get a snapshot of deferred queue sizes per API.
   * Used by QuotaDashboard to show "N deferred calls pending".
   * @returns {Record<string, number>}
   */
  getDeferredQueueSizes() {
    const sizes = {};
    Object.keys(deferredQueues).forEach(apiId => {
      sizes[apiId] = deferredQueues[apiId]?.length ?? 0;
    });
    return sizes;
  },

  /**
   * Get the total number of deferred calls across all APIs.
   * @returns {number}
   */
  getTotalDeferredCount() {
    return Object.values(deferredQueues).reduce((sum, q) => sum + (q?.length ?? 0), 0);
  },

  /**
   * Manually trigger deferred queue drain without waiting for a successful call.
   * Useful after a manual quota reset or for testing.
   * @returns {Promise<void>}
   */
  async drainDeferredQueues() {
    return drainAllQueues();
  },

  /**
   * Clear all deferred calls for a specific API.
   * Use when resetting state or after a manual quota reset.
   * @param {string} apiId
   */
  clearDeferredQueue(apiId) {
    const count = deferredQueues[apiId]?.length ?? 0;
    deferredQueues[apiId] = [];
    if (count > 0) {
      console.info(`[ApiClient] Cleared ${count} deferred calls for "${apiId}".`);
    }
  },
};

export default apiClient;
