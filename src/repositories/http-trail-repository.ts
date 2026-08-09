import { parseTrailPack, parseTrailSummary } from '@/src/api/contracts';
import type { TrailPack, TrailSummary } from '@/src/domain/trail';
import type { TrailRepository } from '@/src/repositories/trail-repository';

/**
 * The mobile-facing backend implementation of TrailRepository (Section 8:
 * "An HTTP implementation enabled once the application backend contract is
 * available"). No such backend exists yet at time of writing — Section 18:
 * the JEJAK API only exposes GET /health — so this is untested against a
 * real server; `parseTrailPack`/`parseTrailSummary` are what actually
 * enforce the wire contract once one does.
 */
export class HttpTrailRepository implements TrailRepository {
  constructor(private readonly baseUrl: string) {}

  async listTrails(): Promise<TrailSummary[]> {
    const response = await fetch(`${this.baseUrl}/trails`);
    if (!response.ok) {
      throw new Error(`Failed to list trails: HTTP ${response.status}`);
    }
    const raw = await response.json();
    return (raw as unknown[]).map(parseTrailSummary);
  }

  async getTrailPack(trailId: string): Promise<TrailPack> {
    const response = await fetch(`${this.baseUrl}/trails/${encodeURIComponent(trailId)}/pack`);
    if (!response.ok) {
      throw new Error(`Failed to download trail pack "${trailId}": HTTP ${response.status}`);
    }
    return parseTrailPack(await response.json());
  }
}
