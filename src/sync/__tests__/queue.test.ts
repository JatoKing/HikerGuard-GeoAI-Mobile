import { buildBatchRequest, computeBackoffMs, isBackoffActive } from '@/src/sync/queue';

describe('buildBatchRequest', () => {
  it('carries device id, session id, and events straight through', () => {
    const events = [{ eventId: 'e1', type: 'location_point', recordedAt: 't1', payload: {} }];
    const request = buildBatchRequest('device-1', 'session-1', events);
    expect(request).toEqual({ deviceId: 'device-1', localSessionId: 'session-1', events });
  });
});

describe('computeBackoffMs', () => {
  it('grows exponentially with attempt number', () => {
    const attempt0 = computeBackoffMs(0, { baseMs: 1000, maxMs: 100000 });
    const attempt3 = computeBackoffMs(3, { baseMs: 1000, maxMs: 100000 });
    // even with jitter, attempt 3 (8000ms nominal) should exceed attempt 0
    // (1000ms nominal) by a wide margin
    expect(attempt3).toBeGreaterThan(attempt0);
  });

  it('never exceeds the configured max', () => {
    const backoff = computeBackoffMs(20, { baseMs: 1000, maxMs: 60000 });
    expect(backoff).toBeLessThanOrEqual(60000);
  });

  it('applies jitter within a bounded range around the exponential value', () => {
    const samples = Array.from({ length: 50 }, () => computeBackoffMs(2, { baseMs: 1000, maxMs: 100000 }));
    const nominal = 1000 * 2 ** 2; // 4000
    for (const sample of samples) {
      expect(sample).toBeGreaterThanOrEqual(Math.round(nominal * 0.8));
      expect(sample).toBeLessThanOrEqual(Math.round(nominal * 1.2));
    }
    // not literally identical every time
    expect(new Set(samples).size).toBeGreaterThan(1);
  });
});

describe('isBackoffActive', () => {
  it('is inactive when there is no persisted next_retry_at', () => {
    expect(isBackoffActive(null, '2026-08-10T00:00:00.000Z')).toBe(false);
  });

  it('is active while now is before next_retry_at', () => {
    expect(isBackoffActive('2026-08-10T00:00:10.000Z', '2026-08-10T00:00:00.000Z')).toBe(true);
  });

  it('clears once now reaches or passes next_retry_at', () => {
    expect(isBackoffActive('2026-08-10T00:00:00.000Z', '2026-08-10T00:00:00.000Z')).toBe(false);
    expect(isBackoffActive('2026-08-10T00:00:00.000Z', '2026-08-10T00:00:10.000Z')).toBe(false);
  });
});
