import { FixtureTrailRepository } from '@/src/repositories/fixture-trail-repository';
import { HttpTrailRepository } from '@/src/repositories/http-trail-repository';
import type { TrailRepository } from '@/src/repositories/trail-repository';

/**
 * Section 8's explicit fixture/HTTP source switch: a checked-in fixture for
 * development and automated tests, or an HTTP-backed repository once the
 * application backend's base URL is known. Screens should call
 * `createTrailRepository()` instead of constructing either implementation
 * directly, so switching sources is a single env var, not a code change per
 * screen.
 *
 * `EXPO_PUBLIC_TRAIL_API_BASE_URL` unset/empty (the default — no backend
 * exists yet per Section 18) keeps every screen on the fixture source.
 */
export function createTrailRepository(baseUrl: string | undefined = process.env.EXPO_PUBLIC_TRAIL_API_BASE_URL): TrailRepository {
  if (baseUrl) {
    return new HttpTrailRepository(baseUrl);
  }
  return new FixtureTrailRepository();
}
