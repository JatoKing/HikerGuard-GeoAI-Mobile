import { getDatabase } from '@/src/storage/database';
import type { TrailPack } from '@/src/domain/trail';

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
