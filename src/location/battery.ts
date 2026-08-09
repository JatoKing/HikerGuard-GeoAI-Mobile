import * as Battery from 'expo-battery';

/**
 * `expo-battery`'s getBatteryLevelAsync() returns -1 when the platform
 * can't report a level (e.g. web, or a battery-less device) — normalise
 * that sentinel to null so it matches Section 9's nullable
 * `location_point.battery_level` column instead of being stored as a bogus
 * negative reading.
 */
export function normalizeBatteryLevel(level: number): number | null {
  return level >= 0 ? level : null;
}

/** Battery level as a 0-1 fraction, for Section 9's `battery_level` column
 * and Section 11's "check your battery level" preparation prompt. */
export async function getBatteryLevel(): Promise<number | null> {
  return normalizeBatteryLevel(await Battery.getBatteryLevelAsync());
}
