/**
 * app/(tabs)/downloads.tsx
 *
 * WP0 placeholder. Offline pack download/remove/update (WP2) and the
 * route_pack table (WP3) are not implemented yet.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Ionicons name="cloud-download-outline" size={40} color="rgba(15,27,46,0.35)" />
      <Text className="text-[16px] font-bold text-[#0F1B2E] mt-4 mb-1 text-center">
        No offline packs downloaded
      </Text>
      <Text className="text-[13px] text-[rgba(15,27,46,0.55)] text-center">
        Downloaded trail packs will show their pack version, model version,
        and planning-prediction status here.
      </Text>
    </View>
  );
}
