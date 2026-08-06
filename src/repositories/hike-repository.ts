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

export async function countPendingLocationPoints(localSessionId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM location_point WHERE local_session_id = ? AND sync_state = 'pending'`,
    [localSessionId]
  );
  return row?.count ?? 0;
}
