/**
 * app/trails/[trailId].tsx
 *
 * WP2 trail-detail screen: download the fixture trail pack, then render its
 * ordered segments coloured by risk_class + the offline-pack status panel.
 *
 * NOTE: this renders segments as an ordered schematic strip, not a
 * georeferenced map. Section 7's native map + offline-basemap spike (ADR)
 * hasn't happened yet, so there is no map library wired up. Once that spike
 * picks a library, this list can be replaced by a real GeoJSON-rendered map
 * without touching the repository/domain layers below it.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FixtureTrailRepository } from '@/src/repositories/fixture-trail-repository';
import { TrailPackValidationError } from '@/src/api/contracts';
import type { TrailPack } from '@/src/domain/trail';
import { ConnectivityLegend, RISK_CLASS_META } from '@/src/components/ConnectivityLegend';
import { OfflinePackStatus } from '@/src/components/OfflinePackStatus';

const trailRepository = new FixtureTrailRepository();

export default function TrailDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trailId } = useLocalSearchParams<{ trailId: string }>();

  const [pack, setPack] = useState<TrailPack | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const nextPack = await trailRepository.getTrailPack(trailId);
      // A rejected/invalid pack must not delete the last valid one — since
      // `pack` only updates on success, a thrown error below leaves it as-is.
      setPack(nextPack);
    } catch (err) {
      setError(
        err instanceof TrailPackValidationError
          ? `This trail pack failed validation: ${err.message}`
          : 'Could not download this trail pack. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-6 py-3">
        <Pressable onPress={() => router.back()} className="p-1 -ml-1 mr-2">
          <Ionicons name="chevron-back" size={24} color="#0F1B2E" />
        </Pressable>
        <Text className="text-[16px] font-bold text-[#0F1B2E]">{trailId}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {!pack ? (
          <View className="items-center py-10">
            <Ionicons name="cloud-download-outline" size={36} color="rgba(15,27,46,0.35)" />
            <Text className="text-[13px] text-[rgba(15,27,46,0.55)] text-center mt-3 mb-5">
              Download the offline trail pack to view connectivity planning
              predictions for this trail.
            </Text>

            {error && (
              <Text className="text-[12px] text-[#E23744] text-center mb-4 px-4">{error}</Text>
            )}

            <Pressable
              onPress={handleDownload}
              disabled={isDownloading}
              className="flex-row items-center gap-2 bg-[#4ADE80] rounded-full py-3 px-6"
            >
              {isDownloading ? (
                <ActivityIndicator color="#0B1524" />
              ) : (
                <Ionicons name="download-outline" size={16} color="#0B1524" />
              )}
              <Text className="text-[13px] font-bold text-[#0B1524]">
                {isDownloading ? 'Downloading…' : 'Download offline pack'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-[15px] font-bold text-[#0F1B2E] mb-3">{pack.name}</Text>

            <View className="mb-4">
              <ConnectivityLegend />
            </View>

            <View className="mb-4">
              <OfflinePackStatus pack={pack} />
            </View>

            <Text className="text-[11px] font-bold text-[rgba(15,27,46,0.5)] tracking-[0.6px] mb-2">
              TRAIL SEGMENTS ({pack.segments.length})
            </Text>
            {pack.segments
              .slice()
              .sort((a, b) => a.segmentOrder - b.segmentOrder)
              .map((segment) => (
                <View
                  key={segment.segmentId}
                  className="flex-row items-center gap-3 border border-[rgba(15,27,46,0.08)] rounded-[12px] p-3 mb-2"
                >
                  <View
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: RISK_CLASS_META[segment.riskClass].color }}
                  />
                  <View className="flex-1">
                    <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
                      Segment {segment.segmentOrder} ·{' '}
                      {RISK_CLASS_META[segment.riskClass].label}
                    </Text>
                    <Text className="text-[11px] text-[rgba(15,27,46,0.5)]">
                      {segment.segmentLengthM.toFixed(0)}m · confidence{' '}
                      {Math.round(segment.confidence * 100)}%
                    </Text>
                  </View>
                </View>
              ))}

            <Pressable
              onPress={handleDownload}
              disabled={isDownloading}
              className="flex-row items-center justify-center gap-2 border border-[rgba(15,27,46,0.15)] rounded-full py-3 px-6 mt-2"
            >
              <Ionicons name="refresh-outline" size={15} color="#0F1B2E" />
              <Text className="text-[12.5px] font-bold text-[#0F1B2E]">
                {isDownloading ? 'Checking for update…' : 'Check for pack update'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
