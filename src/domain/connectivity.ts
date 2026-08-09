/**
 * The mobile app must render exactly these three classes and must never
 * infer `predicted_gap` on its own — see mobile handoff contract Section 3.
 */
export type RiskClass = 'likely_covered' | 'uncertain' | 'predicted_gap';

export type FactorDirection = 'increases_risk' | 'decreases_risk';

export type TopFactor = {
  feature: string;
  contribution: number;
  direction: FactorDirection;
};

/** JEJAK's own registry promotion stage (Section 4/18) — distinct from the
 * mobile pack's `route_only`/`fixture`/`model_backed` data-mode stage on
 * TrailPack. Only a `Champion` may ever be approved for mobile warning. */
export type ModelStage = 'Candidate' | 'Champion';

export type ModelInfo = {
  /** null for `route_only` packs — GPX geometry import has no model behind it. */
  modelVersion: string | null;
  validationLevel: string;
  intendedUse: string;
  fieldValidated: boolean;
  labelSource: string;
  labelRelease: string;
  labelResolutionM: number;
  predictionSupportM: number;
  /** Section 11's first gate: a gap warning may only fire when the pack this
   * came from has been explicitly approved for mobile warnings — a high
   * transferred risk_score alone (Section 18) is not enough. */
  approvedForMobileWarning: boolean;
  /** Present only on `model_backed` packs. */
  modelStage?: ModelStage;
};
