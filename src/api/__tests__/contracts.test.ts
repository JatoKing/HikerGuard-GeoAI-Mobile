import { parseTrailPack, parseTrailSummary, TrailPackValidationError } from '@/src/api/contracts';

import validPack from '@/src/repositories/fixtures/jalan-bukit-larut.trail-pack.json';
import gunungBatuPutih from '@/src/repositories/fixtures/gunung-batu-putih.trail-pack.json';
import gopengUltraTrailGuaTempurung from '@/src/repositories/fixtures/gopeng-ultra-trail-gua-tempurung.trail-pack.json';
import bukitWawasanPuchong from '@/src/repositories/fixtures/bukit-wawasan-puchong.trail-pack.json';
import gunungPanti from '@/src/repositories/fixtures/gunung-panti.trail-pack.json';
import gunungKorbu from '@/src/repositories/fixtures/gunung-korbu.trail-pack.json';
import bukitTabur from '@/src/repositories/fixtures/bukit-tabur.trail-pack.json';
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
    expect(pack.model.modelVersion).toBe('fixture-connectivity-v0');
    expect(pack.segments[0].segmentId).toBe('jalan-bukit-larut-0001');
  });

  it('is stamped as a visibly-labelled fixture pack', () => {
    const pack = parseTrailPack(validPack);
    expect(pack.stage).toBe('fixture');
  });
});

describe('parseTrailPack — route_only GPX fixtures', () => {
  it('parses real GPX-derived trails as route_only with no fabricated prediction', () => {
    const pack = parseTrailPack(bukitTabur);
    expect(pack.stage).toBe('route_only');
    expect(pack.predictionAvailable).toBe(false);
    expect(pack.model.modelVersion).toBeNull();
    for (const segment of pack.segments) {
      expect(segment.riskClass).toBe('uncertain');
      expect(segment.riskScore).toBeNull();
      expect(segment.confidence).toBeNull();
      expect(segment.modelVersion).toBeNull();
      expect(segment.warningEligible).toBe(false);
    }
  });

  it('rejects a route_only pack that fabricates a prediction on a segment', () => {
    const tampered = JSON.parse(JSON.stringify(bukitTabur));
    tampered.segments[0].risk_score = 0.9;
    expect(() => parseTrailPack(tampered)).toThrow(TrailPackValidationError);
  });
});

describe('parseTrailPack — stage/warning-eligibility invariants', () => {
  it('rejects a segment marked out_of_distribution and warning_eligible at the same time', () => {
    const tampered = JSON.parse(JSON.stringify(validPack));
    tampered.segments[2].out_of_distribution = true;
    expect(() => parseTrailPack(tampered)).toThrow(TrailPackValidationError);
  });

  it('rejects approved_for_mobile_warning=true on a model_backed pack whose model_stage is not Champion', () => {
    const tampered = JSON.parse(JSON.stringify(validPack));
    tampered.stage = 'model_backed';
    tampered.model.model_stage = 'Candidate';
    expect(() => parseTrailPack(tampered)).toThrow(TrailPackValidationError);
  });
});

describe('parseTrailPack — all trail-selection fixtures are valid', () => {
  it.each([
    ['Gunung Batu Putih', gunungBatuPutih],
    ['Gua Tempurung', gopengUltraTrailGuaTempurung],
    ['Bukit Wawasan, Puchong', bukitWawasanPuchong],
    ['Gunung Panti', gunungPanti],
    ['Gunung Korbu', gunungKorbu],
    ['Bukit Tabur', bukitTabur],
  ])('%s parses without throwing', (_label, raw) => {
    expect(() => parseTrailPack(raw)).not.toThrow();
  });

  it('every summary fixture has a matching downloadable pack', () => {
    const packsByTrailId: Record<string, unknown> = {
      'jalan-bukit-larut': validPack,
      'gunung-batu-putih': gunungBatuPutih,
      'gopeng-ultra-trail-gua-tempurung': gopengUltraTrailGuaTempurung,
      'bukit-wawasan-puchong': bukitWawasanPuchong,
      'gunung-panti': gunungPanti,
      'gunung-korbu': gunungKorbu,
      'bukit-tabur': bukitTabur,
    };
    const summaries = trailSummaries.map(parseTrailSummary);
    for (const summary of summaries) {
      expect(packsByTrailId[summary.trailId]).toBeDefined();
    }
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
    expect(summaries[0].trailId).toBe('gunung-batu-putih');
    expect(typeof summaries[0].predictionAvailable).toBe('boolean');
  });
});
