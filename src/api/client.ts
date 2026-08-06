import { parseBatchAcknowledgement, toBatchRequestWire } from '@/src/api/contracts';
import type { BatchAcknowledgement, BatchRequest } from '@/src/domain/sync';

/** 5xx/timeout/network-down — safe to retry later. */
export class TransientSyncError extends Error {}
/** 4xx validation/auth — Section 12: don't retry forever. */
export class PermanentSyncError extends Error {}

export interface SyncApiClient {
  submitBatch(request: BatchRequest): Promise<BatchAcknowledgement>;
}

/**
 * No application backend exists yet (Section 18: the JEJAK API only
 * exposes GET /health). This mock lets the client protocol — batching,
 * idempotent event_ids, ack-driven state — be exercised end to end without
 * one, per Section 18's suggestion to test against a mock server. Always
 * acknowledges everything after a short delay; swap for HttpSyncApiClient
 * once a real endpoint exists.
 */
export class MockSyncApiClient implements SyncApiClient {
  async submitBatch(request: BatchRequest): Promise<BatchAcknowledgement> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      serverSessionId: request.localSessionId,
      acknowledgedEventIds: request.events.map((e) => e.eventId),
      rejectedEvents: [],
      serverReceivedAt: new Date().toISOString(),
    };
  }
}

export class HttpSyncApiClient implements SyncApiClient {
  constructor(private baseUrl: string) {}

  async submitBatch(request: BatchRequest): Promise<BatchAcknowledgement> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBatchRequestWire(request)),
      });
    } catch (error) {
      throw new TransientSyncError(error instanceof Error ? error.message : 'Network request failed');
    }

    if (response.status >= 500) {
      throw new TransientSyncError(`Server error ${response.status}`);
    }
    if (response.status >= 400) {
      throw new PermanentSyncError(`Batch rejected with status ${response.status}`);
    }

    return parseBatchAcknowledgement(await response.json());
  }
}
