/**
 * components/app-info/shared.tsx
 *
 * Shared data, colors, and components for the App Info section. Lives
 * outside app/ (expo-router treats every file under app/ as a potential
 * route, including underscore-prefixed ones — there's no "exclude from
 * routing" naming convention here) so it's never picked up as a screen.
 *
 * The App Info section is TWO separate routes (not a same-screen tab
 * switch): app/app-info/index.tsx ("Home") and app/app-info/map.tsx
 * ("Map"). Tapping the bottom nav's Home/Map icons navigates between them
 * with router.replace (so they swap instead of stacking on top of each
 * other). Both screens share this file's header, bottom-nav pill, colors,
 * and content data so nothing is duplicated between the two route files.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#0F1B2E',
  textMuted: 'rgba(15, 27, 46, 0.55)',
  accent: '#4ADE80',
  pillBg: 'rgba(15, 27, 46, 0.04)',
  pillBorder: 'rgba(15, 27, 46, 0.1)',
};

// Fixed nav pill size — sized for the 3-icon row (home, map, continue-arrow),
// so it never grows or shrinks. Both layers (icons / continue+back) live
// inside this same box and crossfade.
const NAV_WIDTH = 172;
const NAV_HEIGHT = 60;

export type Feature = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
};

export type Phase = {
  title: string;
  short: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type Outcome = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const PHASES: Phase[] = [
  {
    title: 'Data Collection & Preparation',
    short: 'Phase 1',
    body: 'Collect hiking-trail, terrain, vegetation, mobile-coverage, and nearby cellular-infrastructure data. Align and catalogue datasets from OpenStreetMap, Copernicus DEM, ESA WorldCover, FAO mobile coverage, Ookla, and OpenCellID. Preprocess the geospatial data and generate consistent features for model training.',
    icon: 'cloud-download-outline',
  },
  {
    title: 'GeoAI Model Development',
    short: 'Phase 2',
    body: 'Train and spatially evaluate a machine-learning model that predicts possible cellular connectivity gaps for each trail segment. Classify results as likely_covered, uncertain, or predicted_gap.',
    icon: 'hardware-chip-outline',
  },
  {
    title: 'Platform Development',
    short: 'Phase 3',
    body: 'Develop a mobile application that allows hikers to download routes, connectivity predictions, and offline maps before their hike. The app will provide warnings before predicted connectivity gaps and record GPS trajectories when mobile coverage is unavailable.',
    icon: 'phone-portrait-outline',
  },
  {
    title: 'System Integration',
    short: 'Phase 4',
    body: 'Connect the AI prediction system with the mobile application. When coverage returns, the application will synchronise saved location records and display the last successfully shared location.',
    icon: 'git-network-outline',
  },
  {
    title: 'Testing & Demonstration',
    short: 'Phase 5',
    body: 'Test the system on selected trails and demonstrate the complete hiking-safety workflow, from route preparation and gap warnings to offline location recording and later synchronisation.',
    icon: 'flask-outline',
  },
  {
    title: 'Consumer Empowerment',
    short: 'Bonus',
    body: 'JEJAK delivers predictive connectivity-gap planning maps and offline connectivity awareness for hikers.',
    icon: 'people-outline',
  },
];

export const OUTCOMES: Outcome[] = [
  {
    label: 'Predictive Connectivity-Gap Maps',
    description: 'Visualise predicted coverage gaps along every trail segment',
    icon: 'map-outline',
  },
  {
    label: 'Offline Connectivity Awareness',
    description: 'Plan ahead with connectivity predictions before you hike',
    icon: 'cloud-offline-outline',
  },
  {
    label: 'Search-Support Evidence',
    description: 'Last-known location may help narrow a future search area',
    icon: 'medkit-outline',
  },
  {
    label: 'Infra Planning Optimization',
    description: 'Data-driven telecom investment in remote areas',
    icon: 'construct-outline',
  },
];

export const FEATURES: Feature[] = [
  {
    title: 'Pre-Hike: Route & Prediction Download',
    subtitle: 'Browse trails by GeoAI coverage class, then download offline maps + the prediction layer before you set off',
    icon: 'cloud-download-outline',
    colors: ['#1F3A47', '#0B1524'],
  },
  {
    title: 'Live Hiking: Gap Warning System',
    subtitle: 'Map overlay colored by coverage class, plus proactive alerts before you enter a predicted signal gap',
    icon: 'warning-outline',
    colors: ['#134E4A', '#0B1524'],
  },
  {
    title: 'Offline Trajectory Recording',
    subtitle: 'Continuous background GPS logging saved locally — online or off — tagged with predicted vs. actual coverage',
    icon: 'footsteps-outline',
    colors: ['#3F2A1F', '#0B1524'],
  },
  {
    title: 'Sync & Last-Known-Location',
    subtitle: 'Auto-syncs every saved point once signal returns, highlighting your last successfully shared location',
    icon: 'sync-outline',
    colors: ['#233A5C', '#0B1524'],
  },
  {
    title: 'Emergency Preparation',
    subtitle: 'Emergency-contact panel with an offline queue — requests are queued locally and marked acknowledged only once the server confirms receipt',
    icon: 'medkit-outline',
    colors: ['#3A1F3A', '#0B1524'],
  },
];

/* -------------------------------------------------------------------------- */
/* Shared header — wordmark + big heading, identical on both routes         */
/* -------------------------------------------------------------------------- */
export function AppInfoHeader() {
  // compass needle wobble — base heading is -45deg (pointing up), oscillates
  // a few degrees either side so it reads as a compass settling/searching.
  // Same wordmark as the login page's "JEJAK" — JE + this animated ring
  // icon standing in for the "A" + K.
  const compassRotate = useSharedValue(-45);

  useEffect(() => {
    compassRotate.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(-60, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${compassRotate.value}deg` }],
  }));

  return (
    <>
      {/* eyebrow tag — small context label above the wordmark */}
      <View style={sharedStyles.heroTagRow}>
        <View style={sharedStyles.heroTagDot} />
        <Text style={sharedStyles.heroTagText}>TRAIL SAFETY · GEOAI PLATFORM</Text>
      </View>

      <View style={sharedStyles.brandNameRow}>
        <Text style={sharedStyles.brandName}>JEJ</Text>
        <View style={sharedStyles.brandBadge}>
          <View style={sharedStyles.brandBadgeGlow} />
          <View style={sharedStyles.brandBadgeRing}>
            <Animated.View style={compassStyle}>
              <Ionicons name="navigate" size={22} color={COLORS.accent} />
            </Animated.View>
          </View>
        </View>
        <Text style={sharedStyles.brandName}>K</Text>
      </View>

      <Text style={sharedStyles.heading}>
        <Text style={sharedStyles.headingAccent}>GeoAI</Text>-Powered Hiking{'\n'}
        Connectivity Intelligence
      </Text>

      {/* quick stat chips — closes off the hero block instead of trailing
          straight into the first content section */}
      <View style={sharedStyles.heroStatsRow}>
        <View style={sharedStyles.heroStatChip}>
          <Ionicons name="cloud-offline-outline" size={13} color={COLORS.accent} />
          <Text style={sharedStyles.heroStatText}>Offline-Ready</Text>
        </View>
        <View style={sharedStyles.heroStatChip}>
          <Ionicons name="sync-outline" size={13} color={COLORS.accent} />
          <Text style={sharedStyles.heroStatText}>Real-time Sync</Text>
        </View>
        <View style={sharedStyles.heroStatChip}>
          <Ionicons name="hardware-chip-outline" size={13} color={COLORS.accent} />
          <Text style={sharedStyles.heroStatText}>GeoAI Powered</Text>
        </View>
      </View>

      <View style={{ height: 28 }} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared closing footer — same visual full-stop on both routes             */
/* -------------------------------------------------------------------------- */
export function AppInfoFooter() {
  return (
    <>
      <View style={sharedStyles.footerDivider} />
      <View style={sharedStyles.footer}>
        <Ionicons name="link" size={14} color={COLORS.accent} />
        <Text style={sharedStyles.footerText}>JEJAK — Built for safer trails</Text>
      </View>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating bottom nav pill — navigates between the two app-info routes.    */
/* FIXED size (matches the original 4-icon layout width exactly) — it never */
/* resizes. Tapping the arrow crossfades between two absolutely-positioned  */
/* layers inside that same fixed box (icons -> back button + "Continue"),   */
/* animated with Reanimated so it's driven on the UI thread and stays       */
/* smooth (LayoutAnimation was skipping frames instead of animating).       */
/* -------------------------------------------------------------------------- */
export function BottomNav({ activeTab }: { activeTab: 'home' | 'map' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 0 = showing Home/Map/expand-arrow, 1 = showing back-button + "Continue"
  const expandProgress = useSharedValue(0);
  // Both layers stay mounted (for a smooth crossfade) — this just gates
  // which one can receive touches, since opacity alone doesn't block taps.
  const [isExpanded, setIsExpanded] = useState(false);

  const expandContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(true);
    expandProgress.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  };

  const collapseContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(false);
    expandProgress.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  };

  const switchTab = (tab: 'home' | 'map') => {
    if (tab === activeTab) return;
    Haptics.selectionAsync();
    router.replace(tab === 'home' ? '/app-info' : '/app-info/map');
  };

  const iconsLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - expandProgress.value,
  }));

  const continueLayerStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
  }));

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/home?openLogin=true');
  };

  return (
    <View style={[sharedStyles.bottomNavWrap, { paddingBottom: insets.bottom + 12 }]}>
      <View style={sharedStyles.bottomNav}>
        {/* Layer 1: Home / Map / expand-arrow */}
        <Animated.View
          style={[sharedStyles.navLayer, iconsLayerStyle]}
          pointerEvents={isExpanded ? 'none' : 'auto'}
        >
          <Pressable
            onPress={() => switchTab('home')}
            style={[sharedStyles.navIconBtn, activeTab === 'home' && sharedStyles.navIconBtnActive]}
          >
            <Ionicons
              name="home"
              size={20}
              color={activeTab === 'home' ? '#0B1524' : 'rgba(255,255,255,0.55)'}
            />
          </Pressable>
          <Pressable
            onPress={() => switchTab('map')}
            style={[sharedStyles.navIconBtn, activeTab === 'map' && sharedStyles.navIconBtnActive]}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={activeTab === 'map' ? '#0B1524' : 'rgba(255,255,255,0.55)'}
            />
          </Pressable>
          <Pressable onPress={expandContinue} style={sharedStyles.continueCircle}>
            <Ionicons name="arrow-forward" size={20} color="#0B1524" />
          </Pressable>
        </Animated.View>

        {/* Layer 2: back-arrow (LEFT) + plain "Continue" text (no icon) */}
        <Animated.View
          style={[sharedStyles.navLayer, continueLayerStyle]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <Pressable onPress={collapseContinue} style={sharedStyles.backCircle}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.75)" />
          </Pressable>

          <Pressable onPress={handleContinue} style={sharedStyles.continuePillTouchable}>
            <Text style={sharedStyles.continuePillText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  heroTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  brandBadge: {
    width: 30,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -3,
    marginRight: 3,
    marginTop: 2,
    position: 'relative',
  },
  brandBadgeGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74,222,128,0.18)',
  },
  brandBadgeRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 6,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headingAccent: {
    color: COLORS.accent,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  heroStatText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
    position: 'relative',
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  infoLabelNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.pillBorder,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  bottomNavWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomNav: {
    width: NAV_WIDTH,
    height: NAV_HEIGHT,
    backgroundColor: 'rgba(20,24,30,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 32,
    overflow: 'hidden',
  },
  navLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconBtnActive: {
    backgroundColor: COLORS.accent,
  },
  continueCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  continuePillTouchable: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continuePillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1524',
  },
});
