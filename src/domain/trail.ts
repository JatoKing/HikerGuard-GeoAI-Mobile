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
  riskScore: number;
  riskClass: RiskClass;
  confidence: number;
  modelVersion: string;
  topFactors: TopFactor[];
};

export type TrailPackIntegrity = {
  algorithm: string;
  checksum: string;
};

export type TrailPack = {
  schemaVersion: string;
  trailId: string;
  name: string;
  packVersion: string;
  generatedAt: string;
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
  modelVersion: string;
  downloadedAt: string;
  checksum: string;
  status: RoutePackStatus;
};
