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

/**
 * Requests background permission — Section 10: "Request background
 * permission only when the user enables active-hike background
 * recording," never up front alongside the foreground request. Callers
 * must show the safety/battery-impact explanation copy before calling
 * this, same as requestForegroundPermission.
 */
export async function requestBackgroundPermission(): Promise<ForegroundPermissionResult> {
  const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
  if (status === 'granted') {
    return { granted: true };
  }
  return { granted: false, canAskAgain };
}
