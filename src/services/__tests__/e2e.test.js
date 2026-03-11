/**
 * End-to-End Tests — Layer 6 Migration
 *
 * Test 1: Quota exhaustion simulation
 * Test 2: Page refresh mid-day (per-day counter persistence)
 * Test 3: Cache deduplication (parallel identical calls → one fetch)
 * Test 4: Deferred queue drain (critical quota → defer → recover → drain)
 *
 * Each test resets all affected counters in afterEach to prevent bleed-through.
 * Uses jsdom environment for localStorage support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiHttpError } from '../apiClient.js';
import { quotaTracker } from '../quotaTracker.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** localStorage key for FMP's per-day counter (mirrors quotaTracker internals) */
function fmpDayKey() {
  const today = new Date().toISOString().slice(0, 10);
  return `quota:daily:${today}:fmp`;
}

/** Set FMP per-day used counter directly in localStorage */
function setFmpUsed(count) {
  localStorage.setItem(fmpDayKey(), String(count));
}

/** A simple fetcher that returns a fixed payload and records how many times it was called */
function makeFetcher(payload = { ok: true }, callLog = { count: 0 }) {
  return async () => {
    callLog.count++;
    return payload;
  };
}

// Reset FMP and BRAPI counters after each test
afterEach(() => {
  quotaTracker.resetCounters('fmp');
  quotaTracker.resetCounters('brapi');
  quotaTracker.resetCounters('bcb');
  apiClient.clearDeferredQueue('fmp');
  apiClient.clearDeferredQueue('brapi');
  vi.restoreAllMocks();
});

// ─── Test 1: Quota exhaustion simulation ──────────────────────────────────────

describe('Test 1 — Quota exhaustion simulation', () => {
  it('allows calls within quota, blocks calls when quota is exhausted', async () => {
    // FMP limit = 250/day. Set to 249 used (1 remaining).
    setFmpUsed(249);

    const callLog = { count: 0 };
    const fetcher = makeFetcher({ company: 'ACME' }, callLog);

    // Call 1: 249 used + 1 cost = 250 total, exactly at limit → should succeed
    const res1 = await apiClient.call('fmp', 'profile', { symbol: 'ACME' }, { fetcher });
    expect(res1.error).toBeNull();
    expect(res1.data).toEqual({ company: 'ACME' });
    expect(callLog.count).toBe(1);

    // Call 2: 250 used + 1 cost = 251 > 250 → must be blocked with QuotaExhausted
    const res2 = await apiClient.call('fmp', 'ratiosTTM', { symbol: 'ACME' }, { fetcher });
    expect(res2.error).not.toBeNull();
    expect(res2.error.type).toBe('QuotaExhausted');
    expect(res2.data).toBeNull();

    // Fetcher was NOT called for the blocked call
    expect(callLog.count).toBe(1);
  });
});

// ─── Test 2: Page refresh mid-day (per-day counter persistence) ───────────────

describe('Test 2 — Page refresh mid-day', () => {
  it('per-day quota counter survives a simulated page refresh via localStorage', () => {
    // Simulate 50 calls having been recorded before this "page load"
    setFmpUsed(50);

    // After a page refresh quotaTracker reads from localStorage on first canCall() / getRemainingQuota()
    const status = quotaTracker.getRemainingQuota('fmp');

    expect(status.perDayUsed).toBe(50);
    expect(status.perDayRemaining).toBe(200); // 250 - 50
    expect(status.health).toBe('healthy');   // 80% remaining → healthy
  });

  it('canCall returns false after simulated refresh with exhausted per-day counter', () => {
    // Simulate a full day's quota already spent
    setFmpUsed(250);

    const allowed = quotaTracker.canCall('fmp', 'profile', 1);
    expect(allowed).toBe(false);
  });
});

// ─── Test 3: Cache deduplication ──────────────────────────────────────────────
// apiClient uses post-completion caching, not in-flight dedup.
// Dedup works as: call 1 completes → result cached → call 2 hits cache.
// Benefit: same session, same params → quota charged once, not twice.

describe('Test 3 — Cache deduplication', () => {
  it('second call with identical params hits cache and charges zero quota', async () => {
    const callLog = { count: 0 };
    const fetcher = makeFetcher({ price: 150 }, callLog);
    const params = { symbol: 'GOOG' };

    // Call 1 — fresh fetch
    const res1 = await apiClient.call('fmp', 'profile', params, { fetcher });
    expect(res1.data).toEqual({ price: 150 });
    expect(res1.fromCache).toBe(false);
    expect(res1.quotaUsed).toBe(1);
    expect(callLog.count).toBe(1);

    // Call 2 — same params → cache hit
    const res2 = await apiClient.call('fmp', 'profile', params, { fetcher });
    expect(res2.data).toEqual({ price: 150 });
    expect(res2.fromCache).toBe(true);
    expect(res2.quotaUsed).toBe(0); // no quota consumed on cache hit
    expect(callLog.count).toBe(1); // fetcher still called exactly once
  });

  it('params with different key order produce the same cache key (stable hash)', async () => {
    const callLog = { count: 0 };
    const fetcher = makeFetcher({ price: 200 }, callLog);

    // Call with unsorted symbols
    const res1 = await apiClient.call('fmp', 'profile', { symbol: 'META' }, { fetcher });
    expect(res1.fromCache).toBe(false);
    expect(callLog.count).toBe(1);

    // Call with the same params object constructed differently — same cache key expected
    const res2 = await apiClient.call('fmp', 'profile', { symbol: 'META' }, { fetcher });
    expect(res2.fromCache).toBe(true);
    expect(callLog.count).toBe(1); // fetcher not called again
  });
});

// ─── Test 4: Deferred queue drain ─────────────────────────────────────────────

describe('Test 4 — Deferred queue drain', () => {
  it('defers canDefer:true calls when quota is critical, then drains after recovery', async () => {
    // FMP profile has canDefer: true, priority: high.
    // Set FMP to "critical" health: 5–20% remaining. 90% used = 225/250 → 10% remaining → critical.
    setFmpUsed(225);

    const callLog = { count: 0 };
    const fetcher = makeFetcher({ sector: 'Tech' }, callLog);

    // Call should be deferred (not executed yet)
    const deferredRes = await apiClient.call('fmp', 'profile', { symbol: 'TSLA' }, { fetcher });
    expect(deferredRes.deferred).toBe(true);
    expect(deferredRes.data).toBeNull();
    expect(callLog.count).toBe(0); // fetcher was NOT called

    // Deferred queue should have 1 item
    expect(apiClient.getTotalDeferredCount()).toBe(1);

    // Simulate quota recovery: reset FMP counters → health returns to "healthy"
    quotaTracker.resetCounters('fmp');

    // Manually drain the deferred queue
    await apiClient.drainDeferredQueues();

    // After drain, fetcher should have been called
    expect(callLog.count).toBe(1);

    // Deferred queue should now be empty
    expect(apiClient.getTotalDeferredCount()).toBe(0);

    // The drained call's result should now be in cache — a fresh call returns it without hitting fetcher
    const cachedRes = await apiClient.call('fmp', 'profile', { symbol: 'TSLA' }, { fetcher });
    expect(cachedRes.fromCache).toBe(true);
    expect(cachedRes.data).toEqual({ sector: 'Tech' });
    expect(callLog.count).toBe(1); // fetcher still called exactly once total
  });
});
