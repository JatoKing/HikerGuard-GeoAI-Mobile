/**
 * app/(tabs)/index.tsx
 *
 * JEJAK — Dashboard / Landing (post-login)
 * -------------------------------------------------
 * Redesigned around a "hiker's log" idea instead of a generic tile grid:
 * a single manifest list of readiness signals (trails ready, packs
 * offline, active hike, connectivity, last sync), each row reading from
 * the real systems built in WP1-WP5 — no more hardcoded placeholder text
 * ("3 Trails Ready", "Signal: Strong", a fabricated last-known-location).
 * The previous version also showed the same trail/pack counts twice (once
 * in the hero pills, once in separate summary tiles) — this collapses that
 * into one list, each row doubling as the quick-access link the old tiles
 * were for.
 *
 * The Emergency SOS button from the previous version is removed — SOS is
 * P1 and unbuilt (Section 14); a dead button that does nothing on tap is
 * worse than no button.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import NetInfo from '@react-native-community/netinfo';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTrailRepository } from '@/src/repositories/create-trail-repository';
import { listStoredPacks } from '@/src/storage/route-pack-store';
import {
  getResumableHikeSession,
  getLastAcknowledgedLocation,
  type LastAcknowledgedLocation,
} from '@/src/repositories/hike-repository';
import type { HikeSession } from '@/src/domain/hike';

const ACCENT = '#4ADE80';
const INK = '#0F1B2E';
const INK_MUTED = 'rgba(15,27,46,0.55)';

const trailRepository = createTrailRepository();

function formatRelativeTime(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat tengah hari';
  if (hour < 19) return 'Selamat petang';
  return 'Selamat malam';
}

/** Faint elevation-contour lines — a trail-map texture behind the greeting,
 * not a literal chart of anything. Pure decoration, so it's fine that it's
 * not derived from real data (unlike the manifest rows below it). */
function ContourTexture() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 300 140"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      preserveAspectRatio="none"
    >
      <Path
        d="M-10,110 C60,90 90,130 150,105 C210,80 240,120 310,95"
        stroke="rgba(15,27,46,0.09)"
        strokeWidth={1.5}
        fill="none"
      />
      <Path
        d="M-10,70 C50,50 100,85 160,60 C220,35 250,70 310,45"
        stroke="rgba(15,27,46,0.07)"
        strokeWidth={1.5}
        fill="none"
      />
      <Path
        d="M-10,30 C70,15 120,45 180,25 C230,8 260,35 310,15"
        stroke="rgba(15,27,46,0.06)"
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Manifest row — one readiness signal per line, left rail dot + connector   */
/* -------------------------------------------------------------------------- */
type ManifestRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  ready?: boolean;
  isLast?: boolean;
  onPress?: () => void;
};

