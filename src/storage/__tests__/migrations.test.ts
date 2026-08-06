import { MIGRATION_001_INITIAL } from '@/src/storage/migrations/001-initial';

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
