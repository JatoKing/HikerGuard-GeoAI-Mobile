/**
 * app/(tabs)/active-hike.tsx
 *
 * WP3: start/end a hike and record GPS locally (handoff contract Section
 * 10). Foreground recording only — background recording needs
 * expo-task-manager wired into a development build, which Expo Go cannot
 * run reliably (Section 7), so it isn't implemented yet.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking, ScrollView, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LocationSubscription } from 'expo-location';

import { listStoredPacks } from '@/src/storage/route-pack-store';
import {
  startHikeSession,
  endHikeSession,
  getResumableHikeSession,
  setHikeSessionState,
  insertHikeEvent,
  insertLocationPoint,
  listLocationPointsForSession,
  getSyncMeta,
  type SyncMeta,
} from '@/src/repositories/hike-repository';
import { requestForegroundPermission } from '@/src/location/permissions';
import { startForegroundRecording, stopForegroundRecording } from '@/src/location/recorder';
import { getBatteryLevel } from '@/src/location/battery';
import { evaluateGapWarning, groupContiguousGapSegments } from '@/src/warnings/gap-warning-engine';
import { DEFAULT_GAP_WARNING_CONFIG, GAP_WARNING_RECOMMENDED_ACTIONS } from '@/src/domain/warnings';
import type { GapWarning } from '@/src/domain/warnings';
import type { TrailPack } from '@/src/domain/trail';
import type { HikeSession, NetworkObservationState } from '@/src/domain/hike';
import { MockSyncApiClient } from '@/src/api/client';
import { attemptSync } from '@/src/sync/worker';
import { LiveHikeMap, type LatLng } from '@/src/components/LiveHikeMap';
import { TrailMap } from '@/src/components/TrailMap';

const syncApiClient = new MockSyncApiClient();

type PreGapSyncStatus = 'syncing' | 'acknowledged' | 'queued';

/**
 * A point somewhere before the pack's first predicted_gap group, so the
 * dev-only "Simulate GPS near gap" button below exercises the exact same
 * evaluateGapWarning() code path a real GPS fix would — just without
 * needing to physically be near this fixture's real-world coordinates.
 */
function pointApproachingFirstGap(pack: TrailPack) {
  const gapGroups = groupContiguousGapSegments(pack.segments);
  const firstGap = gapGroups[0];
  if (!firstGap) return null;

  const ordered = pack.segments.slice().sort((a, b) => a.segmentOrder - b.segmentOrder);
  const approachSegment =
    ordered.find((s) => s.segmentOrder === firstGap.startOrder - 1) ??
    ordered.find((s) => s.segmentOrder === firstGap.startOrder);
  if (!approachSegment) return null;

  const [lon1, lat1] = approachSegment.geometry.coordinates[0];
  const [lon2, lat2] = approachSegment.geometry.coordinates[1];
  return { latitude: (lat1 + lat2) / 2, longitude: (lon1 + lon2) / 2 };
}

type PermissionState = 'unknown' | 'denied' | 'denied_permanently';

