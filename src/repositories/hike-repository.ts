import { getDatabase } from '@/src/storage/database';
import { generateUuidV4 } from '@/src/lib/uuid';
import type {
  HikeEvent,
  HikeEventType,
  HikeSession,
  HikeSessionState,
  LocationPoint,
  NetworkObservationState,
} from '@/src/domain/hike';
import type { BatchEvent } from '@/src/domain/sync';

type HikeSessionRow = {
  local_session_id: string;
  server_session_id: string | null;
  trail_id: string;
  pack_version: string;
  started_at: string;
  ended_at: string | null;
  state: HikeSessionState;
};

function rowToSession(row: HikeSessionRow): HikeSession {
  return {
    localSessionId: row.local_session_id,
    serverSessionId: row.server_session_id,
    trailId: row.trail_id,
    packVersion: row.pack_version,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    state: row.state,
  };
}

/**
 * Starts a new hike session — `local_session_id` is generated before any
 * network request exists, per Section 9.
 */
export async function startHikeSession(
  trailId: string,
  packVersion: string
): Promise<HikeSession> {
  const db = await getDatabase();
  const localSessionId = generateUuidV4();
  const startedAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO hike_session (local_session_id, server_session_id, trail_id, pack_version, started_at, ended_at, state)
     VALUES (?, NULL, ?, ?, ?, NULL, 'active')`,
    [localSessionId, trailId, packVersion, startedAt]
  );

  return {
    localSessionId,
    serverSessionId: null,
    trailId,
    packVersion,
    startedAt,
    endedAt: null,
    state: 'active',
  };
}

/**
 * The session in `active`/`paused` state, if any — used to restore an
 * active hike after the app or phone process restarts (Section 10).
 */
export async function getResumableHikeSession(): Promise<HikeSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<HikeSessionRow>(
    `SELECT * FROM hike_session WHERE state IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1`
  );
  return row ? rowToSession(row) : null;
}

export async function setHikeSessionState(
  localSessionId: string,
  state: HikeSessionState
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE hike_session SET state = ? WHERE local_session_id = ?', [
    state,
    localSessionId,
  ]);
}

export async function endHikeSession(localSessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE hike_session SET state = 'completed', ended_at = ? WHERE local_session_id = ?`,
    [new Date().toISOString(), localSessionId]
  );
}

export async function insertLocationPoint(point: {
  localSessionId: string;
  latitude: number;
  longitude: number;
  horizontalAccuracyM: number;
  altitudeM: number | null;
  batteryLevel: number | null;
  observedNetworkState: NetworkObservationState;
}): Promise<LocationPoint> {
  const db = await getDatabase();
  const eventId = generateUuidV4();
  const recordedAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO location_point
       (event_id, local_session_id, recorded_at, latitude, longitude, horizontal_accuracy_m, altitude_m, battery_level, segment_id, observed_network_state, sync_state, attempt_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'pending', 0)`,
    [
      eventId,
      point.localSessionId,
      recordedAt,
      point.latitude,
      point.longitude,
      point.horizontalAccuracyM,
      point.altitudeM,
      point.batteryLevel,
      point.observedNetworkState,
    ]
  );

  return {
    eventId,
    localSessionId: point.localSessionId,
    recordedAt,
    latitude: point.latitude,
    longitude: point.longitude,
    horizontalAccuracyM: point.horizontalAccuracyM,
    altitudeM: point.altitudeM,
    batteryLevel: point.batteryLevel,
    segmentId: null,
    observedNetworkState: point.observedNetworkState,
    syncState: 'pending',
    attemptCount: 0,
  };
}

export async function insertHikeEvent(event: {
  localSessionId: string;
  type: HikeEventType;
  payload: Record<string, unknown>;
}): Promise<HikeEvent> {
  const db = await getDatabase();
  const eventId = generateUuidV4();
  const recordedAt = new Date().toISOString();
  const payloadJson = JSON.stringify(event.payload);

  await db.runAsync(
    `INSERT INTO hike_event (event_id, local_session_id, recorded_at, type, payload_json, sync_state, attempt_count)
     VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
    [eventId, event.localSessionId, recordedAt, event.type, payloadJson]
  );

  return {
    eventId,
    localSessionId: event.localSessionId,
    recordedAt,
    type: event.type,
    payloadJson,
    syncState: 'pending',
    attemptCount: 0,
  };
}

/**
 * Stable per-install id for the batch request's `device_id` field
 * (Section 12) — generated once, persisted in a single-row table.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ device_id: string }>(
    'SELECT device_id FROM device_identity WHERE id = 1'
  );
  if (existing) return existing.device_id;

  const deviceId = generateUuidV4();
  await db.runAsync('INSERT INTO device_identity (id, device_id) VALUES (1, ?)', [deviceId]);
  return deviceId;
}

export async function countPendingSyncItems(localSessionId: string): Promise<number> {
  const db = await getDatabase();
  const locationCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM location_point WHERE local_session_id = ? AND sync_state = 'pending'`,
    [localSessionId]
  );
  const eventCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM hike_event WHERE local_session_id = ? AND sync_state = 'pending'`,
    [localSessionId]
  );
  return (locationCount?.count ?? 0) + (eventCount?.count ?? 0);
}

/** Oldest-first pending location points + hike events, combined into one
 * batch-ready list — Section 12: "Batch pending events in recorded order." */
