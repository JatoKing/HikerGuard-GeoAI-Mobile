import { parseTrailPack, parseTrailSummary } from '@/src/api/contracts';
import type { TrailPack, TrailSummary } from '@/src/domain/trail';
import type { TrailRepository } from '@/src/repositories/trail-repository';

import gunungBatuPutih from '@/src/repositories/fixtures/gunung-batu-putih.trail-pack.json';
import gopengUltraTrailGuaTempurung from '@/src/repositories/fixtures/gopeng-ultra-trail-gua-tempurung.trail-pack.json';
import bukitWawasanPuchong from '@/src/repositories/fixtures/bukit-wawasan-puchong.trail-pack.json';
import gunungPanti from '@/src/repositories/fixtures/gunung-panti.trail-pack.json';
import gunungKorbu from '@/src/repositories/fixtures/gunung-korbu.trail-pack.json';
import bukitTabur from '@/src/repositories/fixtures/bukit-tabur.trail-pack.json';
import trailSummariesFixture from '@/src/repositories/fixtures/trail-summaries.fixture.json';

const FIXTURE_PACKS: Record<string, unknown> = {
  'gunung-batu-putih': gunungBatuPutih,
  'gopeng-ultra-trail-gua-tempurung': gopengUltraTrailGuaTempurung,
  'bukit-wawasan-puchong': bukitWawasanPuchong,
  'gunung-panti': gunungPanti,
  'gunung-korbu': gunungKorbu,
  'bukit-tabur': bukitTabur,
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
