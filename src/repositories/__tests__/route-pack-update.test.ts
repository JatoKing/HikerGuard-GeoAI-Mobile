import { evaluatePackUpdate } from '@/src/repositories/route-pack-update';
import { parseTrailPack } from '@/src/api/contracts';

import validPack from '@/src/repositories/fixtures/jalan-bukit-larut.trail-pack.json';
import newerValidPack from '@/src/repositories/fixtures/jalan-bukit-larut.trail-pack.v2.json';
import badChecksumPack from '@/src/repositories/fixtures/invalid/bad-checksum.trail-pack.json';

describe('evaluatePackUpdate', () => {
  it('accepts the first pack when nothing is stored yet', () => {
    const result = evaluatePackUpdate(validPack, null);
    expect(result.status).toBe('accepted');
  });

  it('accepts a newer pack_version over the currently stored pack', () => {
    const current = parseTrailPack(validPack);
    const result = evaluatePackUpdate(newerValidPack, current);
    expect(result.status).toBe('accepted');
  });

  it('rejects a stale pack_version and keeps the current pack', () => {
    const current = parseTrailPack(newerValidPack);
    const result = evaluatePackUpdate(validPack, current);
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.keptPack).toBe(current);
    }
  });

  it('rejects a malformed pack and keeps the current pack (last-known-good)', () => {
    const current = parseTrailPack(validPack);
    const result = evaluatePackUpdate(badChecksumPack, current);
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.keptPack).toBe(current);
    }
  });

  it('rejects a malformed pack with no current pack to fall back to', () => {
    const result = evaluatePackUpdate(badChecksumPack, null);
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.keptPack).toBeNull();
    }
  });
});
