import { MIGRATION_001_INITIAL } from '@/src/storage/migrations/001-initial';
import { MIGRATION_002_SYNC_META } from '@/src/storage/migrations/002-sync-meta';

describe('MIGRATION_001_INITIAL', () => {
  const REQUIRED_TABLES = ['route_pack', 'hike_session', 'location_point', 'hike_event'];

  it.each(REQUIRED_TABLES)('creates the %s table', (table) => {
    expect(MIGRATION_001_INITIAL).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  });

  it('scopes location_point and hike_event to a local_session_id foreign key', () => {
    const clauses = MIGRATION_001_INITIAL.match(/FOREIGN KEY \(local_session_id\)/g);
    expect(clauses).toHaveLength(2);
  });

  it('restricts risk-relevant enums to the contract-defined values', () => {
    expect(MIGRATION_001_INITIAL).toMatch(
      /status IN \('downloading', 'ready', 'failed', 'stale'\)/
    );
    expect(MIGRATION_001_INITIAL).toMatch(
      /state IN \(\s*'prepared', 'active', 'paused', 'completed', 'sync_pending', 'synced'\s*\)/
    );
  });
});

describe('MIGRATION_002_SYNC_META', () => {
  it('adds sync bookkeeping columns to hike_session', () => {
    expect(MIGRATION_002_SYNC_META).toMatch(/ADD COLUMN last_sync_attempt_at/);
    expect(MIGRATION_002_SYNC_META).toMatch(/ADD COLUMN last_acknowledged_at/);
  });

  it('creates a single-row device_identity table', () => {
    expect(MIGRATION_002_SYNC_META).toMatch(/CREATE TABLE IF NOT EXISTS device_identity/);
  });
});
