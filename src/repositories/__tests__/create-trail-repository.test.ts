import { createTrailRepository } from '@/src/repositories/create-trail-repository';
import { FixtureTrailRepository } from '@/src/repositories/fixture-trail-repository';
import { HttpTrailRepository } from '@/src/repositories/http-trail-repository';

describe('createTrailRepository', () => {
  it('defaults to the fixture repository when no base URL is configured', () => {
    expect(createTrailRepository(undefined)).toBeInstanceOf(FixtureTrailRepository);
  });

  it('defaults to the fixture repository for an empty base URL', () => {
    expect(createTrailRepository('')).toBeInstanceOf(FixtureTrailRepository);
  });

  it('switches to the HTTP repository once a base URL is configured', () => {
    expect(createTrailRepository('https://api.example.com')).toBeInstanceOf(HttpTrailRepository);
  });
});

describe('FixtureTrailRepository bundled packs', () => {
  it('loads every listed trail through the same validated repository path', async () => {
    const repository = new FixtureTrailRepository();
    const summaries = await repository.listTrails();

    expect(summaries).toHaveLength(10);
    for (const summary of summaries) {
      const pack = await repository.getTrailPack(summary.trailId);
      expect(pack.trailId).toBe(summary.trailId);
      expect(pack.predictionAvailable).toBe(summary.predictionAvailable);
    }
  });

  it('exposes nine M9 v11 model-backed packs and one route-only pack', async () => {
    const repository = new FixtureTrailRepository();
    const summaries = await repository.listTrails();
    const packs = await Promise.all(summaries.map((summary) => repository.getTrailPack(summary.trailId)));

    expect(packs.filter((pack) => pack.stage === 'model_backed')).toHaveLength(9);
    expect(packs.filter((pack) => pack.stage === 'route_only')).toHaveLength(1);
    expect(packs.flatMap((pack) => pack.segments)).toHaveLength(620);
  });
});
