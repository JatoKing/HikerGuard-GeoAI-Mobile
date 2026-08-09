/**
 * Migration 003 — `route_pack.model_version` becomes nullable.
 *
 * A `route_only` pack (Section 8) has no JEJAK prediction behind it, so its
 * `model.model_version` is `null` at the domain level; the column must
 * accept that instead of rejecting the insert. SQLite has no
 * `ALTER COLUMN ... DROP NOT NULL`, so the table is rebuilt.
 */
export const MIGRATION_003_NULLABLE_ROUTE_PACK_MODEL_VERSION = `
CREATE TABLE route_pack_new (
  trail_id TEXT PRIMARY KEY NOT NULL,
  pack_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  model_version TEXT,
  downloaded_at TEXT NOT NULL,
  checksum TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('downloading', 'ready', 'failed', 'stale'))
);

INSERT INTO route_pack_new (
  trail_id, pack_version, schema_version, model_version, downloaded_at, checksum, payload_json, status
)
SELECT trail_id, pack_version, schema_version, model_version, downloaded_at, checksum, payload_json, status
FROM route_pack;

DROP TABLE route_pack;

ALTER TABLE route_pack_new RENAME TO route_pack;
`;
