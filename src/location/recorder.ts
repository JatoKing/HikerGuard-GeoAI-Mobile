import * as Location from 'expo-location';

export type RecordedPoint = {
  latitude: number;
  longitude: number;
  horizontalAccuracyM: number;
  altitudeM: number | null;
  recordedAtMs: number;
};

export type RecorderOptions = {
  /** Default ~20-30s per Section 10; configurable, not a hardcoded fact. */
  timeIntervalMs?: number;
  distanceIntervalM?: number;
};

const DEFAULT_TIME_INTERVAL_MS = 25000;
const DEFAULT_DISTANCE_INTERVAL_M = 15;

/**
 * Foreground-only GPS recording. Background recording (continuing while
 * the screen is locked or the app is backgrounded) needs expo-task-manager
 * wired into a development build — Expo Go cannot run that reliably
 * (Section 7) — so it isn't implemented yet. This still satisfies "record
 * while offline": watchPositionAsync needs no network, only GPS.
 */
export async function startForegroundRecording(
  onPoint: (point: RecordedPoint) => void,
  options: RecorderOptions = {}
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: options.timeIntervalMs ?? DEFAULT_TIME_INTERVAL_MS,
      distanceInterval: options.distanceIntervalM ?? DEFAULT_DISTANCE_INTERVAL_M,
    },
    (location) => {
      // Inaccurate points are still recorded (Section 10: "do not silently
      // discard inaccurate points"), never filtered out here.
      onPoint({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        horizontalAccuracyM: location.coords.accuracy ?? -1,
        altitudeM: location.coords.altitude,
        recordedAtMs: location.timestamp,
      });
    }
  );
}

export function stopForegroundRecording(subscription: Location.LocationSubscription): void {
  subscription.remove();
}
