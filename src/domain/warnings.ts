export type GapWarningConfig = {
  /** Section 11: "Use warning_distance_m = 600 as a fixture/configuration
   * default, not a hardcoded product fact." */
  warningDistanceM: number;
  /** How far off the planned route a GPS point can be before it's treated
   * as off-route rather than matched to the nearest segment. */
  offRouteToleranceM: number;
};

export const DEFAULT_GAP_WARNING_CONFIG: GapWarningConfig = {
  warningDistanceM: 600,
  offRouteToleranceM: 50,
};

export type GapGroup = {
  /** Stable id for dedup — the first segment_id in the contiguous run. */
  id: string;
  segmentIds: string[];
  startOrder: number;
  endOrder: number;
  totalLengthM: number;
  averageConfidence: number;
};

export type GapWarning = {
  gapGroup: GapGroup;
  distanceToGapM: number;
  distanceToNextCoveredM: number | null;
};

export type GapWarningEvaluation =
  | { shouldWarn: true; isOffRoute: false; warning: GapWarning }
  | { shouldWarn: false; isOffRoute: true }
  | {
      shouldWarn: false;
      isOffRoute: false;
      reason: 'not_approved' | 'no_gap_ahead' | 'too_far' | 'already_acknowledged';
    };

/** Section 11: fixed recommended actions shown alongside every warning. */
export const GAP_WARNING_RECOMMENDED_ACTIONS = [
  'Sync your current location now',
  'Check the offline map',
  'Check your battery level',
  'Notify a contact',
  'Stay with your group',
] as const;
