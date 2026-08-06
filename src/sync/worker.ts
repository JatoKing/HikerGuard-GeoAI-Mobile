import {
  getOrCreateDeviceId,
  listPendingBatchEvents,
  markEventsAcknowledged,
  markEventsFailed,
  incrementAttemptCount,
  updateSyncMeta,
} from '@/src/repositories/hike-repository';
import { buildBatchRequest } from '@/src/sync/queue';
import { PermanentSyncError, type SyncApiClient } from '@/src/api/client';

export type SyncAttemptResult =
  | { status: 'nothing_pending' }
  | { status: 'acknowledged'; acknowledgedCount: number; rejectedCount: number }
  | { status: 'transient_failure' }
  | { status: 'permanent_failure' };

/**
 * One sync attempt for a session: pull pending records, send one batch,
 * apply the result. Network reachability only decides WHEN to call this —
 * the acknowledgement response is the only thing that marks a record synced
 * (Section 12).
 */
export async function attemptSync(
  localSessionId: string,
  apiClient: SyncApiClient
): Promise<SyncAttemptResult> {
  const events = await listPendingBatchEvents(localSessionId);
  if (events.length === 0) {
    return { status: 'nothing_pending' };
  }

  const deviceId = await getOrCreateDeviceId();
  const request = buildBatchRequest(deviceId, localSessionId, events);

  await updateSyncMeta(localSessionId, { lastSyncAttemptAt: new Date().toISOString() });

  try {
    const ack = await apiClient.submitBatch(request);

    if (ack.acknowledgedEventIds.length > 0) {
      await markEventsAcknowledged(ack.acknowledgedEventIds);
      await updateSyncMeta(localSessionId, { lastAcknowledgedAt: new Date().toISOString() });
    }
    if (ack.rejectedEvents.length > 0) {
      await markEventsFailed(ack.rejectedEvents.map((r) => r.eventId));
    }

    return {
      status: 'acknowledged',
      acknowledgedCount: ack.acknowledgedEventIds.length,
      rejectedCount: ack.rejectedEvents.length,
    };
  } catch (error) {
    if (error instanceof PermanentSyncError) {
      await markEventsFailed(events.map((e) => e.eventId));
      return { status: 'permanent_failure' };
    }
    // Transient (network/timeout/5xx) — leave pending, bump attempt_count
    // so a future retry can apply backoff based on it.
    await incrementAttemptCount(events.map((e) => e.eventId));
    return { status: 'transient_failure' };
  }
}
