/**
 * app/(tabs)/trails.tsx
 *
 * WP1/WP2 placeholder: lists trails from the fixture trail repository.
 * Selecting a trail and downloading its pack belongs to WP2 — this screen
 * only proves the fixture repository + contracts wire up end to end.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FixtureTrailRepository } from '@/src/repositories/fixture-trail-repository';
import type { TrailSummary } from '@/src/domain/trail';

const trailRepository = new FixtureTrailRepository();

export default function TrailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trails, setTrails] = useState<TrailSummary[] | null>(null);

  useEffect(() => {
    trailRepository.listTrails().then(setTrails);
  }, []);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 16 }}>
      <Text className="text-[22px] font-extrabold text-[#0F1B2E] px-6 mb-1">Trails</Text>
      <Text className="text-[13px] text-[rgba(15,27,46,0.55)] px-6 mb-4">
        Fixture data only — planning predictions, not confirmed coverage.
      </Text>

      {trails === null ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={trails}
          keyExtractor={(item) => item.trailId}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/trails/${item.trailId}`)}
              className="flex-row items-center justify-between border border-[rgba(15,27,46,0.1)] rounded-[18px] p-4 mb-3"
            >
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#0F1B2E] mb-1">{item.name}</Text>
                <Text className="text-[12.5px] text-[rgba(15,27,46,0.55)]">
                  {(item.distanceM / 1000).toFixed(1)} km · pack {item.packVersion}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(15,27,46,0.35)" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
