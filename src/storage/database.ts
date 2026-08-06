import * as SQLite from 'expo-sqlite';

import { MIGRATION_001_INITIAL } from '@/src/storage/migrations/001-initial';
import { MIGRATION_002_SYNC_META } from '@/src/storage/migrations/002-sync-meta';

/**
 * Ordered, versioned migrations (Section 9: "Every database migration must
 * be versioned"). Applied against PRAGMA user_version — never edit an
 * already-shipped entry, only append new ones.
 */
const MIGRATIONS: string[] = [MIGRATION_001_INITIAL, MIGRATION_002_SYNC_META];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  for (let i = currentVersion; i < MIGRATIONS.length; i += 1) {
    await db.execAsync(MIGRATIONS[i]);
    currentVersion = i + 1;
    await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
  }
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('jejak.db').then(async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON');
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}
