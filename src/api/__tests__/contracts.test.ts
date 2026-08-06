import { parseTrailPack, parseTrailSummary, TrailPackValidationError } from '@/src/api/contracts';

import validPack from '@/src/repositories/fixtures/jalan-bukit-larut.trail-pack.json';
import trailSummaries from '@/src/repositories/fixtures/trail-summaries.fixture.json';
import badChecksumPack from '@/src/repositories/fixtures/invalid/bad-checksum.trail-pack.json';
import wrongSchemaPack from '@/src/repositories/fixtures/invalid/wrong-schema-version.trail-pack.json';
import duplicateSegmentIdPack from '@/src/repositories/fixtures/invalid/duplicate-segment-id.trail-pack.json';
import nonContiguousOrderPack from '@/src/repositories/fixtures/invalid/non-contiguous-order.trail-pack.json';
import invalidCoordinatePack from '@/src/repositories/fixtures/invalid/invalid-coordinate.trail-pack.json';

describe('parseTrailPack — valid fixture', () => {
  it('parses all three risk classes', () => {
    const pack = parseTrailPack(validPack);
    const riskClasses = pack.segments.map((s) => s.riskClass);
    expect(riskClasses).toEqual(
      expect.arrayContaining(['likely_covered', 'uncertain', 'predicted_gap'])
    );
  });

  it('maps snake_case wire fields to camelCase domain fields', () => {
    const pack = parseTrailPack(validPack);
    expect(pack.trailId).toBe('jalan-bukit-larut');
    expect(pack.model.modelVersion).toBe('connectivity-proxy-v0.1.0');
    expect(pack.segments[0].segmentId).toBe('jalan-bukit-larut-0001');
  });
});

describe('parseTrailPack — malformed fixtures are rejected', () => {
  it.each([
    ['bad checksum', badChecksumPack],
    ['unsupported schema_version', wrongSchemaPack],
    ['duplicate segment_id', duplicateSegmentIdPack],
    ['non-contiguous segment_order', nonContiguousOrderPack],
    ['invalid coordinate', invalidCoordinatePack],
  ])('%s', (_label, raw) => {
    expect(() => parseTrailPack(raw)).toThrow(TrailPackValidationError);
  });
});

describe('parseTrailSummary', () => {
  it('parses the fixture trail summary list', () => {
    const summaries = trailSummaries.map(parseTrailSummary);
    expect(summaries[0].trailId).toBe('jalan-bukit-larut');
    expect(summaries[0].predictionAvailable).toBe(true);
  });
});
