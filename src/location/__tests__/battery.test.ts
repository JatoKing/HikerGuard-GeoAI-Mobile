import { normalizeBatteryLevel } from '@/src/location/battery';

describe('normalizeBatteryLevel', () => {
  it('passes through a valid 0-1 fraction', () => {
    expect(normalizeBatteryLevel(0.42)).toBe(0.42);
    expect(normalizeBatteryLevel(0)).toBe(0);
    expect(normalizeBatteryLevel(1)).toBe(1);
  });

  it('maps the -1 "unknown" sentinel to null', () => {
    expect(normalizeBatteryLevel(-1)).toBeNull();
  });
});
