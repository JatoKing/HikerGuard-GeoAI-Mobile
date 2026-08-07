/**
 * app/(tabs)/downloads.tsx
 *
 * Lists packs actually persisted in route_pack (WP2/WP3) — this screen
 * used to be a WP0 placeholder that always said "no packs downloaded"
 * regardless of what was in storage. Tapping a row navigates to its trail
 * detail; the trash icon removes the pack directly from here, behind a
 * confirmation so a stray tap can't silently delete an offline pack.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listStoredPacks, getStoredPackMetadata, removeStoredPack } from '@/src/storage/route-pack-store';
import type { RoutePackRecord } from '@/src/domain/trail';

type DownloadedPack = {
  trailId: string;
  name: string;
  packVersion: string;
  metadata: RoutePackRecord | null;
};

function formatAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [packs, setPacks] = useState<DownloadedPack[] | null>(null);

  const refresh = useCallback(async () => {
    const storedPacks = await listStoredPacks();
    const withMetadata = await Promise.all(
      storedPacks.map(async (pack) => ({
        trailId: pack.trailId,
        name: pack.name,
        packVersion: pack.packVersion,
        metadata: await getStoredPackMetadata(pack.trailId),
      }))
    );
    setPacks(withMetadata);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleDeletePack = (trailId: string, name: string) => {
    Alert.alert(
      'Remove downloaded pack?',
      `"${name}" will be deleted from this device. You can download it again later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeStoredPack(trailId);
            await refresh();
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 16 }}>
      <Text className="text-[22px] font-extrabold text-[#0F1B2E] px-6 mb-1">Downloads</Text>
      <Text className="text-[13px] text-[rgba(15,27,46,0.55)] px-6 mb-4">
        Offline trail packs stored on this device.
      </Text>

      {packs === null ? (
        <ActivityIndicator className="mt-8" />
      ) : packs.length === 0 ? (
        <View className="items-center px-8 mt-8">
          <Ionicons name="cloud-download-outline" size={40} color="rgba(15,27,46,0.35)" />
          <Text className="text-[16px] font-bold text-[#0F1B2E] mt-4 mb-1 text-center">
            No offline packs downloaded
          </Text>
          <Text className="text-[13px] text-[rgba(15,27,46,0.55)] text-center">
            Download a trail from the Trails tab to see its pack version,
            model version, and planning-prediction status here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(item) => item.trailId}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/trails/${item.trailId}`)}
              className="flex-row items-center justify-between border border-[rgba(15,27,46,0.1)] rounded-[18px] p-4 mb-3"
            >
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#0F1B2E] mb-1">{item.name}</Text>
                <Text className="text-[12px] text-[rgba(15,27,46,0.55)] mb-0.5">
                  Model {item.metadata?.modelVersion ?? '—'}
                </Text>
                <Text className="text-[11.5px] text-[rgba(15,27,46,0.45)]">
                  Downloaded{' '}
                  {item.metadata ? formatAge(item.metadata.downloadedAt) : 'recently'}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDeletePack(item.trailId, item.name)}
                hitSlop={10}
                className="p-2 mr-1"
              >
                <Ionicons name="trash-outline" size={18} color="#E23744" />
              </Pressable>
              <Ionicons name="chevron-forward" size={18} color="rgba(15,27,46,0.35)" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
