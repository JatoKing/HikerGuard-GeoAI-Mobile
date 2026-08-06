/**
 * Migration 001 — the four minimum entities from handoff contract Section 9:
 * route_pack, hike_session, location_point, hike_event.
 *
 * `route_pack` also carries a `payload_json` column holding the full
 * validated TrailPack (model + segments), since Section 9 only specifies a
 * `file_path or normalised segment reference` and no separate segment
 * table exists yet — this is that "normalised reference" for now.
 */
export const MIGRATION_001_INITIAL = `
CREATE TABLE IF NOT EXISTS route_pack (
  trail_id TEXT PRIMARY KEY NOT NULL,
  pack_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  checksum TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('downloading', 'ready', 'failed', 'stale'))
);

CREATE TABLE IF NOT EXISTS hike_session (
  local_session_id TEXT PRIMARY KEY NOT NULL,
  server_session_id TEXT,
  trail_id TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  state TEXT NOT NULL CHECK (
    state IN ('prepared', 'active', 'paused', 'completed', 'sync_pending', 'synced')
  )
);

CREATE TABLE IF NOT EXISTS location_point (
  event_id TEXT PRIMARY KEY NOT NULL,
  local_session_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  horizontal_accuracy_m REAL NOT NULL,
  altitude_m REAL,
  battery_level REAL,
  segment_id TEXT,
  observed_network_state TEXT NOT NULL CHECK (
    observed_network_state IN ('online', 'offline', 'unknown')
  ),
  sync_state TEXT NOT NULL CHECK (
    sync_state IN ('pending', 'in_flight', 'acknowledged', 'failed')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (local_session_id) REFERENCES hike_session (local_session_id)
);

CREATE TABLE IF NOT EXISTS hike_event (
  event_id TEXT PRIMARY KEY NOT NULL,
  local_session_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'hike_started', 'gap_warning_shown', 'connectivity_lost',
      'connectivity_returned', 'checkpoint', 'sos_requested', 'hike_ended'
    )
  ),
  payload_json TEXT NOT NULL,
  sync_state TEXT NOT NULL CHECK (
    sync_state IN ('pending', 'in_flight', 'acknowledged', 'failed')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (local_session_id) REFERENCES hike_session (local_session_id)
);

CREATE INDEX IF NOT EXISTS idx_location_point_session
  ON location_point (local_session_id);

CREATE INDEX IF NOT EXISTS idx_hike_event_session
  ON hike_event (local_session_id);
`;
