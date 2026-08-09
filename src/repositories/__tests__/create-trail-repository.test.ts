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
