import { parseTrailPack, parseTrailSummary } from '@/src/api/contracts';
import type { TrailPack, TrailSummary } from '@/src/domain/trail';
import type { TrailRepository } from '@/src/repositories/trail-repository';

import gopengUltraTrailGuaTempurung from '@/src/repositories/fixtures/gopeng-ultra-trail-gua-tempurung.trail-pack.json';
import m9BukitKerinci from '@/src/repositories/fixtures/m9-v11/bukit-kerinchi.trail-pack.json';
import m9BukitTabur from '@/src/repositories/fixtures/m9-v11/bukit-tabur.trail-pack.json';
import m9BukitWawasan from '@/src/repositories/fixtures/m9-v11/bukit-wawasan-puchong.trail-pack.json';
import m9GunungBatuPutih from '@/src/repositories/fixtures/m9-v11/gunung-batu-putih.trail-pack.json';
import m9GunungKorbu from '@/src/repositories/fixtures/m9-v11/gunung-korbu.trail-pack.json';
import m9GunungPanti from '@/src/repositories/fixtures/m9-v11/gunung-panti.trail-pack.json';
import m9GunungTahan from '@/src/repositories/fixtures/m9-v11/gunung-tahan.trail-pack.json';
import m9JalanBukitLarut from '@/src/repositories/fixtures/m9-v11/jalan-bukit-larut.trail-pack.json';
import m9JalanKledang from '@/src/repositories/fixtures/m9-v11/jalan-kledang.trail-pack.json';
import trailSummariesFixture from '@/src/repositories/fixtures/trail-summaries.fixture.json';

// The app has no backend yet, so the checked-in M9 v11 planning packs are the
// offline source used by the prototype. Gua Tempurung remains route-only
// because it is not present in the M9 v11 prediction output.
const FIXTURE_PACKS: Record<string, unknown> = {
  'gunung-batu-putih': m9GunungBatuPutih,
  'gopeng-ultra-trail-gua-tempurung': gopengUltraTrailGuaTempurung,
  'bukit-wawasan-puchong': m9BukitWawasan,
  'gunung-panti': m9GunungPanti,
  'gunung-korbu': m9GunungKorbu,
  'bukit-tabur': m9BukitTabur,
  'gunung-tahan': m9GunungTahan,
  'jalan-bukit-larut': m9JalanBukitLarut,
  'jalan-kledang': m9JalanKledang,
  'bukit-kerinchi': m9BukitKerinci,
};

export class FixtureTrailRepository implements TrailRepository {
  async listTrails(): Promise<TrailSummary[]> {
    return trailSummariesFixture.map(parseTrailSummary).filter((summary) => {
      const raw = FIXTURE_PACKS[summary.trailId];
      if (!raw) return false;

      const pack = parseTrailPack(raw);
      return pack.segments.some((segment) => segment.riskClass !== 'uncertain');
    });
  }

  async getTrailPack(trailId: string): Promise<TrailPack> {
    const raw = FIXTURE_PACKS[trailId];
    if (!raw) {
      throw new Error(`No fixture trail pack for trail_id "${trailId}"`);
    }
    return parseTrailPack(raw);
  }
}
