import {
  evaluateGapWarning,
  groupContiguousGapSegments,
  matchLocationToRoute,
} from '@/src/warnings/gap-warning-engine';
import { DEFAULT_GAP_WARNING_CONFIG } from '@/src/domain/warnings';
import type { TrailSegment } from '@/src/domain/trail';
import type { RiskClass } from '@/src/domain/connectivity';

const BASE_LAT = 4.0;
const LON_STEP = 0.001; // ~111m at this latitude — kept close to lengthM below

function makeSegment(
  order: number,
  riskClass: RiskClass,
  lengthM = 100,
  warningEligible = riskClass === 'predicted_gap'
): TrailSegment {
  const startLon = 100 + order * LON_STEP;
  return {
    segmentId: `seg-${order}`,
    segmentOrder: order,
    segmentLengthM: lengthM,
    geometry: {
      type: 'LineString',
      coordinates: [
        [startLon, BASE_LAT],
        [startLon + LON_STEP, BASE_LAT],
      ],
    },
    riskScore: riskClass === 'predicted_gap' ? 0.8 : riskClass === 'uncertain' ? 0.5 : 0.1,
    riskClass,
    confidence: 0.7,
    modelVersion: 'test-v0',
    topFactors: [],
    warningEligible,
  };
}

// Midpoint of the segment, not its start/end vertex — consecutive segments
// here share a coincident boundary point, which would otherwise make the
// nearest-segment match ambiguous (a tie between the two segments meeting
// at that point).
function locationInSegment(order: number) {
  return { latitude: BASE_LAT, longitude: 100 + order * LON_STEP + LON_STEP / 2 };
}

describe('groupContiguousGapSegments', () => {
  it('groups only contiguous predicted_gap segments, never uncertain', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'uncertain'),
      makeSegment(3, 'predicted_gap'),
      makeSegment(4, 'predicted_gap'),
      makeSegment(5, 'likely_covered'),
      makeSegment(6, 'predicted_gap'),
    ];

    const groups = groupContiguousGapSegments(segments);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ startOrder: 3, endOrder: 4, totalLengthM: 200 });
    expect(groups[1]).toMatchObject({ startOrder: 6, endOrder: 6, totalLengthM: 100 });
  });

  it('excludes a predicted_gap segment that is not warning_eligible', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'predicted_gap', 100, false),
      makeSegment(3, 'predicted_gap', 100, true),
    ];

    const groups = groupContiguousGapSegments(segments);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ startOrder: 3, endOrder: 3 });
  });

  it('returns no groups when only uncertain/likely_covered segments exist', () => {
    const segments = [makeSegment(1, 'likely_covered'), makeSegment(2, 'uncertain')];
    expect(groupContiguousGapSegments(segments)).toEqual([]);
  });
});

describe('matchLocationToRoute', () => {
  it('matches a point to its nearest segment', () => {
    const segments = [makeSegment(1, 'likely_covered'), makeSegment(2, 'predicted_gap')];
    const match = matchLocationToRoute(locationInSegment(2), segments);
    expect(match?.segment.segmentId).toBe('seg-2');
    expect(match?.distanceM).toBeLessThan(1);
  });

  it('tolerates small GPS jitter without losing the match', () => {
    const segments = [makeSegment(1, 'likely_covered')];
    const jittered = { latitude: BASE_LAT + 0.00002, longitude: 100 + LON_STEP + 0.00002 };
    const match = matchLocationToRoute(jittered, segments);
    expect(match?.segment.segmentId).toBe('seg-1');
    expect(match?.distanceM).toBeLessThan(10);
  });
});

