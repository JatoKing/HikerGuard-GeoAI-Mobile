/**
 * Migration 002 — sync bookkeeping for Section 12: last sync attempt and
 * last acknowledgement time per hike session, and a stable per-install
 * device_id for the batch request's `device_id` field.
 */
export const MIGRATION_002_SYNC_META = `
ALTER TABLE hike_session ADD COLUMN last_sync_attempt_at TEXT;
ALTER TABLE hike_session ADD COLUMN last_acknowledged_at TEXT;

CREATE TABLE IF NOT EXISTS device_identity (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  device_id TEXT NOT NULL
);
`;
