import { getDatabase } from '@/src/storage/database';
import type { RoutePackRecord, RoutePackStatus, TrailPack } from '@/src/domain/trail';

/**
 * Durable storage for downloaded trail packs — the `route_pack` table from
 * handoff contract Section 9. Replaces the WP2 AsyncStorage interim store;
 * callers (app/trails/[trailId].tsx) didn't need to change since this
 * module keeps the same load/save/remove exports.
 */
type RoutePackRow = {
  trail_id: string;
  pack_version: string;
  payload_json: string;
};

type RoutePackMetadataRow = {
  trail_id: string;
  pack_version: string;
  schema_version: string;
  model_version: string | null;
  downloaded_at: string;
  checksum: string;
  status: RoutePackStatus;
};

function rowToMetadata(row: RoutePackMetadataRow): RoutePackRecord {
  return {
    trailId: row.trail_id,
    packVersion: row.pack_version,
    schemaVersion: row.schema_version,
    modelVersion: row.model_version,
    downloadedAt: row.downloaded_at,
    checksum: row.checksum,
    status: row.status,
  };
}

export async function loadStoredPack(trailId: string): Promise<TrailPack | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RoutePackRow>(
    'SELECT trail_id, pack_version, payload_json FROM route_pack WHERE trail_id = ?',
    [trailId]
  );
  if (!row) return null;
  return JSON.parse(row.payload_json) as TrailPack;
}

export async function saveStoredPack(pack: TrailPack): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO route_pack (trail_id, pack_version, schema_version, model_version, downloaded_at, checksum, payload_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ready')
     ON CONFLICT(trail_id) DO UPDATE SET
       pack_version = excluded.pack_version,
       schema_version = excluded.schema_version,
       model_version = excluded.model_version,
       downloaded_at = excluded.downloaded_at,
       checksum = excluded.checksum,
       payload_json = excluded.payload_json,
       status = 'ready'`,
    [
      pack.trailId,
      pack.packVersion,
      pack.schemaVersion,
      pack.model.modelVersion,
      new Date().toISOString(),
      pack.integrity.checksum,
      JSON.stringify(pack),
    ]
  );
}

/** Download timestamp, checksum, and status — distinct from the pack's own
 * `generated_at` (that's when JEJAK produced the pack; this is when this
 * device fetched it). */
export async function getStoredPackMetadata(trailId: string): Promise<RoutePackRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RoutePackMetadataRow>(
    `SELECT trail_id, pack_version, schema_version, model_version, downloaded_at, checksum, status
     FROM route_pack WHERE trail_id = ?`,
    [trailId]
  );
  return row ? rowToMetadata(row) : null;
}

export async function listStoredPacks(): Promise<TrailPack[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RoutePackRow>(
    "SELECT trail_id, pack_version, payload_json FROM route_pack WHERE status = 'ready'"
  );
  return rows.map((row) => JSON.parse(row.payload_json) as TrailPack);
}

export async function removeStoredPack(trailId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM route_pack WHERE trail_id = ?', [trailId]);
}
