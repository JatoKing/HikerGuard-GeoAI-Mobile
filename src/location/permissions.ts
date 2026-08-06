import * as Location from 'expo-location';

export type ForegroundPermissionResult =
  | { granted: true }
  | { granted: false; canAskAgain: boolean };

/**
 * Request foreground location permission. Callers must show the
 * safety/battery explanation copy (Section 10) BEFORE calling this — this
 * function only wraps the platform dialog itself.
 */
export async function requestForegroundPermission(): Promise<ForegroundPermissionResult> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') {
    return { granted: true };
  }
  return { granted: false, canAskAgain };
}

export async function getForegroundPermissionStatus(): Promise<ForegroundPermissionResult> {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') {
    return { granted: true };
  }
  return { granted: false, canAskAgain };
}
