/**
 * app/(tabs)/active-hike.tsx
 *
 * WP3: start/end a hike and record GPS locally (handoff contract Section
 * 10). Foreground recording only — background recording needs
 * expo-task-manager wired into a development build, which Expo Go cannot
 * run reliably (Section 7), so it isn't implemented yet.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LocationSubscription } from 'expo-location';

import { listStoredPacks } from '@/src/storage/route-pack-store';
import {
  startHikeSession,
  endHikeSession,
  getResumableHikeSession,
  insertHikeEvent,
  insertLocationPoint,
  countPendingLocationPoints,
} from '@/src/repositories/hike-repository';
import { requestForegroundPermission } from '@/src/location/permissions';
import { startForegroundRecording, stopForegroundRecording } from '@/src/location/recorder';
import { evaluateGapWarning, groupContiguousGapSegments } from '@/src/warnings/gap-warning-engine';
import { DEFAULT_GAP_WARNING_CONFIG, GAP_WARNING_RECOMMENDED_ACTIONS } from '@/src/domain/warnings';
import type { GapWarning } from '@/src/domain/warnings';
import type { TrailPack } from '@/src/domain/trail';
import type { HikeSession } from '@/src/domain/hike';

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
  const [pendingCount, setPendingCount] = useState(0);
  const [lastPointAt, setLastPointAt] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [startingTrailId, setStartingTrailId] = useState<string | null>(null);
  const [gapWarning, setGapWarning] = useState<GapWarning | null>(null);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const acknowledgedGapIdsRef = useRef<Set<string>>(new Set());
  const activePackRef = useRef<TrailPack | null>(null);

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
      batteryLevel: null,
      observedNetworkState: 'unknown',
    });
    setLastPointAt(new Date(point.recordedAtMs).toISOString());
    setPendingCount(await countPendingLocationPoints(localSessionId));

    const evaluation = evaluateGapWarning({
      location: { latitude: point.latitude, longitude: point.longitude },
      segments: pack.segments,
      config: DEFAULT_GAP_WARNING_CONFIG,
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
        setPendingCount(await countPendingLocationPoints(resumable.localSessionId));
        if (resumedPack) {
          // App/process restarted — resume foreground recording now that
          // we're back in the foreground (Section 10 restore requirement).
          await beginRecording(resumable.localSessionId, resumedPack);
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
    setPendingCount(0);
    setGapWarning(null);
    setStartingTrailId(null);
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
    setSession(null);
    setPendingCount(0);
    setLastPointAt(null);
    setGapWarning(null);
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
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <Text className="text-[13px] font-bold text-[#EF4444] tracking-[0.5px]">
              RECORDING — {session.trailId}
            </Text>
          </View>

          <Text className="text-[12px] text-[rgba(15,27,46,0.55)] mb-1">
            Phone is recording locally. Points sync automatically once
            connectivity returns.
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
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Pending sync</Text>
              <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                {pendingCount} point{pendingCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

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
