/**
 * app/(tabs)/index.tsx
 *
 * JEJAK — Dashboard / Landing (post-login)
 * -------------------------------------------------
 * Dummy landing page shown right after login (home.tsx's login form and
 * social buttons call router.replace('/(tabs)') unconditionally — there's
 * no real auth check, so anything typed gets you here). Built around the
 * same 5 features shown in the App Info "Map" tab (see
 * components/app-info/shared.tsx FEATURES) so the two stay in sync.
 *
 * LAYOUT: greeting + quick stats live inside one gradient hero card
 * (rather than plain text on white).
 *
 * STYLING: NativeWind `className` utilities everywhere, EXCEPT the two
 * LinearGradient containers (heroCard/ctaGradient) — expo-linear-gradient
 * isn't a core RN component NativeWind auto-interops, so those two keep a
 * small plain StyleSheet just for sizing/margins.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/components/app-info/shared';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* hero card — greeting + quick stats on a gradient background */}
        <LinearGradient
          colors={['#16342A', '#0B1524']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View className="flex-row justify-between items-center mb-[18px]">
            <View>
              <Text className="text-[13px] text-white/60 mb-0.5">Selamat kembali,</Text>
              <Text className="text-[22px] font-extrabold text-white">Hiker 👋</Text>
            </View>
            <View className="w-[42px] h-[42px] rounded-full bg-white/[0.08] border border-white/[0.15] items-center justify-center">
              <Ionicons name="person" size={20} color={COLORS.accent} />
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="flex-row items-center gap-[5px] bg-white/[0.08] border border-white/[0.15] rounded-full py-[7px] px-3">
              <Ionicons name="map-outline" size={13} color={COLORS.accent} />
              <Text className="text-[11.5px] font-semibold text-white">3 Trails Ready</Text>
            </View>
            <View className="flex-row items-center gap-[5px] bg-white/[0.08] border border-white/[0.15] rounded-full py-[7px] px-3">
              <Ionicons name="sync-outline" size={13} color={COLORS.accent} />
              <Text className="text-[11.5px] font-semibold text-white">Synced 2m ago</Text>
            </View>
            <View className="flex-row items-center gap-[5px] bg-white/[0.08] border border-white/[0.15] rounded-full py-[7px] px-3">
              <Ionicons name="cellular-outline" size={13} color={COLORS.accent} />
              <Text className="text-[11.5px] font-semibold text-white">Signal: Strong</Text>
            </View>
          </View>
        </LinearGradient>

        {/* primary CTA — start a hike. Deliberately a different shape from
            every other card on this screen (gradient banner, oversized
            bleeding icon, pill button) so it reads as THE action to take,
            not just another info tile. */}
        <Pressable className="rounded-[22px] overflow-hidden mx-6 mb-[14px]">
          <LinearGradient
            colors={['#1B4332', '#0B1524']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Ionicons
              name="compass"
              size={150}
              color="rgba(255,255,255,0.06)"
              style={styles.ctaBgIcon}
            />

            <View className="self-start bg-[rgba(74,222,128,0.18)] rounded-full py-1 px-[10px] mb-[10px]">
              <Text className="text-[10px] font-bold text-[#4ADE80] tracking-[1px]">NEXT STEP</Text>
            </View>
            <Text className="text-[18px] font-extrabold text-white mb-1.5">Ready for the trail?</Text>
            <Text className="text-[12.5px] leading-[17px] text-white/[0.65] mb-4 max-w-[85%]">
              Pick a trail, then download offline maps + GeoAI predictions
            </Text>

            <View className="flex-row items-center justify-center gap-[6px] self-start bg-[#4ADE80] rounded-full py-[10px] px-4">
              <Text className="text-[13px] font-bold text-[#0B1524]">Start Hike</Text>
              <Ionicons name="arrow-forward" size={15} color="#0B1524" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* last-known-location highlight — dummy data, but this exact
            widget is called out in the spec as needing dedicated UI, not
            just a plain log entry */}
        <View className="flex-row items-center gap-3 bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] rounded-[18px] p-4 mx-6 mb-[14px]">
          <View className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(74,222,128,0.15)] items-center justify-center">
            <Ionicons name="location" size={18} color={COLORS.accent} />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-[#4ADE80] tracking-[0.8px] mb-1">
              LAST SUCCESSFULLY SHARED LOCATION
            </Text>
            <Text className="text-[13.5px] font-bold text-[#0F1B2E] mb-0.5">
              Near Gunung Berembun · 3.2km from trailhead
            </Text>
            <Text className="text-[11.5px] text-[rgba(15,27,46,0.55)]">Synced 12 minutes ago</Text>
          </View>
        </View>

        {/* emergency SOS quick access */}
        <Pressable className="flex-row items-center justify-center gap-2 bg-[#E23744] rounded-[18px] py-[15px] mx-6 mb-7">
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          <Text className="text-[15px] font-bold text-white">Emergency SOS</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  ctaGradient: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  ctaBgIcon: {
    position: 'absolute',
    top: -20,
    right: -30,
    transform: [{ rotate: '-15deg' }],
  },
});
