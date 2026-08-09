import { z } from 'zod';

/**
 * Runtime validators for the mobile-facing trail-pack contract (handoff
 * contract Section 8). These parse the wire (snake_case) JSON shape and
 * produce the domain (camelCase) types in src/domain — screens and
 * repositories should only ever see validated domain objects, never raw
 * JSON.
 */

const SUPPORTED_SCHEMA_VERSION = 'trail-pack-v1';

/** `true` in Expo/RN dev and in Jest (jest-expo defines it); `false` in a
 * production build. Guards the `fixture` stage rejection below — Section 8:
 * fixture mode "must be...impossible to enable accidentally in production." */
const isDevBuild = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

const RiskClassSchema = z.enum(['likely_covered', 'uncertain', 'predicted_gap']);

const StageSchema = z.enum(['route_only', 'fixture', 'model_backed']);

const TopFactorSchema = z
  .object({
    feature: z.string(),
    contribution: z.number(),
    direction: z.enum(['increases_risk', 'decreases_risk']),
  })
  .transform((f) => f);

const ModelStageSchema = z.enum(['Candidate', 'Champion']);

const ModelInfoSchema = z
  .object({
    model_version: z.string().nullable(),
    validation_level: z.string(),
    intended_use: z.string(),
    field_validated: z.boolean(),
    label_source: z.string(),
    label_release: z.string(),
    label_resolution_m: z.number(),
    prediction_support_m: z.number(),
    approved_for_mobile_warning: z.boolean(),
    model_stage: ModelStageSchema.optional(),
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
    approvedForMobileWarning: m.approved_for_mobile_warning,
    modelStage: m.model_stage,
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
    risk_score: z.number().min(0).max(1).nullable(),
    risk_class: RiskClassSchema,
    confidence: z.number().min(0).max(1).nullable(),
    model_version: z.string().nullable(),
    top_factors: z.array(TopFactorSchema),
    warning_eligible: z.boolean(),
    domain_similarity: z.number().min(0).max(1).optional(),
    out_of_distribution: z.boolean().optional(),
    evidence_completeness: z.number().min(0).max(1).optional(),
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
    warningEligible: s.warning_eligible,
    domainSimilarity: s.domain_similarity,
    outOfDistribution: s.out_of_distribution,
    evidenceCompleteness: s.evidence_completeness,
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
    stage: StageSchema,
    prediction_available: z.boolean(),
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

    if (pack.stage === 'fixture' && !isDevBuild) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fixture-stage packs must never be accepted in a production build',
        path: ['stage'],
      });
    }

    if (pack.stage === 'route_only') {
      if (pack.prediction_available) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'route_only packs must have prediction_available=false',
          path: ['prediction_available'],
        });
      }
      if (pack.model.modelVersion !== null || pack.model.approvedForMobileWarning) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'route_only packs must have a null model_version and approved_for_mobile_warning=false',
          path: ['model'],
        });
      }
    }

    if (
      pack.stage === 'model_backed' &&
      pack.model.approvedForMobileWarning &&
      pack.model.modelStage !== 'Champion'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only a model_stage="Champion" pack may set approved_for_mobile_warning=true',
        path: ['model', 'approved_for_mobile_warning'],
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

      if (segment.warningEligible && segment.riskClass !== 'predicted_gap') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Segment "${segment.segmentId}" cannot be warning_eligible unless risk_class is predicted_gap`,
          path: ['segments'],
        });
      }

      if (segment.warningEligible && segment.outOfDistribution) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Segment "${segment.segmentId}" cannot be warning_eligible while out_of_distribution`,
          path: ['segments'],
        });
      }

      if (
        pack.stage === 'route_only' &&
        (segment.riskScore !== null ||
          segment.confidence !== null ||
          segment.modelVersion !== null ||
          segment.riskClass !== 'uncertain' ||
          segment.topFactors.length > 0 ||
          segment.warningEligible)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `route_only segment "${segment.segmentId}" must have null risk_score/confidence/model_version, risk_class="uncertain", empty top_factors, and warning_eligible=false`,
          path: ['segments'],
        });
      }
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
    stage: pack.stage,
    predictionAvailable: pack.prediction_available,
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

const RejectedBatchEventSchema = z
  .object({
    event_id: z.string(),
    reason: z.string(),
  })
  .transform((r) => ({ eventId: r.event_id, reason: r.reason }));

export const BatchAcknowledgementSchema = z
  .object({
    server_session_id: z.string(),
    acknowledged_event_ids: z.array(z.string()),
    rejected_events: z.array(RejectedBatchEventSchema),
    server_received_at: z.string(),
  })
  .transform((a) => ({
    serverSessionId: a.server_session_id,
    acknowledgedEventIds: a.acknowledged_event_ids,
    rejectedEvents: a.rejected_events,
    serverReceivedAt: a.server_received_at,
  }));

export function parseBatchAcknowledgement(raw: unknown) {
  return BatchAcknowledgementSchema.parse(raw);
}

/**
 * Wire (snake_case) shape for the outgoing batch request — Section 12's
 * proposed batch request example.
 */
export function toBatchRequestWire(request: {
  deviceId: string;
  localSessionId: string;
  events: { eventId: string; type: string; recordedAt: string; payload: Record<string, unknown> }[];
}) {
  return {
    device_id: request.deviceId,
    local_session_id: request.localSessionId,
    events: request.events.map((e) => ({
      event_id: e.eventId,
      type: e.type,
      recorded_at: e.recordedAt,
      payload: e.payload,
    })),
  };
}

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
