/**
 * app/app-info/map.tsx
 *
 * App Info — "Map" tab (route: /app-info/map)
 * -------------------------------------------------
 * The 6 mobile-app features as a horizontal swipe carousel — one gradient
 * card per feature (plain ScrollView, snapToInterval for paging), with a
 * live "now viewing" description card and pagination dots below it.
 * Shares its header, colors, bottom nav, and data with the "Home" tab via
 * ./_shared — see that file for the full data set and the BottomNav's
 * cross-route navigation.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  FEATURES,
  Feature,
  AppInfoHeader,
  AppInfoFooter,
  BottomNav,
  sharedStyles,
} from '@/components/app-info/shared';

const { width: SCREEN_W } = Dimensions.get('window');

// Feature carousel card sizing — width leaves a peek of the next card.
const CAROUSEL_CARD_W = SCREEN_W * 0.72;
const CAROUSEL_CARD_H = 300;
const CAROUSEL_GAP = 14;

/* -------------------------------------------------------------------------- */
/* One card in the horizontal feature carousel                               */
/* -------------------------------------------------------------------------- */
function FeatureCarouselCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <LinearGradient
      colors={feature.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.carouselCard}
    >
      <View style={styles.carouselCardTopRow}>
        <Text style={styles.carouselCardNumber}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.carouselIconWrap}>
          <Ionicons name={feature.icon} size={22} color={COLORS.accent} />
        </View>
      </View>

      <View style={styles.carouselCardTextBlock}>
        <Text style={styles.carouselCardTitle}>{feature.title}</Text>
        <Text style={styles.carouselCardSubtitle}>{feature.subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

export default function AppInfoMapScreen() {
  const insets = useSafeAreaInsets();
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CAROUSEL_CARD_W + CAROUSEL_GAP));
    const clamped = Math.max(0, Math.min(FEATURES.length - 1, index));
    if (clamped !== activeCardIndex) setActiveCardIndex(clamped);
  };

  return (
    <View style={sharedStyles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppInfoHeader />

        {/* horizontal swipe carousel — one gradient card per feature */}
        <View style={sharedStyles.infoSection}>
          <View style={sharedStyles.infoLabelRow}>
            <Text style={sharedStyles.infoLabel}>MOBILE APP FEATURES</Text>
          </View>
          <Text style={sharedStyles.infoBody}>
            Five core building blocks that keep hikers connected and safe,
            from pre-hike prediction download to emergency SAR support.
            Swipe to explore each one.
          </Text>

          <View style={styles.activeFeatureCard}>
            <View style={styles.activeFeatureIconWrap}>
              <Ionicons
                name={FEATURES[activeCardIndex].icon}
                size={16}
                color={COLORS.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeFeatureTag}>NOW VIEWING</Text>
              <Text style={styles.activeFeatureDesc}>
                {FEATURES[activeCardIndex].subtitle}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CAROUSEL_CARD_W + CAROUSEL_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            style={styles.carouselScroll}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
          >
            {FEATURES.map((feature, i) => (
              <FeatureCarouselCard key={feature.title} feature={feature} index={i} />
            ))}
          </ScrollView>

          <View style={styles.carouselDotsRow}>
            {FEATURES.map((feature, i) => (
              <View
                key={feature.title}
                style={[styles.carouselDot, i === activeCardIndex && styles.carouselDotActive]}
              />
            ))}
          </View>
        </View>

        <AppInfoFooter />
      </ScrollView>

      <BottomNav activeTab="map" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Short description of the currently active slide — sits above the
  // carousel box as a small card, updates live as the user swipes
  // (title/subtitle inside each card itself stay untouched).
  activeFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 18,
  },
  activeFeatureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFeatureTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 3,
  },
  activeFeatureDesc: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: COLORS.textPrimary,
  },
  // Feature carousel — horizontal swipe of gradient cards. Bleeds past its
  // parent infoSection's padding (negative margin) so cards can peek off
  // the screen edge like the rest of the carousel's paging motion.
  carouselScroll: {
    marginHorizontal: -24,
  },
  carouselContent: {
    paddingHorizontal: 24,
    gap: CAROUSEL_GAP,
  },
  carouselCard: {
    width: CAROUSEL_CARD_W,
    height: CAROUSEL_CARD_H,
    borderRadius: 26,
    padding: 22,
    justifyContent: 'space-between',
  },
  carouselCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carouselCardNumber: {
    fontSize: 46,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: -1,
  },
  carouselIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCardTextBlock: {
    gap: 8,
  },
  carouselCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  carouselCardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.65)',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.pillBorder,
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: COLORS.accent,
  },
});