export default function ActiveHikeScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [downloadedPacks, setDownloadedPacks] = useState<TrailPack[]>([]);
  const [session, setSession] = useState<HikeSession | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>({
    lastSyncAttemptAt: null,
    lastAcknowledgedAt: null,
    pendingCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastPointAt, setLastPointAt] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [startingTrailId, setStartingTrailId] = useState<string | null>(null);
  const [gapWarning, setGapWarning] = useState<GapWarning | null>(null);
  const [preGapSyncStatus, setPreGapSyncStatus] = useState<PreGapSyncStatus | null>(null);
  const [walkedPath, setWalkedPath] = useState<LatLng[]>([]);
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const acknowledgedGapIdsRef = useRef<Set<string>>(new Set());
  const activePackRef = useRef<TrailPack | null>(null);
  const networkStateRef = useRef<NetworkObservationState>('unknown');

  const refreshSyncMeta = async (localSessionId: string) => {
    setSyncMeta(await getSyncMeta(localSessionId));
  };

  const runSync = async (localSessionId: string, options: { force?: boolean } = {}) => {
    setIsSyncing(true);
    try {
      return await attemptSync(localSessionId, syncApiClient, options);
    } finally {
      await refreshSyncMeta(localSessionId);
      setIsSyncing(false);
    }
  };

  const handleRecordedPoint = async (
    localSessionId: string,
    pack: TrailPack,
    point: { latitude: number; longitude: number; horizontalAccuracyM: number; altitudeM: number | null; recordedAtMs: number }
  ) => {
    await insertLocationPoint({
      localSessionId,
      latitude: point.latitude,
      longitude: point.longitude,
      horizontalAccuracyM: point.horizontalAccuracyM,
      altitudeM: point.altitudeM,
      batteryLevel: await getBatteryLevel(),
      observedNetworkState: networkStateRef.current,
    });
    setLastPointAt(new Date(point.recordedAtMs).toISOString());
    const newPosition = { latitude: point.latitude, longitude: point.longitude };
    setCurrentPosition(newPosition);
    setWalkedPath((prev) => [...prev, newPosition]);
    await refreshSyncMeta(localSessionId);

    const evaluation = evaluateGapWarning({
      location: { latitude: point.latitude, longitude: point.longitude },
      segments: pack.segments,
      config: DEFAULT_GAP_WARNING_CONFIG,
      approvedForMobileWarning: pack.model.approvedForMobileWarning,
      acknowledgedGapGroupIds: acknowledgedGapIdsRef.current,
    });
    if (evaluation.shouldWarn) {
      acknowledgedGapIdsRef.current.add(evaluation.warning.gapGroup.id);
      setGapWarning(evaluation.warning);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await insertHikeEvent({
        localSessionId,
        type: 'gap_warning_shown',
        payload: {
          gapGroupId: evaluation.warning.gapGroup.id,
          distanceToGapM: evaluation.warning.distanceToGapM,
        },
      });

      // Section 11: "Before entering the gap, the app should attempt a
      // sync" and show one of these three states. This is safety-critical
      // enough to override a persisted backoff from an earlier failure.
      setPreGapSyncStatus('syncing');
      const result = await runSync(localSessionId, { force: true });
      setPreGapSyncStatus(result.status === 'acknowledged' ? 'acknowledged' : 'queued');
    }
  };

  const beginRecording = async (localSessionId: string, pack: TrailPack) => {
    activePackRef.current = pack;
    const subscription = await startForegroundRecording((point) =>
      handleRecordedPoint(localSessionId, pack, point)
    );
    subscriptionRef.current = subscription;
  };

  const handleSimulateApproachToGap = async () => {
    if (!session || !activePackRef.current) return;
    const location = pointApproachingFirstGap(activePackRef.current);
    if (!location) return;
    await handleRecordedPoint(session.localSessionId, activePackRef.current, {
      latitude: location.latitude,
      longitude: location.longitude,
      horizontalAccuracyM: 8,
      altitudeM: null,
      recordedAtMs: Date.now(),
    });
  };

  useEffect(() => {
    (async () => {
      const [packs, resumable] = await Promise.all([
        listStoredPacks(),
        getResumableHikeSession(),
      ]);
      setDownloadedPacks(packs);
      if (resumable) {
        const resumedPack = packs.find((p) => p.trailId === resumable.trailId);
        setSession(resumable);
        await refreshSyncMeta(resumable.localSessionId);

        const priorPoints = await listLocationPointsForSession(resumable.localSessionId);
        if (priorPoints.length > 0) {
          const path = priorPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
          setWalkedPath(path);
          setCurrentPosition(path[path.length - 1]);
        }
        // Only restart the GPS watch for a session that was actively
        // recording — a paused session stays paused until the user
        // explicitly resumes it (Section 10 restore requirement).
        if (resumedPack && resumable.state === 'active') {
          await beginRecording(resumable.localSessionId, resumedPack);
        } else if (resumedPack) {
          activePackRef.current = resumedPack;
        }
      }
      setIsLoading(false);
    })();

    return () => {
      if (subscriptionRef.current) {
        stopForegroundRecording(subscriptionRef.current);
      }
    };
  }, []);

  // Downloaded packs can change on another tab (Trails) that stays mounted
  // in Expo Router's tab navigator, so the mount-once effect above never
  // sees a newly downloaded pack. Re-fetch just the pack list on every
  // focus, without touching the session-restore/GPS-resume logic above.
  useFocusEffect(
    useCallback(() => {
      listStoredPacks().then(setDownloadedPacks);
    }, [])
  );

  // Tracks the phone's current reachability independently of whether a hike
  // is active, so a location point recorded the instant connectivity drops
  // (or returns) is stamped with what was actually observed — not a stale
  // guess from the last time this listener happened to fire (Section 13).
  useEffect(() => {
    const toObservationState = (isConnected: boolean | null): NetworkObservationState =>
      isConnected === null ? 'unknown' : isConnected ? 'online' : 'offline';

    NetInfo.fetch().then((state) => {
      networkStateRef.current = toObservationState(state.isConnected);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      networkStateRef.current = toObservationState(state.isConnected);
    });

    return unsubscribe;
  }, []);

  // Retry triggers (Section 12): network return, app foreground, and the
  // manual "Retry sync" button below. Reachability is only a trigger to
  // try — attemptSync()'s server acknowledgement is what actually matters.
  // Both triggers respect the persisted backoff (attemptSync's default);
  // only the manual button below and the pre-gap sync above force through it.
  useEffect(() => {
    if (!session) return;
    const localSessionId = session.localSessionId;
    let wasConnected: boolean | null = null;

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected);
      if (isConnected && wasConnected === false) {
        runSync(localSessionId);
      }
      wasConnected = isConnected;
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        runSync(localSessionId);
      }
    });

    return () => {
      netInfoUnsubscribe();
      appStateSubscription.remove();
    };
  }, [session]);

  const handleStartHike = async (pack: TrailPack) => {
    setStartingTrailId(pack.trailId);
    const permission = await requestForegroundPermission();
    if (!permission.granted) {
      setPermissionState(permission.canAskAgain ? 'denied' : 'denied_permanently');
      setStartingTrailId(null);
      return;
    }
    setPermissionState('unknown');

    acknowledgedGapIdsRef.current = new Set();
    const newSession = await startHikeSession(pack.trailId, pack.packVersion);
    await insertHikeEvent({
      localSessionId: newSession.localSessionId,
      type: 'hike_started',
      payload: { trailId: pack.trailId },
    });
    await beginRecording(newSession.localSessionId, pack);

    setSession(newSession);
    setSyncMeta({ lastSyncAttemptAt: null, lastAcknowledgedAt: null, pendingCount: 0 });
    setGapWarning(null);
    setPreGapSyncStatus(null);
    setWalkedPath([]);
    setCurrentPosition(null);
    setStartingTrailId(null);
  };

  const handlePauseHike = async () => {
    if (!session) return;
    if (subscriptionRef.current) {
      stopForegroundRecording(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    await setHikeSessionState(session.localSessionId, 'paused');
    setSession({ ...session, state: 'paused' });
  };

  const handleResumeHike = async () => {
    if (!session || !activePackRef.current) return;
    await setHikeSessionState(session.localSessionId, 'active');
    await beginRecording(session.localSessionId, activePackRef.current);
    setSession({ ...session, state: 'active' });
  };

  const handleEndHike = async () => {
    if (!session) return;
    if (subscriptionRef.current) {
      stopForegroundRecording(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    await insertHikeEvent({
      localSessionId: session.localSessionId,
      type: 'hike_ended',
      payload: {},
    });
    await endHikeSession(session.localSessionId);
    // Best-effort final flush — anything still pending after this keeps its
    // pending sync_state and would need a background sync worker (not yet
    // built) or the user reopening this hike to retry further. Ending the
    // hike is a one-off event, not a repeated trigger, so it's worth forcing
    // through any backoff from an earlier failure.
    await runSync(session.localSessionId, { force: true });
    const finalMeta = await getSyncMeta(session.localSessionId);
    await setHikeSessionState(
      session.localSessionId,
      finalMeta.pendingCount === 0 ? 'synced' : 'sync_pending'
    );
    setSession(null);
    setLastPointAt(null);
    setGapWarning(null);
    setPreGapSyncStatus(null);
    setWalkedPath([]);
    setCurrentPosition(null);
  };

  if (isLoading) {
    return (
      <View
        className="flex-1 bg-white items-center justify-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 16 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
          <View className="mb-4">
            <LiveHikeMap
              segments={activePackRef.current?.segments ?? []}
              walkedPath={walkedPath}
              currentPosition={currentPosition}
            />
          </View>

          <View className="flex-row items-center gap-2 mb-4">
            <View
              className={`w-2.5 h-2.5 rounded-full ${
                session.state === 'paused' ? 'bg-[rgba(15,27,46,0.35)]' : 'bg-[#EF4444]'
              }`}
            />
            <Text
              className={`text-[13px] font-bold tracking-[0.5px] ${
                session.state === 'paused' ? 'text-[rgba(15,27,46,0.55)]' : 'text-[#EF4444]'
              }`}
            >
              {session.state === 'paused' ? 'PAUSED' : 'RECORDING'} — {session.trailId}
            </Text>
          </View>

          <Text className="text-[12px] text-[rgba(15,27,46,0.55)] mb-1">
            {session.state === 'paused'
              ? 'Recording is paused. Resume to keep tracking your position.'
              : 'Phone is recording locally. Points sync automatically once connectivity returns.'}
          </Text>
          <Text className="text-[12px] text-[rgba(15,27,46,0.55)] mb-6">
            Foreground only right now — keep the app open while hiking.
          </Text>

          {gapWarning && (
            <View className="bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.4)] rounded-[16px] p-4 mb-6">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="warning-outline" size={16} color="#B45309" />
                <Text className="text-[12.5px] font-bold text-[#B45309]">
                  Predicted gap ahead — planning prediction, not confirmed zero
                  coverage
                </Text>
              </View>
              <Text className="text-[12px] text-[#0F1B2E] mb-1">
                About {Math.round(gapWarning.distanceToGapM)}m away · roughly{' '}
                {Math.round(gapWarning.gapGroup.totalLengthM)}m long · confidence{' '}
                {Math.round(gapWarning.gapGroup.averageConfidence * 100)}%
              </Text>
              {gapWarning.distanceToNextCoveredM !== null && (
                <Text className="text-[12px] text-[#0F1B2E] mb-2">
                  Likely covered again in about{' '}
                  {Math.round(gapWarning.distanceToNextCoveredM)}m after the gap.
                </Text>
              )}
              {GAP_WARNING_RECOMMENDED_ACTIONS.map((action) => (
                <Text key={action} className="text-[11.5px] text-[rgba(15,27,46,0.6)]">
                  • {action}
                </Text>
              ))}
              {preGapSyncStatus && (
                <Text className="text-[11.5px] font-semibold text-[#B45309] mt-2">
                  {preGapSyncStatus === 'syncing' && 'Syncing current position…'}
                  {preGapSyncStatus === 'acknowledged' &&
                    `Current position acknowledged at ${
                      syncMeta.lastAcknowledgedAt
                        ? new Date(syncMeta.lastAcknowledgedAt).toLocaleTimeString()
                        : new Date().toLocaleTimeString()
                    }`}
                  {preGapSyncStatus === 'queued' &&
                    'Could not confirm sync; position remains queued on this phone'}
                </Text>
              )}
              <Pressable onPress={() => setGapWarning(null)} className="mt-3">
                <Text className="text-[12px] font-bold text-[#B45309]">Dismiss</Text>
              </Pressable>
            </View>
          )}

          <View className="bg-[rgba(15,27,46,0.04)] border border-[rgba(15,27,46,0.1)] rounded-[16px] p-4 mb-6">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Started</Text>
              <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                {new Date(session.startedAt).toLocaleTimeString()}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Last point recorded</Text>
              <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                {lastPointAt ? new Date(lastPointAt).toLocaleTimeString() : 'Waiting…'}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Pending sync</Text>
              <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                {syncMeta.pendingCount} item{syncMeta.pendingCount === 1 ? '' : 's'}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Last sync attempt</Text>
              <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                {syncMeta.lastSyncAttemptAt
                  ? new Date(syncMeta.lastSyncAttemptAt).toLocaleTimeString()
                  : 'Never'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">
                Last acknowledged location
              </Text>
              <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                {syncMeta.lastAcknowledgedAt
                  ? new Date(syncMeta.lastAcknowledgedAt).toLocaleTimeString()
                  : 'None yet'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => runSync(session.localSessionId, { force: true })}
            disabled={isSyncing || syncMeta.pendingCount === 0}
            className="flex-row items-center justify-center gap-2 border border-[rgba(15,27,46,0.15)] rounded-full py-3 px-6 mb-3"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#0F1B2E" />
            ) : (
              <Ionicons name="sync-outline" size={15} color="#0F1B2E" />
            )}
            <Text className="text-[12.5px] font-bold text-[#0F1B2E]">
              {isSyncing ? 'Syncing…' : 'Retry sync'}
            </Text>
          </Pressable>

          {session.state === 'paused' ? (
            <Pressable
              onPress={handleResumeHike}
              className="flex-row items-center justify-center gap-2 bg-[#4ADE80] rounded-full py-3 px-6 mb-3"
            >
              <Ionicons name="play-outline" size={16} color="#0B1524" />
              <Text className="text-[13px] font-bold text-[#0B1524]">Resume hike</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handlePauseHike}
              className="flex-row items-center justify-center gap-2 border border-[rgba(15,27,46,0.15)] rounded-full py-3 px-6 mb-3"
            >
              <Ionicons name="pause-outline" size={16} color="#0F1B2E" />
              <Text className="text-[13px] font-bold text-[#0F1B2E]">Pause hike</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleEndHike}
            className="flex-row items-center justify-center gap-2 bg-[#E23744] rounded-full py-3 px-6 mb-3"
          >
            <Ionicons name="stop-circle-outline" size={16} color="#FFFFFF" />
            <Text className="text-[13px] font-bold text-white">End hike</Text>
          </Pressable>

          {__DEV__ && (
            <Pressable
              onPress={handleSimulateApproachToGap}
              className="flex-row items-center justify-center gap-2 border border-dashed border-[rgba(15,27,46,0.25)] rounded-full py-2.5 px-6"
            >
              <Ionicons name="flask-outline" size={14} color="rgba(15,27,46,0.5)" />
              <Text className="text-[12px] font-semibold text-[rgba(15,27,46,0.5)]">
                Simulate GPS near gap (dev)
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 16 }}>
      <Text className="text-[22px] font-extrabold text-[#0F1B2E] px-6 mb-1">Active Hike</Text>
      <Text className="text-[13px] text-[rgba(15,27,46,0.55)] px-6 mb-4">
        Recording GPS needs battery and runs the whole time you hike.
      </Text>

      {permissionState !== 'unknown' && (
        <View className="mx-6 mb-4 p-3 bg-[rgba(226,55,68,0.08)] border border-[rgba(226,55,68,0.25)] rounded-[14px]">
          <Text className="text-[12px] text-[#E23744] mb-2">
            Location permission is required to start a hike.
          </Text>
          {permissionState === 'denied_permanently' && (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text className="text-[12px] font-bold text-[#E23744]">Open Settings</Text>
            </Pressable>
          )}
        </View>
      )}

      {downloadedPacks.length === 0 ? (
        <View className="items-center px-8 py-10">
          <Ionicons name="footsteps-outline" size={40} color="rgba(15,27,46,0.35)" />
          <Text className="text-[13px] text-[rgba(15,27,46,0.55)] text-center mt-4">
            Download a trail pack from the Trails tab first, then start your
            hike here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
          {downloadedPacks.map((pack) => (
            <View
              key={pack.trailId}
              className="border border-[rgba(15,27,46,0.1)] rounded-[18px] p-4 mb-3"
            >
              <Text className="text-[15px] font-bold text-[#0F1B2E] mb-3">{pack.name}</Text>
              <View className="mb-3">
                <TrailMap segments={pack.segments} />
              </View>
              <Pressable
                onPress={() => handleStartHike(pack)}
                disabled={startingTrailId === pack.trailId}
                className="flex-row items-center justify-center gap-2 bg-[#4ADE80] rounded-full py-3"
              >
                {startingTrailId === pack.trailId ? (
                  <ActivityIndicator color="#0B1524" />
                ) : (
                  <Ionicons name="play-outline" size={16} color="#0B1524" />
                )}
                <Text className="text-[13px] font-bold text-[#0B1524]">Start hike</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