export async function listPendingBatchEvents(
  localSessionId: string,
  limit = 50
): Promise<BatchEvent[]> {
  const db = await getDatabase();

  const locationRows = await db.getAllAsync<{
    event_id: string;
    recorded_at: string;
    latitude: number;
    longitude: number;
    horizontal_accuracy_m: number;
    segment_id: string | null;
  }>(
    `SELECT event_id, recorded_at, latitude, longitude, horizontal_accuracy_m, segment_id
     FROM location_point WHERE local_session_id = ? AND sync_state = 'pending'`,
    [localSessionId]
  );
  const eventRows = await db.getAllAsync<{
    event_id: string;
    recorded_at: string;
    type: string;
    payload_json: string;
  }>(
    `SELECT event_id, recorded_at, type, payload_json
     FROM hike_event WHERE local_session_id = ? AND sync_state = 'pending'`,
    [localSessionId]
  );

  const batchEvents: BatchEvent[] = [
    ...locationRows.map((row) => ({
      eventId: row.event_id,
      type: 'location_point',
      recordedAt: row.recorded_at,
      payload: {
        latitude: row.latitude,
        longitude: row.longitude,
        horizontal_accuracy_m: row.horizontal_accuracy_m,
        segment_id: row.segment_id,
      },
    })),
    ...eventRows.map((row) => ({
      eventId: row.event_id,
      type: row.type,
      recordedAt: row.recorded_at,
      payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    })),
  ];

  return batchEvents
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .slice(0, limit);
}

async function updateSyncStateForIds(
  eventIds: string[],
  syncState: 'acknowledged' | 'failed'
): Promise<void> {
  if (eventIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = eventIds.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE location_point SET sync_state = ? WHERE event_id IN (${placeholders})`,
    [syncState, ...eventIds]
  );
  await db.runAsync(
    `UPDATE hike_event SET sync_state = ? WHERE event_id IN (${placeholders})`,
    [syncState, ...eventIds]
  );
}

export async function markEventsAcknowledged(eventIds: string[]): Promise<void> {
  await updateSyncStateForIds(eventIds, 'acknowledged');
}

/** Section 12: "Do not retry permanent validation/authentication failures
 * forever" — marks these ineligible for further retry. */
export async function markEventsFailed(eventIds: string[]): Promise<void> {
  await updateSyncStateForIds(eventIds, 'failed');
}

export async function incrementAttemptCount(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = eventIds.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE location_point SET attempt_count = attempt_count + 1 WHERE event_id IN (${placeholders})`,
    eventIds
  );
  await db.runAsync(
    `UPDATE hike_event SET attempt_count = attempt_count + 1 WHERE event_id IN (${placeholders})`,
    eventIds
  );
}

export async function updateSyncMeta(
  localSessionId: string,
  meta: { lastSyncAttemptAt?: string; lastAcknowledgedAt?: string }
): Promise<void> {
  const db = await getDatabase();
  if (meta.lastSyncAttemptAt) {
    await db.runAsync(
      'UPDATE hike_session SET last_sync_attempt_at = ? WHERE local_session_id = ?',
      [meta.lastSyncAttemptAt, localSessionId]
    );
  }
  if (meta.lastAcknowledgedAt) {
    await db.runAsync(
      'UPDATE hike_session SET last_acknowledged_at = ? WHERE local_session_id = ?',
      [meta.lastAcknowledgedAt, localSessionId]
    );
  }
}

export type SyncMeta = {
  lastSyncAttemptAt: string | null;
  lastAcknowledgedAt: string | null;
  pendingCount: number;
};

export async function getSyncMeta(localSessionId: string): Promise<SyncMeta> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    last_sync_attempt_at: string | null;
    last_acknowledged_at: string | null;
  }>(
    'SELECT last_sync_attempt_at, last_acknowledged_at FROM hike_session WHERE local_session_id = ?',
    [localSessionId]
  );
  const pendingCount = await countPendingSyncItems(localSessionId);

  return {
    lastSyncAttemptAt: row?.last_sync_attempt_at ?? null,
    lastAcknowledgedAt: row?.last_acknowledged_at ?? null,
    pendingCount,
  };
}

export type LastAcknowledgedLocation = {
  trailId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
};

/**
 * The newest location by recorded_at whose event_id has been acknowledged,
 * across every hike session — not the phone's current GPS position, the
 * newest queued point, or the last network check (Section 12).
 */
export async function getLastAcknowledgedLocation(): Promise<LastAcknowledgedLocation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    trail_id: string;
    latitude: number;
    longitude: number;
    recorded_at: string;
  }>(
    `SELECT hs.trail_id, lp.latitude, lp.longitude, lp.recorded_at
     FROM location_point lp
     JOIN hike_session hs ON hs.local_session_id = lp.local_session_id
     WHERE lp.sync_state = 'acknowledged'
     ORDER BY lp.recorded_at DESC
     LIMIT 1`
  );
  if (!row) return null;
  return {
    trailId: row.trail_id,
    latitude: row.latitude,
    longitude: row.longitude,
    recordedAt: row.recorded_at,
  };
}

/** Oldest-first path for one session — used to redraw the walked-so-far
 * line on the live map after a restart/resume, not just new points. */
export async function listLocationPointsForSession(
  localSessionId: string
): Promise<{ latitude: number; longitude: number; recordedAt: string }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ latitude: number; longitude: number; recorded_at: string }>(
    `SELECT latitude, longitude, recorded_at FROM location_point
     WHERE local_session_id = ? ORDER BY recorded_at ASC`,
    [localSessionId]
  );
  return rows.map((row) => ({
    latitude: row.latitude,
    longitude: row.longitude,
    recordedAt: row.recorded_at,
  }));
}
