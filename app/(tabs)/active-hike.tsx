/**
 * app/(tabs)/active-hike.tsx
 *
 * WP0 placeholder. GPS recording, gap warnings, and session state (WP3/WP4)
 * are not implemented yet — this screen exists so the tab bar reflects the
 * real product shape instead of Expo starter content.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActiveHikeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Ionicons name="footsteps-outline" size={40} color="rgba(15,27,46,0.35)" />
      <Text className="text-[16px] font-bold text-[#0F1B2E] mt-4 mb-1 text-center">
        No active hike
      </Text>
      <Text className="text-[13px] text-[rgba(15,27,46,0.55)] text-center">
        Local GPS recording, gap warnings, and offline queueing are coming in
        a later build.
      </Text>
    </View>
  );
}
