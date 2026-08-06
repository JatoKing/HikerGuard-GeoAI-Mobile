import type { BatchEvent, BatchRequest } from '@/src/domain/sync';

export function buildBatchRequest(
  deviceId: string,
  localSessionId: string,
  events: BatchEvent[]
): BatchRequest {
  return { deviceId, localSessionId, events };
}

export type BackoffOptions = {
  baseMs?: number;
  maxMs?: number;
};

/**
 * Bounded exponential backoff with jitter (Section 12). Jitter is ±20% of
 * the exponential value so many devices retrying at once don't all hit the
 * (mock or future real) server in lockstep.
 */
export function computeBackoffMs(attempt: number, options: BackoffOptions = {}): number {
  const baseMs = options.baseMs ?? 2000;
  const maxMs = options.maxMs ?? 60000;
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  const jitterFactor = 0.8 + Math.random() * 0.4; // 0.8x .. 1.2x
  return Math.min(maxMs, Math.round(exponential * jitterFactor));
}
