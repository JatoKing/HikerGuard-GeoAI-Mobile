import { parseTrailPack } from '@/src/api/contracts';
import type { TrailPack } from '@/src/domain/trail';

export type PackUpdateResult =
  | { status: 'accepted'; pack: TrailPack }
  | { status: 'rejected'; reason: string; keptPack: TrailPack | null };

/**
 * Decides whether a newly downloaded trail pack should replace the last
 * known-good pack already stored on the device — handoff contract Section 8:
 * "A rejected new pack must not delete the last valid offline pack."
 *
 * `pack_version` is an ISO 8601 timestamp (see Section 8 examples), so
 * lexicographic comparison is chronological. This is a placeholder ordering
 * rule until the application backend defines pack_version semantics more
 * precisely (Section 18 lists the trail-pack endpoint contract as an open
 * cross-team decision).
 */
export function evaluatePackUpdate(
  candidateRaw: unknown,
  currentPack: TrailPack | null
): PackUpdateResult {
  let candidate: TrailPack;
  try {
    candidate = parseTrailPack(candidateRaw);
  } catch (error) {
    return {
      status: 'rejected',
      reason: error instanceof Error ? error.message : 'Invalid trail pack',
      keptPack: currentPack,
    };
  }

  if (currentPack && candidate.packVersion <= currentPack.packVersion) {
    return {
      status: 'rejected',
      reason: `pack_version "${candidate.packVersion}" is not newer than the stored pack_version "${currentPack.packVersion}"`,
      keptPack: currentPack,
    };
  }

  return { status: 'accepted', pack: candidate };
}
