import { describe, it, expect } from 'vitest';
import { runCacheSelfTest } from '../apiCache.js';

describe('apiCache', () => {
  it('passes all internal self-test assertions', async () => {
    const { passed, failed } = await runCacheSelfTest();
    expect(failed).toBe(0);
    expect(passed).toBeGreaterThan(0);
  });
});
