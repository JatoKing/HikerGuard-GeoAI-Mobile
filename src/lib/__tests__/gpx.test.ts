import { parseGpxTrackPoints, haversineDistanceMeters, gpxPointsToSegments } from '@/src/lib/gpx';

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Sample Trail</name>
    <trkseg>
      <trkpt lat="4.417183" lon="101.187467">
        <ele>250.0</ele>
      </trkpt>
      <trkpt lat="4.418000" lon="101.188200">
        <ele>255.2</ele>
      </trkpt>
      <trkpt lat="4.419500" lon="101.189800">
        <ele>262.1</ele>
      </trkpt>
      <trkpt lat="4.421000" lon="101.191500">
        <ele>270.0</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('parseGpxTrackPoints', () => {
  it('extracts every trkpt with lat, lon, and elevation', () => {
    const points = parseGpxTrackPoints(SAMPLE_GPX);
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ latitude: 4.417183, longitude: 101.187467, elevation: 250.0 });
    expect(points[3].elevation).toBe(270.0);
  });

  it('returns an empty array for GPX with no track points', () => {
    expect(parseGpxTrackPoints('<gpx><trk><trkseg></trkseg></trk></gpx>')).toEqual([]);
  });

  it('handles self-closing trkpt tags without an elevation child', () => {
    const points = parseGpxTrackPoints('<trkpt lat="1.5" lon="103.5"/>');
    expect(points).toEqual([{ latitude: 1.5, longitude: 103.5, elevation: null }]);
  });
});

describe('haversineDistanceMeters', () => {
  it('returns ~0 for identical points', () => {
    const point = { latitude: 4.4, longitude: 101.2 };
    expect(haversineDistanceMeters(point, point)).toBeLessThan(0.01);
  });

  it('returns a plausible distance for two nearby points', () => {
    // ~0.001 degrees apart at this latitude is roughly 100-150m
    const a = { latitude: 4.4, longitude: 101.2 };
    const b = { latitude: 4.401, longitude: 101.2 };
    const distance = haversineDistanceMeters(a, b);
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(200);
  });
});

describe('gpxPointsToSegments', () => {
  it('returns no segments for fewer than 2 points', () => {
    expect(gpxPointsToSegments('trail', [{ latitude: 1, longitude: 1, elevation: null }])).toEqual([]);
  });

  it('chunks a real track into ordered, contiguous segments', () => {
    const points = parseGpxTrackPoints(SAMPLE_GPX);
    const segments = gpxPointsToSegments('sample-trail', points, 100);

    expect(segments.length).toBeGreaterThan(0);
    segments.forEach((segment, index) => {
      expect(segment.segmentOrder).toBe(index + 1);
      expect(segment.segmentId).toBe(`sample-trail-${String(index + 1).padStart(4, '0')}`);
      expect(segment.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('marks every imported segment as route_only — no fabricated prediction', () => {
    const points = parseGpxTrackPoints(SAMPLE_GPX);
    const segments = gpxPointsToSegments('sample-trail', points, 100);
    for (const segment of segments) {
      expect(segment.riskClass).toBe('uncertain');
      expect(segment.riskScore).toBeNull();
      expect(segment.confidence).toBeNull();
      expect(segment.modelVersion).toBeNull();
      expect(segment.warningEligible).toBe(false);
    }
  });
});
