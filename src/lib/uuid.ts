/**
 * Lightweight UUID v4 generator. Hermes doesn't reliably expose
 * crypto.randomUUID(), and adding a dependency just for local IDs (not used
 * for anything cryptographic — event_id/local_session_id only need to be
 * unique, per Section 9/12) isn't worth it.
 */
export function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