describe('evaluateGapWarning', () => {
  const config = { warningDistanceM: 600, offRouteToleranceM: 50 };

  it('warns at the start of the route when a gap is within warning distance', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'uncertain'),
      makeSegment(3, 'predicted_gap'),
      makeSegment(4, 'predicted_gap'),
    ];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result.shouldWarn).toBe(true);
    if (result.shouldWarn) {
      expect(result.warning.gapGroup.id).toBe('seg-3');
      expect(result.warning.gapGroup.totalLengthM).toBe(200);
      // remaining segment 1 (100) + segment 2 (100) = 200m to reach segment 3
      expect(result.warning.distanceToGapM).toBe(200);
    }
  });

  it('does not warn when the pack is not approved for mobile warning, even with an eligible gap ahead', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'predicted_gap'),
    ];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: false,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result).toMatchObject({ shouldWarn: false, isOffRoute: false, reason: 'not_approved' });
  });

  it('does not warn from a predicted_gap segment that is not itself warning_eligible', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'predicted_gap', 100, false),
    ];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result).toMatchObject({ shouldWarn: false, isOffRoute: false, reason: 'no_gap_ahead' });
  });

  it('does not warn at the end of the route with no gap ahead', () => {
    const segments = [makeSegment(1, 'predicted_gap'), makeSegment(2, 'likely_covered')];

    const result = evaluateGapWarning({
      location: locationInSegment(2),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result).toMatchObject({ shouldWarn: false, isOffRoute: false, reason: 'no_gap_ahead' });
  });

  it('never warns from an uncertain segment alone', () => {
    const segments = [makeSegment(1, 'likely_covered'), makeSegment(2, 'uncertain'), makeSegment(3, 'likely_covered')];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result).toMatchObject({ shouldWarn: false, reason: 'no_gap_ahead' });
  });

  it('warns for the nearer of two adjacent-but-separate gaps, not both', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'predicted_gap'),
      makeSegment(3, 'likely_covered'),
      makeSegment(4, 'predicted_gap'),
    ];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result.shouldWarn).toBe(true);
    if (result.shouldWarn) {
      expect(result.warning.gapGroup.id).toBe('seg-2');
    }
  });

  it('does not warn when the gap is farther than warning_distance_m', () => {
    const segments = [
      makeSegment(1, 'likely_covered', 700),
      makeSegment(2, 'predicted_gap', 100),
    ];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result).toMatchObject({ shouldWarn: false, reason: 'too_far' });
  });

  it('does not repeat a warning already acknowledged this session', () => {
    const segments = [makeSegment(1, 'likely_covered'), makeSegment(2, 'predicted_gap')];

    const first = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });
    expect(first.shouldWarn).toBe(true);

    const second = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(first.shouldWarn ? [first.warning.gapGroup.id] : []),
    });

    expect(second).toMatchObject({ shouldWarn: false, reason: 'already_acknowledged' });
  });

  it('flags an off-route location instead of matching a distant segment', () => {
    const segments = [makeSegment(1, 'likely_covered'), makeSegment(2, 'predicted_gap')];

    const result = evaluateGapWarning({
      location: { latitude: BASE_LAT + 5, longitude: 100 + 5 },
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result).toMatchObject({ shouldWarn: false, isOffRoute: true });
  });

  it('reports distance to the next likely_covered segment after the gap', () => {
    const segments = [
      makeSegment(1, 'likely_covered'),
      makeSegment(2, 'predicted_gap', 100),
      makeSegment(3, 'predicted_gap', 100),
      makeSegment(4, 'likely_covered'),
    ];

    const result = evaluateGapWarning({
      location: locationInSegment(1),
      segments,
      config,
      approvedForMobileWarning: true,
      acknowledgedGapGroupIds: new Set(),
    });

    expect(result.shouldWarn).toBe(true);
    if (result.shouldWarn) {
      expect(result.warning.distanceToNextCoveredM).toBe(0);
    }
  });
});

describe('DEFAULT_GAP_WARNING_CONFIG', () => {
  it('uses 600m as the fixture/configuration default (Section 11)', () => {
    expect(DEFAULT_GAP_WARNING_CONFIG.warningDistanceM).toBe(600);
  });
});
