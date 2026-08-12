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

    expect(summaries).toHaveLength(6);
    for (const summary of summaries) {
      const pack = await repository.getTrailPack(summary.trailId);
      expect(pack.trailId).toBe(summary.trailId);
      expect(pack.predictionAvailable).toBe(summary.predictionAvailable);
      expect(pack.segments.some((segment) => segment.riskClass !== 'uncertain')).toBe(true);
    }
  });

  it('lists only M9 v11 packs with at least one non-uncertain segment', async () => {
    const repository = new FixtureTrailRepository();
    const summaries = await repository.listTrails();
    const packs = await Promise.all(summaries.map((summary) => repository.getTrailPack(summary.trailId)));

    expect(summaries.map((summary) => summary.trailId).sort()).toEqual([
      'bukit-kerinchi',
      'bukit-wawasan-puchong',
      'gunung-korbu',
      'gunung-tahan',
      'jalan-bukit-larut',
      'jalan-kledang',
    ]);
    expect(packs.every((pack) => pack.stage === 'model_backed')).toBe(true);
    expect(packs.flatMap((pack) => pack.segments)).toHaveLength(450);
  });
});
