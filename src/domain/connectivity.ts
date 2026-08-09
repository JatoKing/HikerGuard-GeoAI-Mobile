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

export type ModelInfo = {
  modelVersion: string;
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
};
