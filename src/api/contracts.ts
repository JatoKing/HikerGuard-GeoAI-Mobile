import { z } from 'zod';

/**
 * Runtime validators for the mobile-facing trail-pack contract (handoff
 * contract Section 8). These parse the wire (snake_case) JSON shape and
 * produce the domain (camelCase) types in src/domain — screens and
 * repositories should only ever see validated domain objects, never raw
 * JSON.
 */

const SUPPORTED_SCHEMA_VERSION = 'trail-pack-v1';

const RiskClassSchema = z.enum(['likely_covered', 'uncertain', 'predicted_gap']);

const TopFactorSchema = z
  .object({
    feature: z.string(),
    contribution: z.number(),
    direction: z.enum(['increases_risk', 'decreases_risk']),
  })
  .transform((f) => f);

const ModelInfoSchema = z
  .object({
    model_version: z.string(),
    validation_level: z.string(),
    intended_use: z.string(),
    field_validated: z.boolean(),
    label_source: z.string(),
    label_release: z.string(),
    label_resolution_m: z.number(),
    prediction_support_m: z.number(),
  })
  .transform((m) => ({
    modelVersion: m.model_version,
    validationLevel: m.validation_level,
    intendedUse: m.intended_use,
    fieldValidated: m.field_validated,
    labelSource: m.label_source,
    labelRelease: m.label_release,
    labelResolutionM: m.label_resolution_m,
    predictionSupportM: m.prediction_support_m,
  }));

const LongitudeLatitudeSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const GeoLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(LongitudeLatitudeSchema).min(2),
});

const TrailSegmentSchema = z
  .object({
    segment_id: z.string(),
    segment_order: z.number().int().positive(),
    segment_length_m: z.number().nonnegative(),
    geometry: GeoLineStringSchema,
    risk_score: z.number().min(0).max(1),
    risk_class: RiskClassSchema,
    confidence: z.number().min(0).max(1),
    model_version: z.string(),
    top_factors: z.array(TopFactorSchema),
  })
  .transform((s) => ({
    segmentId: s.segment_id,
    segmentOrder: s.segment_order,
    segmentLengthM: s.segment_length_m,
    geometry: s.geometry,
    riskScore: s.risk_score,
    riskClass: s.risk_class,
    confidence: s.confidence,
    modelVersion: s.model_version,
    topFactors: s.top_factors,
  }));

const TrailPackIntegritySchema = z
  .object({
    algorithm: z.string(),
    checksum: z.string().min(1),
  })
  .transform((i) => i);

export const TrailPackSchema = z
  .object({
    schema_version: z.string(),
    trail_id: z.string(),
    name: z.string(),
    pack_version: z.string(),
    generated_at: z.string(),
    model: ModelInfoSchema,
    segments: z.array(TrailSegmentSchema).min(1),
    integrity: TrailPackIntegritySchema,
  })
  .superRefine((pack, ctx) => {
    if (pack.schema_version !== SUPPORTED_SCHEMA_VERSION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported schema_version "${pack.schema_version}"`,
        path: ['schema_version'],
      });
    }

    const seenSegmentIds = new Set<string>();
    for (const segment of pack.segments) {
      if (seenSegmentIds.has(segment.segmentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate segment_id "${segment.segmentId}"`,
          path: ['segments'],
        });
      }
      seenSegmentIds.add(segment.segmentId);
    }

    const orders = pack.segments.map((s) => s.segmentOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i += 1) {
      if (orders[i] !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'segment_order values must be contiguous starting at 1',
          path: ['segments'],
        });
        break;
      }
    }
  })
  .transform((pack) => ({
    schemaVersion: pack.schema_version,
    trailId: pack.trail_id,
    name: pack.name,
    packVersion: pack.pack_version,
    generatedAt: pack.generated_at,
    model: pack.model,
    segments: pack.segments,
    integrity: pack.integrity,
  }));

export const TrailSummarySchema = z
  .object({
    trail_id: z.string(),
    name: z.string(),
    distance_m: z.number().nonnegative(),
    pack_version: z.string(),
    prediction_available: z.boolean(),
  })
  .transform((s) => ({
    trailId: s.trail_id,
    name: s.name,
    distanceM: s.distance_m,
    packVersion: s.pack_version,
    predictionAvailable: s.prediction_available,
  }));

export const BatchAcknowledgementSchema = z
  .object({
    server_session_id: z.string(),
    acknowledged_event_ids: z.array(z.string()),
    rejected_events: z.array(z.unknown()),
    server_received_at: z.string(),
  })
  .transform((a) => ({
    serverSessionId: a.server_session_id,
    acknowledgedEventIds: a.acknowledged_event_ids,
    rejectedEvents: a.rejected_events,
    serverReceivedAt: a.server_received_at,
  }));

export class TrailPackValidationError extends Error {
  constructor(issues: z.ZodIssue[]) {
    super(issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '));
    this.name = 'TrailPackValidationError';
  }
}

export function parseTrailPack(raw: unknown) {
  const result = TrailPackSchema.safeParse(raw);
  if (!result.success) {
    throw new TrailPackValidationError(result.error.issues);
  }
  return result.data;
}

export function parseTrailSummary(raw: unknown) {
  return TrailSummarySchema.parse(raw);
}
