/**
 * app/index.tsx
 *
 * HikerGuard GeoAI — Landing / Login Screen
 * -------------------------------------------------
 * Background is the traveler.json Lottie animation
 * (hiker walking cycle + trail + rocks + plants, looping).
 *
 * The login form is an OVERLAY within this same screen (not a separate
 * route) — tapping "Sign In" slides a full-screen login sheet up from
 * the bottom over the landing content, so it reads as one continuous
 * page rather than a navigation transition.
 *
 * Required packages (run in your project root):
 *   npx expo install react-native-reanimated expo-blur lottie-react-native
 *   npx expo install @expo/vector-icons
 *
 * If react-native-reanimated is not yet configured, add this to babel.config.js
 * plugins array: 'react-native-reanimated/plugin'  (must be listed LAST)
 *
 * traveler.json should live at: assets/traveler.json
 * (relative to project root — matches the require() path below)
 *
 * login-form.tsx should live at: components/login-form.tsx
 * (NOT inside app/ — it's a plain component, not a route)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import LoginForm from '../components/login-form';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = {
  accent: '#4ADE80', // GeoAI signal green
  accentSoft: 'rgba(74, 222, 128, 0.35)',
  glass: 'rgba(15, 27, 46, 0.04)',
  glassBorder: 'rgba(15, 27, 46, 0.12)',
  textPrimary: '#0F1B2E',
  textMuted: 'rgba(15, 27, 46, 0.6)',
};

/* -------------------------------------------------------------------------- */
/* Animated Login Button                                                      */
/* -------------------------------------------------------------------------- */
function LoginButton({ onPress, label, filled = true }: { onPress: () => void; label: string; filled?: boolean }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.4);
  const [pressed, setPressed] = useState(false);

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
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 100 });
          setPressed(true);
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
          setPressed(false);
        }}
        onPress={onPress}
        style={[
          filled ? styles.buttonFilled : styles.buttonGhost,
          pressed && styles.pressedDim,
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
  const params = useLocalSearchParams<{ openLogin?: string }>();

  // entrance animations
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(20);
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(30);

  // login overlay: starts fully off-screen at the bottom, slides up to
  // cover the whole screen when "Sign In" is tapped.
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const loginTranslateY = useSharedValue(SCREEN_H);

  // compass needle wobble — base heading is -45deg (pointing up), oscillates
  // a few degrees either side so it reads as a compass settling/searching.
  const compassRotate = useSharedValue(-45);

  useEffect(() => {
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
    titleTranslate.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    cardOpacity.value = withDelay(500, withTiming(1, { duration: 700 }));
    cardTranslate.value = withDelay(500, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));

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

  // If we arrived here with ?openLogin=true (e.g. from the app-info page's
  // "Continue" button), auto-open the login overlay instead of waiting for
  // the user to tap "Sign In" themselves.
  useEffect(() => {
    if (params.openLogin === 'true') {
      openLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.openLogin]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  const loginOverlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: loginTranslateY.value }],
  }));

  const openLogin = () => {
    setIsLoginVisible(true);
    loginTranslateY.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
  };

  const closeLogin = () => {
    loginTranslateY.value = withTiming(
      SCREEN_H,
      { duration: 380, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setIsLoginVisible)(false);
        }
      }
    );
  };

  const handleLogin = () => {
    openLogin();
  };

  const handleGuest = () => {
    router.push('/app-info');
  };

  const handleLoginSubmit = () => {
    // TODO: wire up your real auth flow, then:
    router.replace('/(tabs)');
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    // TODO: wire up real OAuth flow for this provider, then:
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

      <View style={styles.content}>
        {/* title block */}
        <Animated.View style={[styles.titleBlock, titleStyle]}>
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName}>JEJ</Text>
            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeRing}>
                <Animated.View style={compassStyle}>
                  <Ionicons name="navigate" size={22} color={COLORS.accent} />
                </Animated.View>
              </View>
            </View>
            <Text style={styles.brandName}>K</Text>
          </View>

          <View style={styles.tagRow}>
            <Text style={styles.tagline}>
              <Text style={{ color: COLORS.accent }}>GeoAI</Text>-Powered Hiking Connectivity Intelligence
            </Text>
          </View>
        </Animated.View>

        {/* glass login card */}
        <Animated.View style={cardStyle}>
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 60} tint="light" style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Ready for the trail?</Text>
              <Text style={styles.cardSubtitle}>
                Offline trail maps and connectivity planning predictions —
                sign in to sync your route.
              </Text>

              <View style={{ height: 20 }} />

              <LoginButton label="Sign In" onPress={handleLogin} filled />
              <View style={{ height: 12 }} />
              <LoginButton label="Continue as Guest" onPress={handleGuest} filled={false} />

              <Text style={styles.footNote}>
                Demo mode — no account required yet. By continuing, you agree
                to our Terms & Privacy Policy.
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      </View>

      {/* Login overlay — slides up from the bottom to cover the whole screen.
          Always mounted (once opened) so the reverse (close) animation is smooth;
          pointerEvents is toggled off entirely once fully closed. */}
      {isLoginVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.loginOverlay, loginOverlayStyle]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <LoginForm
              onClose={closeLogin}
              onSubmit={handleLoginSubmit}
              onSocialLogin={handleSocialLogin}
            />
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  pressedDim: {
    opacity: 0.9,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandBadge: {
    width: 30,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -3,
    marginRight: 3,
    marginTop: 2,
  },
  brandBadgeRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 6,
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
    backgroundColor: 'rgba(15,27,46,0.03)',
  },
  buttonGhostText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  footNote: {
    fontSize: 11,
    color: 'rgba(15,27,46,0.45)',
    textAlign: 'center',
    marginTop: 16,
  },
  loginOverlay: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    elevation: 10, // Android
  },
});