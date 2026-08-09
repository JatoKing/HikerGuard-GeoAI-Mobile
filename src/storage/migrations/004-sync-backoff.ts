/**
 * Migration 004 — persisted retry backoff for Section 12: "Use bounded
 * exponential backoff with jitter for transient failures." `computeBackoffMs`
 * (src/sync/queue.ts) already existed but nothing persisted its result, so a
 * transient failure was retried immediately on the next app-foreground/
 * network-return trigger instead of waiting out the backoff window — and an
 * app restart lost any notion of "we just failed, don't hammer the server."
 *
 * `sync_failure_streak` counts consecutive transient failures since the
 * last successful attempt (reset to 0 on any acknowledgement); `next_retry_at`
 * is the ISO timestamp before which a non-forced retry should be skipped.
 */
export const MIGRATION_004_SYNC_BACKOFF = `
ALTER TABLE hike_session ADD COLUMN sync_failure_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hike_session ADD COLUMN next_retry_at TEXT;
`;
