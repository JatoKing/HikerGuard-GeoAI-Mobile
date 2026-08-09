export type HikeSessionState =
  | 'prepared'
  | 'active'
  | 'paused'
  | 'completed'
  | 'sync_pending'
  | 'synced';

export type HikeSession = {
  localSessionId: string;
  serverSessionId: string | null;
  trailId: string;
  packVersion: string;
  startedAt: string;
  endedAt: string | null;
  state: HikeSessionState;
  /** Consecutive transient sync failures since the last acknowledgement —
   * drives the persisted backoff window (Section 12). */
  syncFailureStreak: number;
  /** ISO timestamp before which a non-forced sync attempt should be
   * skipped; null once backoff has cleared. */
  nextRetryAt: string | null;
};

export type NetworkObservationState = 'online' | 'offline' | 'unknown';

export type SyncState = 'pending' | 'in_flight' | 'acknowledged' | 'failed';

export type LocationPoint = {
  eventId: string;
  localSessionId: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  horizontalAccuracyM: number;
  altitudeM: number | null;
  batteryLevel: number | null;
  segmentId: string | null;
  observedNetworkState: NetworkObservationState;
  syncState: SyncState;
  attemptCount: number;
};

export type HikeEventType =
  | 'hike_started'
  | 'gap_warning_shown'
  | 'connectivity_lost'
  | 'connectivity_returned'
  | 'checkpoint'
  | 'sos_requested'
  | 'hike_ended';

export type HikeEvent = {
  eventId: string;
  localSessionId: string;
  recordedAt: string;
  type: HikeEventType;
  payloadJson: string;
  syncState: SyncState;
  attemptCount: number;
};
