import type { RiskClass } from '@/src/domain/connectivity';
import type { TrailSegment } from '@/src/domain/trail';

export type GpxPoint = {
  latitude: number;
  longitude: number;
  elevation: number | null;
};

function extractAttr(attrs: string, name: string): number | null {
  const match = new RegExp(`${name}="(-?[0-9.]+)"`).exec(attrs);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extracts track points from a GPX file's <trkpt> elements. A small
 * regex-based reader rather than a full XML parser dependency — GPX's
 * trkpt shape is simple and regular enough that this covers real exports
 * from Wikiloc/AllTrails/Strava without adding an XML library.
 */
export function parseGpxTrackPoints(gpxXml: string): GpxPoint[] {
  const points: GpxPoint[] = [];
  const trkptRegex = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(gpxXml)) !== null) {
    const attrs = match[1];
    const body = match[2] ?? '';
    const latitude = extractAttr(attrs, 'lat');
    const longitude = extractAttr(attrs, 'lon');
    if (latitude === null || longitude === null) continue;

    const eleMatch = /<ele>(-?[0-9.]+)<\/ele>/.exec(body);
    points.push({
      latitude,
      longitude,
      elevation: eleMatch ? parseFloat(eleMatch[1]) : null,
    });
  }

  return points;
}

export function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Chunks a real GPX track into ~targetSegmentLengthM segments, matching the
 * pack shape trail-detail/gap-warning already expect.
 *
 * GPX only carries geometry — it has no GeoAI prediction for these exact
 * segments, so every segment is `route_only` (Section 8): 'uncertain' with
 * null risk_score/confidence/model_version. Marking real trail geometry as
 * 'likely_covered' or 'predicted_gap' without an actual model behind it
 * would be exactly the kind of unearned confidence Section 3 rules out.
 */
export function gpxPointsToSegments(
  trailId: string,
  points: GpxPoint[],
  targetSegmentLengthM = 250
): TrailSegment[] {
  if (points.length < 2) return [];

  const segments: TrailSegment[] = [];
  let segmentStartIndex = 0;
  let accumulatedM = 0;
  let order = 1;

  const placeholderRisk: RiskClass = 'uncertain';

  for (let i = 1; i < points.length; i += 1) {
    accumulatedM += haversineDistanceMeters(points[i - 1], points[i]);

    const isLastPoint = i === points.length - 1;
    if (accumulatedM >= targetSegmentLengthM || isLastPoint) {
      const segmentPoints = points.slice(segmentStartIndex, i + 1);
      segments.push({
        segmentId: `${trailId}-${String(order).padStart(4, '0')}`,
        segmentOrder: order,
        segmentLengthM: Math.round(accumulatedM),
        geometry: {
          type: 'LineString',
          coordinates: segmentPoints.map((p) => [p.longitude, p.latitude]),
        },
        riskScore: null,
        riskClass: placeholderRisk,
        confidence: null,
        modelVersion: null,
        topFactors: [],
        warningEligible: false,
      });
      order += 1;
      segmentStartIndex = i;
      accumulatedM = 0;
    }
  }

  return segments;
}
