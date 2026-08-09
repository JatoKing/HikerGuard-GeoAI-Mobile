import {
  getOrCreateDeviceId,
  listPendingBatchEvents,
  markEventsAcknowledged,
  markEventsFailed,
  incrementAttemptCount,
  updateSyncMeta,
  getSyncBackoffState,
  recordSyncTransientFailure,
  resetSyncBackoff,
} from '@/src/repositories/hike-repository';
import { buildBatchRequest, computeBackoffMs, isBackoffActive } from '@/src/sync/queue';
import { PermanentSyncError, type SyncApiClient } from '@/src/api/client';

export type SyncAttemptResult =
  | { status: 'nothing_pending' }
  | { status: 'acknowledged'; acknowledgedCount: number; rejectedCount: number }
  | { status: 'transient_failure'; nextRetryAt: string }
  | { status: 'permanent_failure' }
  | { status: 'backoff_pending'; nextRetryAt: string };

export type AttemptSyncOptions = {
  /** Bypasses the persisted backoff window — Section 12 still wants network
   * return, app foreground, and manual retry to all trigger an attempt, but
   * only a manual/safety-critical retry (the user tapping "Retry sync", or
   * the pre-gap sync in Section 11) should override a backoff that a
   * background trigger left in place. */
  force?: boolean;
};

/**
 * One sync attempt for a session: pull pending records, send one batch,
 * apply the result. Network reachability only decides WHEN to call this —
 * the acknowledgement response is the only thing that marks a record synced
 * (Section 12).
 */
export async function attemptSync(
  localSessionId: string,
  apiClient: SyncApiClient,
  options: AttemptSyncOptions = {}
): Promise<SyncAttemptResult> {
  const events = await listPendingBatchEvents(localSessionId);
  if (events.length === 0) {
    return { status: 'nothing_pending' };
  }

  if (!options.force) {
    const backoff = await getSyncBackoffState(localSessionId);
    if (isBackoffActive(backoff.nextRetryAt, new Date().toISOString())) {
      return { status: 'backoff_pending', nextRetryAt: backoff.nextRetryAt as string };
    }
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
    // The server is reachable — clear any backoff from prior failures, even
    // on a partial acknowledgement.
    await resetSyncBackoff(localSessionId);

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
    // Transient (network/timeout/5xx) — leave pending, bump attempt_count,
    // and persist a backoff window so the next non-forced trigger (app
    // foreground, network return) doesn't immediately hammer the server
    // again — including across an app restart (Section 12).
    await incrementAttemptCount(events.map((e) => e.eventId));
    const { syncFailureStreak } = await getSyncBackoffState(localSessionId);
    const nextRetryAt = new Date(Date.now() + computeBackoffMs(syncFailureStreak)).toISOString();
    await recordSyncTransientFailure(localSessionId, nextRetryAt);
    return { status: 'transient_failure', nextRetryAt };
  }
}
