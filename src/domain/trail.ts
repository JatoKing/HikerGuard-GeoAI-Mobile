import type { ModelInfo, RiskClass, TopFactor } from './connectivity';

export type GeoLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type TrailSummary = {
  trailId: string;
  name: string;
  distanceM: number;
  packVersion: string;
  predictionAvailable: boolean;
};

export type TrailSegment = {
  segmentId: string;
  segmentOrder: number;
  segmentLengthM: number;
  geometry: GeoLineString;
  /** null for `route_only` segments — GPX geometry import has no prediction. */
  riskScore: number | null;
  riskClass: RiskClass;
  /** null for `route_only` segments. */
  confidence: number | null;
  /** null for `route_only` segments. */
  modelVersion: string | null;
  topFactors: TopFactor[];
  /** Section 11's second gate: even on an approved pack, an individual
   * segment must be explicitly marked eligible before it can trigger a gap
   * warning — e.g. an OOD or evidence-thin predicted_gap should not warn. */
  warningEligible: boolean;
  /** `model_backed` segments only — how similar this segment's inputs are to
   * the model's training distribution. */
  domainSimilarity?: number;
  /** `model_backed` segments only — Section 8: an OOD segment can never be
   * warning_eligible regardless of its risk_class. */
  outOfDistribution?: boolean;
  /** `model_backed` segments only — fraction of expected evidence actually
   * available for this segment. */
  evidenceCompleteness?: number;
};

export type TrailPackIntegrity = {
  algorithm: string;
  checksum: string;
};

/** Section 8's three mobile-facing data modes. `route_only` is recorded GPX
 * geometry with no JEJAK prediction; `fixture` is a visibly-synthetic pack
 * for deterministic UI/warning-engine demos, never valid in production;
 * `model_backed` carries an actual JEJAK prediction. */
export type TrailPackStage = 'route_only' | 'fixture' | 'model_backed';

export type TrailPack = {
  schemaVersion: string;
  trailId: string;
  name: string;
  packVersion: string;
  generatedAt: string;
  stage: TrailPackStage;
  predictionAvailable: boolean;
  model: ModelInfo;
  segments: TrailSegment[];
  integrity: TrailPackIntegrity;
};

export type RoutePackStatus = 'downloading' | 'ready' | 'failed' | 'stale';

/**
 * Storage metadata for a downloaded pack — Section 9's route_pack table.
 * The pack content itself (model + segments) is stored as one JSON blob
 * rather than a separate file, so there's no filePath field — that's the
 * "or normalised segment reference" half of Section 9's "file_path or
 * normalised segment reference" wording.
 */
export type RoutePackRecord = {
  trailId: string;
  packVersion: string;
  schemaVersion: string;
  modelVersion: string | null;
  downloadedAt: string;
  checksum: string;
  status: RoutePackStatus;
};
