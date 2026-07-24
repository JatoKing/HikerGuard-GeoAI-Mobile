/**
 * app/index.tsx
 *
 * HikerGuard GeoAI — Landing / Login Screen
 * -------------------------------------------------
 * Background is now the traveler.json Lottie animation
 * (hiker walking cycle + trail + rocks + plants, looping).
 *
 * Required packages (run in your project root):
 *   npx expo install expo-linear-gradient react-native-reanimated expo-blur lottie-react-native
 *   npx expo install @expo/vector-icons
 *
 * If react-native-reanimated is not yet configured, add this to babel.config.js
 * plugins array: 'react-native-reanimated/plugin'  (must be listed LAST)
 *
 * traveler.json should live at: assets/traveler.json
 * (relative to project root — matches the require() path below)
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = {
  overlayTop: 'rgba(15, 27, 46, 0.55)',
  overlayBottom: 'rgba(11, 21, 36, 0.92)',
  accent: '#4ADE80', // GeoAI signal green
  accentSoft: 'rgba(74, 222, 128, 0.35)',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  textPrimary: '#F5F7FA',
  textMuted: 'rgba(245, 247, 250, 0.65)',
};

/* -------------------------------------------------------------------------- */
/* Animated Login Button                                                      */
/* -------------------------------------------------------------------------- */
function LoginButton({ onPress, label, filled = true }: { onPress: () => void; label: string; filled?: boolean }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    if (filled) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={style}>
      {filled && (
        <Animated.View style={[styles.buttonGlow, glowStyle]} pointerEvents="none" />
      )}
      <Pressable
        onPressIn={() => (scale.value = withTiming(0.96, { duration: 100 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 150 }))}
        onPress={onPress}
        style={({ pressed }) => [
          filled ? styles.buttonFilled : styles.buttonGhost,
          pressed && { opacity: 0.9 },
        ]}
      >
        {filled ? (
          <>
            <Ionicons name="log-in-outline" size={20} color="#0B1524" style={{ marginRight: 8 }} />
            <Text style={styles.buttonFilledText}>{label}</Text>
          </>
        ) : (
          <Text style={styles.buttonGhostText}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Screen                                                                 */
/* -------------------------------------------------------------------------- */
export default function LandingScreen() {
  const router = useRouter();

  // entrance animations
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(20);
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(30);

  useEffect(() => {
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
    titleTranslate.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    cardOpacity.value = withDelay(500, withTiming(1, { duration: 700 }));
    cardTranslate.value = withDelay(500, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  const handleLogin = () => {
    // TODO: wire up your real auth flow, then:
    router.replace('/(tabs)');
  };

  const handleGuest = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Lottie animation as full-screen background, zoomed out to show more of the scene */}
      <View style={[StyleSheet.absoluteFill, styles.lottieClip]}>
        <LottieView
          source={require('../assets/traveler.json')}
          autoPlay
          loop
          speed={0.5}
          resizeMode="contain"
          style={styles.lottie}
        />
      </View>

      {/* Dark gradient overlay so text/buttons stay legible over the animation */}
      <LinearGradient
        colors={[COLORS.overlayTop, 'rgba(15,27,46,0.25)', COLORS.overlayBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* title block */}
        <Animated.View style={[styles.titleBlock, titleStyle]}>
          <Text style={styles.brandName}>
            Hiker<Text style={{ color: COLORS.accent }}>Guard</Text>
          </Text>
          <View style={styles.tagRow}>
            <Text style={styles.tagline}>GeoAI Trail Safety, in your pocket</Text>
          </View>
        </Animated.View>

        {/* glass login card */}
        <Animated.View style={cardStyle}>
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 60} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Ready for the trail?</Text>
              <Text style={styles.cardSubtitle}>
                Real-time terrain AI, offline maps, and emergency geo-alerts —
                sign in to sync your route.
              </Text>

              <View style={{ height: 20 }} />

              <LoginButton label="Sign In" onPress={handleLogin} filled />
              <View style={{ height: 12 }} />
              <LoginButton label="Continue as Guest" onPress={handleGuest} filled={false} />

              <Text style={styles.footNote}>
                By continuing, you agree to our Terms & Privacy Policy.
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1524',
  },
  lottieClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    // Bump this up/down to zoom in/out further.
    // 1.0 = exact "contain" fit (most zoomed out, may show letterbox gaps).
    // Higher values crop more but fill more of the screen.
    width: SCREEN_W * 1.6,
    height: SCREEN_H * 1.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 110,
    paddingBottom: 40,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 0,
  },
  brandName: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  cardInner: {
    padding: 24,
    backgroundColor: COLORS.glass,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textMuted,
  },
  buttonGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
  },
  buttonFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    borderRadius: 16,
  },
  buttonFilledText: {
    color: '#0B1524',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  buttonGhostText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  footNote: {
    fontSize: 11,
    color: 'rgba(245,247,250,0.4)',
    textAlign: 'center',
    marginTop: 16,
  },
});