import { generateUuidV4 } from '@/src/lib/uuid';

describe('generateUuidV4', () => {
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('produces a well-formed v4 UUID', () => {
    expect(generateUuidV4()).toMatch(UUID_V4_PATTERN);
  });

  it('does not repeat across calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateUuidV4()));
    expect(ids.size).toBe(50);
  });
});
