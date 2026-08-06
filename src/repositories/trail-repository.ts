import type { TrailPack, TrailSummary } from '@/src/domain/trail';

export interface TrailRepository {
  listTrails(): Promise<TrailSummary[]>;
  getTrailPack(trailId: string): Promise<TrailPack>;
}
