#!/usr/bin/env node

/**
 * Regenerates a trail-pack-v1 fixture from a real GPX track file.
 *
 * Mirrors the parsing logic in src/lib/gpx.ts (parseGpxTrackPoints,
 * haversineDistanceMeters, gpxPointsToSegments) in plain Node so it can run
 * without a TypeScript toolchain — if you change the chunking/labelling
 * logic in src/lib/gpx.ts, update this script to match.
 *
 * Usage:
 *   node scripts/generate-trail-pack-from-gpx.js <gpx-file> <trail-id> "<Trail Name>"
 *
 * Example:
 *   node scripts/generate-trail-pack-from-gpx.js \
 *     assets/gpx/gunung-batu-putih.gpx gunung-batu-putih "Gunung Batu Putih"
 *
 * Writes src/repositories/fixtures/<trail-id>.trail-pack.json and prints the
 * real total distance so you can update trail-summaries.fixture.json by hand.
 */

const fs = require('fs');
const path = require('path');

const [, , gpxPath, trailId, trailName] = process.argv;

if (!gpxPath || !trailId || !trailName) {
  console.error('Usage: node scripts/generate-trail-pack-from-gpx.js <gpx-file> <trail-id> "<Trail Name>"');
  process.exit(1);
}

const TARGET_SEGMENT_LENGTH_M = 250;

function parseGpxTrackPoints(gpxXml) {
  const points = [];
  const trkptRegex = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
  let match;
  while ((match = trkptRegex.exec(gpxXml)) !== null) {
    const attrs = match[1];
    const body = match[2] || '';
    const latMatch = /lat="(-?[0-9.]+)"/.exec(attrs);
    const lonMatch = /lon="(-?[0-9.]+)"/.exec(attrs);
    if (!latMatch || !lonMatch) continue;
    const eleMatch = /<ele>(-?[0-9.]+)<\/ele>/.exec(body);
    points.push({
      latitude: parseFloat(latMatch[1]),
      longitude: parseFloat(lonMatch[1]),
      elevation: eleMatch ? parseFloat(eleMatch[1]) : null,
    });
  }
  return points;
}

function haversineDistanceMeters(a, b) {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function gpxPointsToSegments(id, points, targetSegmentLengthM) {
  if (points.length < 2) return { segments: [], totalDistanceM: 0 };

  const segments = [];
  let segmentStartIndex = 0;
  let accumulatedM = 0;
  let totalDistanceM = 0;
  let order = 1;

  for (let i = 1; i < points.length; i += 1) {
    const d = haversineDistanceMeters(points[i - 1], points[i]);
    accumulatedM += d;
    totalDistanceM += d;

    const isLastPoint = i === points.length - 1;
    if (accumulatedM >= targetSegmentLengthM || isLastPoint) {
      const segmentPoints = points.slice(segmentStartIndex, i + 1);
      segments.push({
        segment_id: `${id}-${String(order).padStart(4, '0')}`,
        segment_order: order,
        segment_length_m: Math.round(accumulatedM * 10) / 10,
        geometry: {
          type: 'LineString',
          coordinates: segmentPoints.map((p) => [
            Math.round(p.longitude * 1e6) / 1e6,
            Math.round(p.latitude * 1e6) / 1e6,
          ]),
        },
        risk_score: null,
        risk_class: 'uncertain',
        confidence: null,
        model_version: null,
        top_factors: [],
        warning_eligible: false,
      });
      order += 1;
      segmentStartIndex = i;
      accumulatedM = 0;
    }
  }

  return { segments, totalDistanceM };
}

const gpxXml = fs.readFileSync(gpxPath, 'utf8');
const points = parseGpxTrackPoints(gpxXml);
const { segments, totalDistanceM } = gpxPointsToSegments(trailId, points, TARGET_SEGMENT_LENGTH_M);

const pack = {
  schema_version: 'trail-pack-v1',
  trail_id: trailId,
  name: trailName,
  pack_version: new Date().toISOString().slice(0, 10) + 'T00:00:00Z',
  generated_at: new Date().toISOString().slice(0, 10) + 'T00:00:00Z',
  stage: 'route_only',
  prediction_available: false,
  model: {
    model_version: null,
    validation_level: 'route_geometry_only',
    intended_use: 'navigation_development',
    field_validated: false,
    label_source: 'AllTrails GPX export',
    label_release: String(new Date().getFullYear()),
    label_resolution_m: 0,
    prediction_support_m: 0,
    approved_for_mobile_warning: false,
  },
  segments,
  integrity: {
    algorithm: 'sha256',
    checksum: 'replace-with-server-generated-checksum',
  },
};

const outPath = path.join(__dirname, '..', 'src', 'repositories', 'fixtures', `${trailId}.trail-pack.json`);
fs.writeFileSync(outPath, JSON.stringify(pack, null, 2) + '\n');

console.log(`Parsed ${points.length} GPX points -> ${segments.length} segments`);
console.log(`Total real distance: ${Math.round(totalDistanceM)}m`);
console.log(`Wrote ${outPath}`);
console.log(
  `Remember to update this trail's distance_m (${Math.round(totalDistanceM)}) and pack_version in trail-summaries.fixture.json.`
);
