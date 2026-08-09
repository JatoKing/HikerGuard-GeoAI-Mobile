import type { TrailSegment } from '@/src/domain/trail';
import type {
  GapGroup,
  GapWarning,
  GapWarningConfig,
  GapWarningEvaluation,
} from '@/src/domain/warnings';

export type GeoPoint = { latitude: number; longitude: number };

const METERS_PER_DEGREE_LAT = 111320;

/**
 * Local equirectangular projection to meters. Segments here are short
 * (tens to hundreds of metres), so flat-earth approximation is accurate
 * enough for a planning aid — this is not turn-by-turn navigation and must
 * not be mistaken for the GeoAI model itself (Section 11: the phone must
 * not run or reimplement it).
 */
function toLocalMeters(origin: GeoPoint, point: GeoPoint): { x: number; y: number } {
  const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos((origin.latitude * Math.PI) / 180);
  return {
    x: (point.longitude - origin.longitude) * metersPerDegreeLon,
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LAT,
  };
}

function distancePointToSegmentLine(point: GeoPoint, segment: TrailSegment): number {
  const coords = segment.geometry.coordinates;
  // Project everything relative to `point` itself, so point == {x:0, y:0}.
  const p = { x: 0, y: 0 };

  let minDistanceM = Infinity;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const a = toLocalMeters(point, { longitude: coords[i][0], latitude: coords[i][1] });
    const b = toLocalMeters(point, { longitude: coords[i + 1][0], latitude: coords[i + 1][1] });

    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
    const closestX = a.x + t * abx;
    const closestY = a.y + t * aby;
    const distanceM = Math.hypot(p.x - closestX, p.y - closestY);
    minDistanceM = Math.min(minDistanceM, distanceM);
  }
  return minDistanceM;
}

export type RouteMatch = {
  segment: TrailSegment;
  distanceM: number;
};

/** Nearest segment to `location`, regardless of tolerance. */
export function matchLocationToRoute(location: GeoPoint, segments: TrailSegment[]): RouteMatch | null {
  if (segments.length === 0) return null;

  let best: RouteMatch | null = null;
  for (const segment of segments) {
    const distanceM = distancePointToSegmentLine(location, segment);
    if (!best || distanceM < best.distanceM) {
      best = { segment, distanceM };
    }
  }
  return best;
}

/**
 * Contiguous runs of `predicted_gap` segments that are also individually
 * `warningEligible` — `uncertain` segments and non-eligible `predicted_gap`
 * segments (e.g. OOD or evidence-thin, per Section 8) never form a group, so
 * neither can ever trigger a warning by themselves (WP4 definition of done).
 */
export function groupContiguousGapSegments(segments: TrailSegment[]): GapGroup[] {
  const ordered = segments.slice().sort((a, b) => a.segmentOrder - b.segmentOrder);
  const groups: GapGroup[] = [];
  let current: TrailSegment[] = [];

  const flush = () => {
    if (current.length === 0) return;
    groups.push({
      id: current[0].segmentId,
      segmentIds: current.map((s) => s.segmentId),
      startOrder: current[0].segmentOrder,
      endOrder: current[current.length - 1].segmentOrder,
      totalLengthM: current.reduce((sum, s) => sum + s.segmentLengthM, 0),
      averageConfidence: current.reduce((sum, s) => sum + s.confidence, 0) / current.length,
    });
    current = [];
  };

  for (const segment of ordered) {
    if (segment.riskClass !== 'predicted_gap' || !segment.warningEligible) {
      flush();
      continue;
    }
    if (current.length > 0 && segment.segmentOrder !== current[current.length - 1].segmentOrder + 1) {
      flush();
    }
    current.push(segment);
  }
  flush();

  return groups;
}

function findNextGapGroupAhead(gapGroups: GapGroup[], currentOrder: number): GapGroup | null {
  const ahead = gapGroups
    .filter((g) => g.startOrder > currentOrder)
    .sort((a, b) => a.startOrder - b.startOrder);
  return ahead[0] ?? null;
}

function sumSegmentLengths(segments: TrailSegment[], fromOrderExclusive: number, toOrderExclusive: number): number {
  return segments
    .filter((s) => s.segmentOrder > fromOrderExclusive && s.segmentOrder < toOrderExclusive)
    .reduce((sum, s) => sum + s.segmentLengthM, 0);
}

function distanceToNextCoveredAfterGap(segments: TrailSegment[], gapGroup: GapGroup): number | null {
  const ordered = segments.slice().sort((a, b) => a.segmentOrder - b.segmentOrder);
  let distanceM = 0;
  for (const segment of ordered) {
    if (segment.segmentOrder <= gapGroup.endOrder) continue;
    if (segment.riskClass === 'likely_covered') {
      return distanceM;
    }
    distanceM += segment.segmentLengthM;
  }
  return null;
}

export type EvaluateGapWarningInput = {
  location: GeoPoint;
  segments: TrailSegment[];
  config: GapWarningConfig;
  /** Section 11's first gate: the downloaded pack's model must be explicitly
   * approved for mobile warnings. A Candidate/unapproved pack must never
   * warn, no matter how confident its risk_score is. */
  approvedForMobileWarning: boolean;
  /** gap_group ids already shown + acknowledged this hike session (Section
   * 11: "do not repeatedly interrupt the user for the same contiguous
   * gap"). Persist per session, not globally. */
  acknowledgedGapGroupIds: ReadonlySet<string>;
};

export function evaluateGapWarning(input: EvaluateGapWarningInput): GapWarningEvaluation {
  const { location, segments, config, approvedForMobileWarning, acknowledgedGapGroupIds } = input;

  const match = matchLocationToRoute(location, segments);
  if (!match || match.distanceM > config.offRouteToleranceM) {
    return { shouldWarn: false, isOffRoute: true };
  }

  if (!approvedForMobileWarning) {
    return { shouldWarn: false, isOffRoute: false, reason: 'not_approved' };
  }

  const gapGroups = groupContiguousGapSegments(segments);
  const nextGap = findNextGapGroupAhead(gapGroups, match.segment.segmentOrder);
  if (!nextGap) {
    return { shouldWarn: false, isOffRoute: false, reason: 'no_gap_ahead' };
  }

  // Simplification: measured from the start of the matched segment, not the
  // hiker's exact progress through it — nearest-segment matching doesn't
  // track intra-segment position. Good enough for an advance warning, not
  // for anything requiring metre-level precision.
  const remainingInCurrentSegment = match.segment.segmentOrder === nextGap.startOrder ? 0 : match.segment.segmentLengthM;
  const distanceToGapM =
    remainingInCurrentSegment + sumSegmentLengths(segments, match.segment.segmentOrder, nextGap.startOrder);

  if (distanceToGapM > config.warningDistanceM) {
    return { shouldWarn: false, isOffRoute: false, reason: 'too_far' };
  }

  if (acknowledgedGapGroupIds.has(nextGap.id)) {
    return { shouldWarn: false, isOffRoute: false, reason: 'already_acknowledged' };
  }

  const warning: GapWarning = {
    gapGroup: nextGap,
    distanceToGapM,
    distanceToNextCoveredM: distanceToNextCoveredAfterGap(segments, nextGap),
  };

  return { shouldWarn: true, isOffRoute: false, warning };
}
