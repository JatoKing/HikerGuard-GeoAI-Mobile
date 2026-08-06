import { parseTrailPack, parseTrailSummary } from '@/src/api/contracts';
import type { TrailPack, TrailSummary } from '@/src/domain/trail';
import type { TrailRepository } from '@/src/repositories/trail-repository';

import trailPacksByTrailId from '@/src/repositories/fixtures/jalan-bukit-larut.trail-pack.json';
import trailSummariesFixture from '@/src/repositories/fixtures/trail-summaries.fixture.json';

const FIXTURE_PACKS: Record<string, unknown> = {
  'jalan-bukit-larut': trailPacksByTrailId,
};

export class FixtureTrailRepository implements TrailRepository {
  async listTrails(): Promise<TrailSummary[]> {
    return trailSummariesFixture.map(parseTrailSummary);
  }

  async getTrailPack(trailId: string): Promise<TrailPack> {
    const raw = FIXTURE_PACKS[trailId];
    if (!raw) {
      throw new Error(`No fixture trail pack for trail_id "${trailId}"`);
    }
    return parseTrailPack(raw);
  }
}
