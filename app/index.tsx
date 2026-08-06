/**
 * app/index.tsx
 *
 * HikerGuard GeoAI — Loading / Splash Screen
 * -------------------------------------------------
 * This IS the app's root route ("/") — Expo Router always opens
 * app/index.tsx first on a cold start, regardless of anchor settings.
 * That's why the splash content lives here, and the actual landing UI
 * has been moved to app/home.tsx (navigated to below).
 *
 * Centerpiece: a 3D-styled location pin standing above a flattened
 * elliptical "disc" — the disc IS the 0–100% progress indicator (not a
 * ring wrapping the pin). Then navigates to /home.
 *
 * Required packages:
 *   npx expo install react-native-svg
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Ellipse, G, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';

const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#0F1B2E',
  textMuted: 'rgba(15, 27, 46, 0.55)',
  accent: '#4ADE80',
  trackBg: '#D8DEE5',
};

const PIN_SIZE = 140;

// The disc is a perfect circle, flattened visually via a Y-scale transform
// (giving the "viewed from a slight angle, lying flat on the ground" look).
// Progress math is computed on the UNSCALED circle radius, so the percentage
// stays perfectly accurate regardless of how flat the ellipse looks.
const DISC_CANVAS = 200;
const DISC_STROKE = 16;
const DISC_RADIUS = (DISC_CANVAS - DISC_STROKE) / 2 - 20; // small margin so stroke isn't clipped
const DISC_CIRCUMFERENCE = 2 * Math.PI * DISC_RADIUS;
const DISC_FLATTEN = 0.32; // how "flat" the ellipse looks — lower = flatter

/* -------------------------------------------------------------------------- */
/* 3D-styled location pin (gradient body + glossy highlight + drop shadow)    */
/* -------------------------------------------------------------------------- */
function Pin3D({ size = PIN_SIZE }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 110">
      <Defs>
        {/* main body — light green top-left to deep green bottom-right, gives volume */}
        <LinearGradient id="pinBody" x1="20%" y1="10%" x2="80%" y2="95%">
          <Stop offset="0%" stopColor="#86EFAC" />
          <Stop offset="45%" stopColor="#4ADE80" />
          <Stop offset="100%" stopColor="#15803D" />
        </LinearGradient>

        {/* inner hole — recessed, darker center fading to a lighter rim */}
        <RadialGradient id="pinHole" cx="40%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#F0FDF4" />
          <Stop offset="55%" stopColor="#DCFCE7" />
          <Stop offset="100%" stopColor="#86EFAC" />
        </RadialGradient>
      </Defs>

      {/* pin body (teardrop) */}
      <Path
        d="M50,8 C31,8 16,23 16,42 C16,66 50,100 50,100 C50,100 84,66 84,42 C84,23 69,8 50,8 Z"
        fill="url(#pinBody)"
      />

      {/* glossy highlight near the top-left of the pin's head */}
      <Ellipse cx="36" cy="28" rx="12" ry="8" fill="#FFFFFF" opacity={0.35} />

      {/* inner circle (the classic pin "hole"), recessed 3D look */}
      <Circle cx="50" cy="42" r="16" fill="url(#pinHole)" />
      <Circle cx="50" cy="42" r="16" fill="none" stroke="#15803D" strokeWidth={1} strokeOpacity={0.3} />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3D flattened disc — doubles as the 0–100% progress indicator              */
/* -------------------------------------------------------------------------- */
function Disc3D({ progress }: { progress: number }) {
  const strokeDashoffset = DISC_CIRCUMFERENCE - (DISC_CIRCUMFERENCE * progress) / 100;
  const center = DISC_CANVAS / 2;

  return (
    <Svg width={DISC_CANVAS} height={DISC_CANVAS * DISC_FLATTEN + DISC_STROKE * 2}>
      <Defs>
        {/* disc surface — light top edge fading to a darker bottom, like a lit coin */}
        <LinearGradient id="discGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F0F2F5" />
          <Stop offset="55%" stopColor="#D8DEE5" />
          <Stop offset="100%" stopColor="#B7BFC9" />
        </LinearGradient>

        {/* progress fill — glossy green */}
        <LinearGradient id="discProgressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#86EFAC" />
          <Stop offset="55%" stopColor="#4ADE80" />
          <Stop offset="100%" stopColor="#22A85C" />
        </LinearGradient>

        {/* soft shadow under the whole disc */}
        <RadialGradient id="discShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="55%" stopColor="#0F1B2E" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#0F1B2E" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* the flattening happens here — everything inside this <G> is drawn as
          a perfect circle, then squashed vertically to read as a 3D ellipse */}
      <G transform={`translate(${center}, ${(DISC_CANVAS * DISC_FLATTEN) / 2 + DISC_STROKE}) scale(1, ${DISC_FLATTEN})`}>
        {/* ground shadow, sits just beneath the disc */}
        <Circle cx={0} cy={DISC_STROKE * 2.5} r={DISC_RADIUS + DISC_STROKE} fill="url(#discShadow)" />

        {/* track — the un-filled part of the disc */}
        <Circle
          cx={0}
          cy={0}
          r={DISC_RADIUS}
          stroke="url(#discGradient)"
          strokeWidth={DISC_STROKE}
          fill="none"
        />

        {/* progress fill */}
        <Circle
          cx={0}
          cy={0}
          r={DISC_RADIUS}
          stroke="url(#discProgressGradient)"
          strokeWidth={DISC_STROKE}
          strokeLinecap="round"
          strokeDasharray={DISC_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          rotation={-90}
          origin="0, 0"
        />

        {/* glossy highlight following the progress fill */}
        <Circle
          cx={0}
          cy={0}
          r={DISC_RADIUS - DISC_STROKE / 2 + 2}
          stroke="#FFFFFF"
          strokeOpacity={0.4}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={DISC_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          rotation={-90}
          origin="0, 0"
        />
      </G>
    </Svg>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // slightly uneven increments so it doesn't feel robotic
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next >= 100 ? 100 : next;
      });
    }, 90);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100 && !hasNavigated.current) {
      hasNavigated.current = true;
      const timeout = setTimeout(() => {
        router.replace('/home');
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.pinWrap}>
        <Pin3D />
      </View>

      {/* the disc sits BELOW the pin, not around it */}
      <View style={styles.discWrap}>
        <Disc3D progress={progress} />
      </View>

      <Text style={styles.progressPercent}>{progress}%</Text>

      <View style={{ height: 28 }} />

      <Text style={styles.brandName}>JEJAK</Text>
      <Text style={styles.tagline}>
        <Text style={{ color: COLORS.accent }}>GeoAI</Text> Connectivity Intelligence
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  pinWrap: {
    marginBottom: -22, // pulls the pin's point slightly into the disc
    zIndex: 2,
  },
  discWrap: {
    zIndex: 1,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
    letterSpacing: 0.5,
  },
});