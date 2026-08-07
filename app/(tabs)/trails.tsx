/**
 * app/(tabs)/trails.tsx
 *
 * Lists trails from the fixture trail repository, grouped by state and
 * shown as richer cards instead of a plain bordered list — each one shows
 * whether it's already downloaded (checked against route_pack, WP2/WP3),
 * not a static label.
 *
 * STATE_BY_TRAIL_ID is UI-only enrichment, not part of the trail-pack
 * contract (Section 8's TrailSummary has no state/negeri field) — keeping
 * it here instead of in the domain layer keeps that contract exactly what
 * the backend will actually send.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FixtureTrailRepository } from '@/src/repositories/fixture-trail-repository';
import { listStoredPacks } from '@/src/storage/route-pack-store';
import type { TrailSummary } from '@/src/domain/trail';

const trailRepository = new FixtureTrailRepository();

const STATE_BY_TRAIL_ID: Record<string, string> = {
  'gunung-batu-putih': 'Perak',
  'gopeng-ultra-trail-gua-tempurung': 'Perak',
  'gunung-korbu': 'Perak',
  'bukit-wawasan-puchong': 'Selangor',
  'bukit-tabur': 'Selangor',
  'gunung-panti': 'Johor',
};

function difficultyLabel(distanceM: number): { label: string; color: string } {
  if (distanceM < 5000) return { label: 'Easy', color: '#4ADE80' };
  if (distanceM < 10000) return { label: 'Moderate', color: '#FBBF24' };
  return { label: 'Challenging', color: '#F87171' };
}

function groupByState(trails: TrailSummary[]): [string, TrailSummary[]][] {
  const groups = new Map<string, TrailSummary[]>();
  for (const trail of trails) {
    const state = STATE_BY_TRAIL_ID[trail.trailId] ?? 'Other';
    if (!groups.has(state)) groups.set(state, []);
    groups.get(state)!.push(trail);
  }
  return Array.from(groups.entries());
}

export default function TrailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trails, setTrails] = useState<TrailSummary[] | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      trailRepository.listTrails().then(setTrails);
      listStoredPacks().then((packs) => setDownloadedIds(new Set(packs.map((p) => p.trailId))));
    }, [])
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 16 }}>
      <Text className="text-[22px] font-extrabold text-[#0F1B2E] px-6 mb-1">Trails</Text>
      <Text className="text-[13px] text-[rgba(15,27,46,0.55)] px-6 mb-4">
        Fixture data only — planning predictions, not confirmed coverage.
      </Text>

      {trails === null ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {groupByState(trails).map(([state, stateTrails]) => (
            <View key={state} className="mb-5">
              <Text className="text-[11px] font-bold tracking-[1px] text-[rgba(15,27,46,0.45)] mb-2">
                {state.toUpperCase()}
              </Text>
              {stateTrails.map((item) => {
                const difficulty = difficultyLabel(item.distanceM);
                const isDownloaded = downloadedIds.has(item.trailId);
                return (
                  <Pressable
                    key={item.trailId}
                    onPress={() => router.push(`/trails/${item.trailId}`)}
                    className="flex-row items-center bg-[rgba(15,27,46,0.02)] border border-[rgba(15,27,46,0.08)] rounded-[18px] p-4 mb-3"
                  >
                    <View
                      className="w-[46px] h-[46px] rounded-[14px] items-center justify-center mr-3"
                      style={{ backgroundColor: `${difficulty.color}22` }}
                    >
                      <Ionicons name="triangle-outline" size={20} color={difficulty.color} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-[#0F1B2E] mb-1">{item.name}</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[12px] text-[rgba(15,27,46,0.55)]">
                          {(item.distanceM / 1000).toFixed(1)} km
                        </Text>
                        <View className="w-[3px] h-[3px] rounded-full bg-[rgba(15,27,46,0.3)]" />
                        <Text className="text-[12px] font-semibold" style={{ color: difficulty.color }}>
                          {difficulty.label}
                        </Text>
                      </View>
                    </View>

                    {isDownloaded && (
                      <View className="flex-row items-center gap-1 bg-[rgba(74,222,128,0.12)] rounded-full py-1 px-2 mr-2">
                        <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                        <Text className="text-[10px] font-bold text-[#15803D]">Saved</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="rgba(15,27,46,0.35)" />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
