/**
 * app/app-info.tsx
 *
 * HikerGuard GeoAI — App Info / How It Works
 * -------------------------------------------------
 * Waymark-inspired dark, card-based explainer shown after tapping
 * "Continue as Guest" on the landing page.
 *
 * The bottom nav pill has a FIXED size (matches the original 4-icon
 * layout width exactly) — it never resizes. Tapping the arrow crossfades
 * between two absolutely-positioned layers inside that same fixed box
 * (icons -> back button + "Continue"), animated with Reanimated so it's
 * driven on the UI thread and stays smooth (LayoutAnimation was skipping
 * frames instead of animating).
 *
 * Required packages:
 *   npx expo install expo-linear-gradient react-native-safe-area-context react-native-reanimated
 *   npx expo install @expo/vector-icons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

// Fixed nav pill size — matches the original 4-icon row exactly, so it
// never grows or shrinks. Both layers (icons / continue+back) live inside
// this same box and crossfade.
const NAV_WIDTH = 204;
const NAV_HEIGHT = 60;

const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#0F1B2E',
  textMuted: 'rgba(15, 27, 46, 0.55)',
  accent: '#4ADE80',
  pillBg: 'rgba(15, 27, 46, 0.04)',
  pillBorder: 'rgba(15, 27, 46, 0.1)',
};

type Trail = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
};

const TRAILS: Trail[] = [
  { name: 'Batu Putih', icon: 'trail-sign-outline', colors: ['#2C4A6E', '#0F1B2E'] },
  { name: 'Korbu', icon: 'trail-sign-outline', colors: ['#1B2E4A', '#0B1524'] },
  { name: 'Gopeng', icon: 'trail-sign-outline', colors: ['#22C55E', '#0F1B2E'] },
  { name: 'Bkt Wawasan', icon: 'trail-sign-outline', colors: ['#24405C', '#0B1524'] },
  { name: 'Bkt Tabur', icon: 'trail-sign-outline', colors: ['#2C4A6E', '#1B2E4A'] },
  { name: 'G. Panti', icon: 'trail-sign-outline', colors: ['#0F1B2E', '#0B1524'] },
];

type Feature = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
};

const FEATURES: Feature[] = [
  {
    title: 'Setup pendakian anda',
    subtitle: 'Daftar diri, kenalan kecemasan, pilih trail, muat turun peta offline',
    icon: 'clipboard-outline',
    colors: ['#1F3A47', '#0B1524'],
  },
  {
    title: 'Jejak lokasi masa nyata',
    subtitle: 'Peta live, status signal, auto-log lokasi setiap 20–30 saat',
    icon: 'navigate-outline',
    colors: ['#134E4A', '#0B1524'],
  },
  {
    title: 'Butang SOS kecemasan',
    subtitle: 'Hantar automatik, atau simpan & auto-retry bila signal kembali',
    icon: 'alert-circle-outline',
    colors: ['#3F2A1F', '#0B1524'],
  },
  {
    title: 'Checkpoint automatik',
    subtitle: 'Geofence sepanjang trail, amaran awal ke pasukan SAR',
    icon: 'time-outline',
    colors: ['#233A5C', '#0B1524'],
  },
  {
    title: 'Pengesanan jatuh',
    subtitle: 'Sensor telefon mengesan jatuh + tiada pergerakan, auto-cadang SOS',
    icon: 'body-outline',
    colors: ['#3A1F3A', '#0B1524'],
  },
  {
    title: 'Sentiasa tersambung',
    subtitle: 'Data disimpan offline, auto-sync sebaik signal kembali',
    icon: 'cloud-offline-outline',
    colors: ['#1B2E4A', '#0B1524'],
  },
];

/* -------------------------------------------------------------------------- */
/* Small trail chip in the top horizontal carousel                            */
/* -------------------------------------------------------------------------- */
function TrailChip({ trail, index }: { trail: Trail; index: number }) {
  return (
    <View style={[styles.trailChip, { marginLeft: index === 0 ? 0 : -18, zIndex: TRAILS.length - index }]}>
      <LinearGradient colors={trail.colors} style={styles.trailChipGradient}>
        <Ionicons name={trail.icon} size={20} color="rgba(255,255,255,0.85)" />
      </LinearGradient>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Large feature "photo" card                                                 */
/* -------------------------------------------------------------------------- */
function FeatureCard({ feature, wide = false }: { feature: Feature; wide?: boolean }) {
  return (
    <View
      style={[
        styles.featureCard,
        wide ? { width: SCREEN_W - 48, marginHorizontal: 24 } : { width: (SCREEN_W - 48 - 12) / 2 },
      ]}
    >
      <LinearGradient colors={feature.colors} style={styles.featureCardGradient}>
        <View style={styles.featureIconWrap}>
          <Ionicons name={feature.icon} size={22} color={COLORS.accent} />
        </View>
        <View>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureSubtitle} numberOfLines={3}>
            {feature.subtitle}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function AppInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'saved'>('home');

  // 0 = showing Home/Map/Heart icons, 1 = showing back-button + "Continue"
  const expandProgress = useSharedValue(0);
  // Both layers stay mounted (for a smooth crossfade) — this just gates
  // which one can receive touches, since opacity alone doesn't block taps.
  const [isExpanded, setIsExpanded] = useState(false);

  const expandContinue = () => {
    setIsExpanded(true);
    expandProgress.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  };

  const collapseContinue = () => {
    setIsExpanded(false);
    expandProgress.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  };

  const iconsLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - expandProgress.value,
  }));

  const continueLayerStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
  }));

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* wordmark */}
        <View style={styles.brandRow}>
          <Ionicons name="link" size={16} color={COLORS.accent} />
          <Text style={styles.brandText}>HIKERGUARD</Text>
        </View>

        {/* big heading */}
        <Text style={styles.heading}>Let's keep your{'\n'}adventure safe</Text>

        {/* horizontal trail chip fan */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trailRow}
        >
          {TRAILS.map((trail, i) => (
            <TrailChip key={trail.name} trail={trail} index={i} />
          ))}
        </ScrollView>

        {/* decorative search-style pill */}
        <View style={styles.searchPill}>
          <View style={styles.searchIconDot}>
            <Ionicons name="compass-outline" size={16} color={COLORS.accent} />
          </View>
          <Text style={styles.searchPillText}>Trail mana anda nak explore?</Text>
          <Ionicons name="mic-outline" size={20} color="rgba(15,27,46,0.35)" />
        </View>

        <View style={{ height: 28 }} />

        {/* feature cards — first one wide (hero), rest in a 2-col grid */}
        <FeatureCard feature={FEATURES[0]} wide />
        <View style={{ height: 12 }} />
        <View style={styles.gridRow}>
          <FeatureCard feature={FEATURES[1]} />
          <FeatureCard feature={FEATURES[2]} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.gridRow}>
          <FeatureCard feature={FEATURES[3]} />
          <FeatureCard feature={FEATURES[4]} />
        </View>
        <View style={{ height: 12 }} />
        <FeatureCard feature={FEATURES[5]} wide />
      </ScrollView>

      {/* floating bottom nav pill — FIXED size, two layers crossfade inside it */}
      <View style={[styles.bottomNavWrap, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomNav}>
          {/* Layer 1: Home / Map / Heart / expand-arrow */}
          <Animated.View
            style={[styles.navLayer, iconsLayerStyle]}
            pointerEvents={isExpanded ? 'none' : 'auto'}
          >
            <Pressable
              onPress={() => setActiveTab('home')}
              style={[styles.navIconBtn, activeTab === 'home' && styles.navIconBtnActive]}
            >
              <Ionicons
                name="home"
                size={20}
                color={activeTab === 'home' ? '#0B1524' : 'rgba(255,255,255,0.55)'}
              />
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('map')}
              style={[styles.navIconBtn, activeTab === 'map' && styles.navIconBtnActive]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={activeTab === 'map' ? '#0B1524' : 'rgba(255,255,255,0.55)'}
              />
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('saved')}
              style={[styles.navIconBtn, activeTab === 'saved' && styles.navIconBtnActive]}
            >
              <Ionicons
                name="heart-outline"
                size={20}
                color={activeTab === 'saved' ? '#0B1524' : 'rgba(255,255,255,0.55)'}
              />
            </Pressable>
            <Pressable onPress={expandContinue} style={styles.continueCircle}>
              <Ionicons name="arrow-forward" size={20} color="#0B1524" />
            </Pressable>
          </Animated.View>

          {/* Layer 2: back-arrow (LEFT) + plain "Continue" text (no icon) */}
          <Animated.View
            style={[styles.navLayer, continueLayerStyle]}
            pointerEvents={isExpanded ? 'auto' : 'none'}
          >
            <Pressable onPress={collapseContinue} style={styles.backCircle}>
              <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.75)" />
            </Pressable>

            <Pressable onPress={handleContinue} style={styles.continuePillTouchable}>
              <Text style={styles.continuePillText}>Continue</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(15,27,46,0.55)',
    letterSpacing: 2,
  },
  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  trailRow: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingVertical: 4,
  },
  trailChip: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.bg,
    overflow: 'hidden',
  },
  trailChipGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    marginHorizontal: 24,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  searchIconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchPillText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  featureCard: {
    height: 190,
    borderRadius: 22,
    overflow: 'hidden',
  },
  featureCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featureSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.65)',
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
    paddingHorizontal: 8,
    gap: 4,
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