import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TRAILS = {
  trail_gunung_tahan_summit_camp: {
    trailId: 'gunung-tahan',
    name: 'Gunung Tahan',
  },
  trail_jalan_bukit_larut: {
    trailId: 'jalan-bukit-larut',
    name: 'Jalan Bukit Larut',
  },
  trail_gunung_korbu: {
    trailId: 'gunung-korbu',
    name: 'Gunung Korbu',
  },
  trail_gunung_batu_putih: {
    trailId: 'gunung-batu-putih',
    name: 'Gunung Batu Putih',
  },
  trail_gunung_panti: {
    trailId: 'gunung-panti',
    name: 'Gunung Panti',
  },
  trail_jalan_kledang: {
    trailId: 'jalan-kledang',
    name: 'Jalan Kledang',
  },
  trail_lingkaran_luar_bukit_wawasan: {
    trailId: 'bukit-wawasan-puchong',
    name: 'Bukit Wawasan, Puchong',
  },
  trail_taman_rimba_bukit_kerinchi_loop: {
    trailId: 'bukit-kerinchi',
    name: 'Taman Rimba Bukit Kerinchi',
  },
  trail_bukit_tabur_extreme_tiara_kemensah: {
    trailId: 'bukit-tabur',
    name: 'Bukit Tabur',
  },
};

function usage() {
  console.error(
    'Usage: node scripts/import-m9-v11-packs.mjs <M9-v11.geojson> <M9-v11-manifest.json>'
  );
  process.exit(2);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function checksum(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function factorDirection(direction) {
  if (direction === 'increases_risk') return direction;
  if (direction === 'reduces_risk' || direction === 'decreases_risk') {
    return 'decreases_risk';
  }
  throw new Error(`Unsupported top-factor direction: ${direction}`);
}

function toSegment(feature, modelVersion) {
  const p = feature.properties;
  if (feature.geometry?.type !== 'LineString') {
    throw new Error(`Segment ${p.segment_id} is not a LineString`);
  }
  return {
    segment_id: p.segment_id,
    segment_order: p.segment_order + 1,
    segment_length_m: p.segment_length_m,
    geometry: feature.geometry,
    risk_score: p.risk_score,
    risk_class: p.risk_class,
    confidence: p.confidence,
    model_version: modelVersion,
    top_factors: p.top_factors.map((factor) => ({
      feature: factor.feature,
      contribution: factor.contribution,
      direction: factorDirection(factor.direction),
    })),
    warning_eligible: false,
    domain_similarity: p.domain_similarity,
    out_of_distribution: p.out_of_distribution,
    evidence_completeness: p.evidence_completeness,
  };
}

function createPack(meta, features, manifest) {
  const first = features[0].properties;
  const modelVersion = manifest.model_version;
  const generatedAt = new Date(manifest.created_at).toISOString();
  const segments = features
    .sort((a, b) => a.properties.segment_order - b.properties.segment_order)
    .map((feature) => toSegment(feature, modelVersion));

  const withoutIntegrity = {
    schema_version: 'trail-pack-v1',
    trail_id: meta.trailId,
    name: meta.name,
    pack_version: generatedAt,
    generated_at: generatedAt,
    stage: 'model_backed',
    prediction_available: true,
    model: {
      model_version: modelVersion,
      validation_level: 'cross_country_spatial_validation_planning_only',
      intended_use: first.intended_use,
      field_validated: false,
      label_source: first.training_label_sources.join(' + '),
      label_release: 'Anatel 2026-07 + FCC BDC 2025-06',
      label_resolution_m: 1000,
      prediction_support_m: first.prediction_support_m,
      approved_for_mobile_warning: false,
      model_stage: 'Candidate',
    },
    segments,
  };

  return {
    ...withoutIntegrity,
    integrity: {
      algorithm: 'sha256-canonical-json-without-integrity',
      checksum: checksum(withoutIntegrity),
    },
  };
}

async function main() {
  const [, , geojsonArg, manifestArg] = process.argv;
  if (!geojsonArg || !manifestArg) usage();

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..');
  const outputDir = path.join(repoRoot, 'src', 'repositories', 'fixtures', 'm9-v11');
  const summaryPath = path.join(
    repoRoot,
    'src',
    'repositories',
    'fixtures',
    'trail-summaries.fixture.json'
  );
  const geojson = JSON.parse(await readFile(path.resolve(geojsonArg), 'utf8'));
  const manifest = JSON.parse(await readFile(path.resolve(manifestArg), 'utf8'));

  if (manifest.schema_version !== 'connectivity-trail-prediction-pack-v11') {
    throw new Error(`Unexpected manifest schema: ${manifest.schema_version}`);
  }
  if (geojson.features.length !== manifest.row_counts.trail_segments) {
    throw new Error('GeoJSON feature count does not match the M9 v11 manifest');
  }

  const byTrail = new Map();
  for (const feature of geojson.features) {
    const sourceTrailId = feature.properties.trail_id;
    if (!TRAILS[sourceTrailId]) throw new Error(`Unmapped M9 v11 trail: ${sourceTrailId}`);
    const features = byTrail.get(sourceTrailId) ?? [];
    features.push(feature);
    byTrail.set(sourceTrailId, features);
  }
  if (byTrail.size !== Object.keys(TRAILS).length) {
    throw new Error(`Expected ${Object.keys(TRAILS).length} trails, received ${byTrail.size}`);
  }

  await mkdir(outputDir, { recursive: true });
  const generatedSummaries = [];
  for (const [sourceTrailId, meta] of Object.entries(TRAILS)) {
    const pack = createPack(meta, byTrail.get(sourceTrailId), manifest);
    const filePath = path.join(outputDir, `${meta.trailId}.trail-pack.json`);
    await writeFile(filePath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    generatedSummaries.push({
      trail_id: meta.trailId,
      name: meta.name,
      distance_m: Number(
        pack.segments.reduce((total, segment) => total + segment.segment_length_m, 0).toFixed(3)
      ),
      pack_version: pack.pack_version,
      prediction_available: true,
    });
  }

  const existing = JSON.parse(await readFile(summaryPath, 'utf8'));
  const generatedIds = new Set(generatedSummaries.map((item) => item.trail_id));
  const routeOnly = existing.filter((item) => !generatedIds.has(item.trail_id));
  const summaries = [...generatedSummaries, ...routeOnly].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  await writeFile(summaryPath, `${JSON.stringify(summaries, null, 2)}\n`, 'utf8');

  console.log(
    `Generated ${generatedSummaries.length} M9 v11 mobile packs (${geojson.features.length} segments)`
  );
}

await main();
