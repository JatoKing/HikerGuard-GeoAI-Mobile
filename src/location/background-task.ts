import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';

import { getResumableHikeSession, insertLocationPoint } from '@/src/repositories/hike-repository';
import { getBatteryLevel } from '@/src/location/battery';
import { toNetworkObservationState } from '@/src/domain/hike';
import { isExpoGo } from '@/src/lib/expo-go';

export const BACKGROUND_LOCATION_TASK = 'jejak-background-location-task';

type TaskManagerLocationData = {
  locations: Location.LocationObject[];
};

// Expo Go doesn't have expo-task-manager's native module compiled in — just
// importing the package eagerly calls requireNativeModule() and crashes at
// module-load time, taking the whole screen that imported this file down
// with it (same failure mode as MapLibre; see LiveHikeMap.tsx/TrailMap.tsx
// for the same guard). Only require it in builds that actually have the
// native code; every exported function below no-ops under Expo Go too, so
// nothing here ever reaches TaskManager when it isn't safe to.
type TaskManagerModule = typeof import('expo-task-manager');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TaskManager: TaskManagerModule | null = isExpoGo ? null : require('expo-task-manager');

/**
 * Registered at module scope so it survives app restarts — expo-task-manager
 * requires defineTask to run unconditionally at import time, not inside a
 * component or gated by session state. The callback re-derives which
 * session is active from storage on every fire instead of trusting any
 * in-memory reference: the OS can wake this task in a headless JS instance
 * with no component tree mounted at all, purely to deliver a location
 * update (Section 10: "Recover an active session after application or
 * phone-process restart").
 */
TaskManager?.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[background-task] location task error:', error.message);
    return;
  }

  const session = await getResumableHikeSession();
  if (!session || session.state !== 'active') return;

  const { locations } = (data ?? { locations: [] }) as TaskManagerLocationData;
  if (locations.length === 0) return;

  const netInfoState = await NetInfo.fetch();
  const observedNetworkState = toNetworkObservationState(netInfoState.isConnected);
  // One battery read per delivery batch, not per point — the level can't
  // meaningfully change between points a few metres apart.
  const batteryLevel = await getBatteryLevel();

  for (const location of locations) {
    await insertLocationPoint({
      localSessionId: session.localSessionId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      horizontalAccuracyM: location.coords.accuracy ?? -1,
      altitudeM: location.coords.altitude,
      batteryLevel,
      observedNetworkState,
    });
  }
});

export type BackgroundRecordingOptions = {
  timeIntervalMs?: number;
  distanceIntervalM?: number;
};

const DEFAULT_TIME_INTERVAL_MS = 60000;
const DEFAULT_DISTANCE_INTERVAL_M = 30;

/**
 * Starts OS-delivered location updates that continue while the screen is
 * locked or the app is backgrounded (Section 10) — foreground recording
 * (src/location/recorder.ts) keeps running independently while the app is
 * active; this only fills the gap when it isn't. Requires background
 * permission to already be granted (Section 10: request it only when the
 * user explicitly enables this, never up front). No-ops under Expo Go.
 */
export async function startBackgroundRecording(options: BackgroundRecordingOptions = {}): Promise<void> {
  if (isExpoGo) return;

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (alreadyRunning) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: options.timeIntervalMs ?? DEFAULT_TIME_INTERVAL_MS,
    distanceInterval: options.distanceIntervalM ?? DEFAULT_DISTANCE_INTERVAL_M,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'JEJAK is recording your hike',
      notificationBody: 'Recording your route locally while the app is in the background.',
    },
  });
}

/** Section 10: "Stop the background task when the hike ends" — also called
 * when the user disables background recording without ending the hike.
 * No-ops under Expo Go. */
export async function stopBackgroundRecording(): Promise<void> {
  if (isExpoGo) return;

  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

/** Always false under Expo Go — the task can never actually be running there. */
export async function isBackgroundRecordingActive(): Promise<boolean> {
  if (isExpoGo) return false;
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