function ManifestRow({ icon, label, value, valueColor, ready, isLast, onPress }: ManifestRowProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} className="flex-row">
      <View className="items-center w-[22px] mr-3">
        <View
          className="w-[9px] h-[9px] rounded-full mt-1"
          style={{ backgroundColor: ready ? ACCENT : 'rgba(15,27,46,0.18)' }}
        />
        {!isLast && <View className="flex-1 w-[1.5px] mt-1" style={{ backgroundColor: 'rgba(15,27,46,0.1)' }} />}
      </View>
      <View className={`flex-1 flex-row items-center justify-between ${isLast ? '' : 'pb-4'}`}>
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={14} color={INK_MUTED} />
          <Text className="text-[13px] font-semibold" style={{ color: INK }}>
            {label}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-[13px] font-bold"
            style={{ color: valueColor ?? INK, fontVariant: ['tabular-nums'] }}
          >
            {value}
          </Text>
          {onPress && <Ionicons name="chevron-forward" size={14} color="rgba(15,27,46,0.3)" />}
        </View>
      </View>
    </Wrapper>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trailCount, setTrailCount] = useState<number | null>(null);
  const [downloadedCount, setDownloadedCount] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<HikeSession | null>(null);
  const [lastLocation, setLastLocation] = useState<LastAcknowledgedLocation | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const [trails, packs, resumable, lastAck] = await Promise.all([
      trailRepository.listTrails(),
      listStoredPacks(),
      getResumableHikeSession(),
      getLastAcknowledgedLocation(),
    ]);
    setTrailCount(trails.length);
    setDownloadedCount(packs.length);
    setActiveSession(resumable);
    setLastLocation(lastAck);
  }, []);

  // Re-check every time this tab gains focus — e.g. after downloading a
  // pack on the Trails tab or ending a hike on Active Hike.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    NetInfo.fetch().then((state) => setIsOnline(Boolean(state.isConnected)));
    const unsubscribe = NetInfo.addEventListener((state) => setIsOnline(Boolean(state.isConnected)));
    return unsubscribe;
  }, []);

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* greeting — no stat pills here (those live in the manifest below
            now, so they aren't shown twice); a faint contour texture and a
            time-aware line give it some life without adding more numbers */}
        <Pressable
          onPress={() => router.replace('/home')}
          className="mx-6 mb-5 self-end flex-row items-center gap-1"
        >
          <Ionicons name="log-out-outline" size={13} color="rgba(15,27,46,0.4)" />
          <Text className="text-[11.5px] font-semibold" style={{ color: INK_MUTED }}>
            Log out
          </Text>
        </Pressable>

        <View className="mx-6 mb-6 rounded-[22px] overflow-hidden">
          <LinearGradient
            colors={['#FFFFFF', '#4ADE80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <ContourTexture />
            <View className="flex-row items-center gap-3">
              <View
                className="w-[46px] h-[46px] rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(15,27,46,0.06)', borderWidth: 1.5, borderColor: 'rgba(15,27,46,0.25)' }}
              >
                <Ionicons name="person" size={20} color={INK} />
              </View>
              <View>
                <Text className="text-[12.5px] mb-0.5" style={{ color: 'rgba(15,27,46,0.6)' }}>
                  {timeOfDayGreeting()},
                </Text>
                <Text
                  className="text-[24px] font-extrabold"
                  style={{ letterSpacing: 0.3, color: INK }}
                >
                  Hiker 👋
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* primary status band — start or resume, whichever actually applies */}
        <Pressable
          onPress={() => router.push('/active-hike')}
          className="rounded-[20px] overflow-hidden mx-6 mb-6"
        >
          <LinearGradient
            colors={['#FFFFFF', '#4ADE80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18 }}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View
                className="w-[7px] h-[7px] rounded-full"
                style={{ backgroundColor: activeSession ? '#DC2626' : '#15803D' }}
              />
              <Text
                className="text-[10px] font-bold tracking-[1px]"
                style={{ color: activeSession ? '#DC2626' : '#15803D' }}
              >
                {activeSession ? 'IN PROGRESS' : 'NEXT STEP'}
              </Text>
            </View>
            <Text className="text-[17px] font-extrabold mb-1" style={{ color: INK }}>
              {activeSession ? `Continue on ${activeSession.trailId}?` : 'Ready for the trail?'}
            </Text>
            <Text className="text-[12.5px] leading-[17px] mb-4" style={{ color: 'rgba(15,27,46,0.6)' }}>
              {activeSession
                ? 'Your hike is still recording locally — jump back in.'
                : 'Pick a trail, then download its offline map and connectivity plan.'}
            </Text>
            <View className="flex-row items-center gap-[6px] self-start bg-[#0F1B2E] rounded-full py-[9px] px-4">
              <Text className="text-[13px] font-bold text-white">
                {activeSession ? 'Resume Hike' : 'Start Hike'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* readiness manifest — one line per signal, doubles as quick access */}
        <View className="px-6 mb-6">
          <Text className="text-[11px] font-bold tracking-[1px] mb-3" style={{ color: INK_MUTED }}>
            READINESS
          </Text>
          <ManifestRow
            icon="map-outline"
            label="Trails ready"
            value={trailCount === null ? '…' : String(trailCount)}
            ready={Boolean(trailCount)}
            onPress={() => router.push('/trails')}
          />
          <ManifestRow
            icon="cloud-download-outline"
            label="Packs offline"
            value={downloadedCount === null ? '…' : String(downloadedCount)}
            ready={Boolean(downloadedCount)}
            onPress={() => router.push('/downloads')}
          />
          <ManifestRow
            icon="footsteps-outline"
            label="Active hike"
            value={
              activeSession === null
                ? 'None'
                : activeSession.state === 'paused'
                  ? 'Paused'
                  : 'Active'
            }
            valueColor={activeSession ? ACCENT : undefined}
            ready={Boolean(activeSession)}
            onPress={() => router.push('/active-hike')}
          />
          <ManifestRow
            icon={isOnline ? 'cloud-outline' : 'cloud-offline-outline'}
            label="Connectivity"
            value={isOnline === null ? '…' : isOnline ? 'Online' : 'Offline'}
            valueColor={isOnline ? ACCENT : '#F87171'}
            ready={Boolean(isOnline)}
          />
          <ManifestRow
            icon="sync-outline"
            label="Last synced"
            value={lastLocation ? formatRelativeTime(lastLocation.recordedAt) : '—'}
            ready={Boolean(lastLocation)}
            isLast
          />
        </View>

        {/* last-acknowledged-location — the newest location whose event_id
            the (mock) server has actually acknowledged, per Section 12. Not
            the phone's current GPS position or the newest queued point. */}
        <View className="px-6">
          <Text className="text-[11px] font-bold tracking-[1px] mb-3" style={{ color: INK_MUTED }}>
            LAST KNOWN POSITION
          </Text>
          {lastLocation ? (
            <View
              className="rounded-[16px] p-4"
              style={{ backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)' }}
            >
              <Text
                className="text-[15px] font-bold mb-1"
                style={{ color: INK, fontVariant: ['tabular-nums'] }}
              >
                {lastLocation.latitude.toFixed(4)}, {lastLocation.longitude.toFixed(4)}
              </Text>
              <Text className="text-[12px]" style={{ color: INK_MUTED }}>
                {lastLocation.trailId} · synced {formatRelativeTime(lastLocation.recordedAt)}
              </Text>
            </View>
          ) : (
            <View
              className="rounded-[16px] p-4"
              style={{ backgroundColor: 'rgba(15,27,46,0.03)', borderWidth: 1, borderColor: 'rgba(15,27,46,0.08)' }}
            >
              <Text className="text-[13px] font-bold mb-0.5" style={{ color: INK }}>
                No location synced yet
              </Text>
              <Text className="text-[12px]" style={{ color: INK_MUTED }}>
                Start a hike to begin tracking your position.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
