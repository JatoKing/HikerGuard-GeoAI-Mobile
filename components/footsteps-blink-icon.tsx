/**
 * components/footsteps-blink-icon.tsx
 *
 * The JEJAK wordmark badge icon: a static two-footprint glyph where the
 * left foot lights up in the accent colour, then the right foot, back and
 * forth — no movement, just alternating colour emphasis.
 *
 * Ionicons only ships one "footsteps" glyph (both feet as a single path),
 * so there's no left/right piece to colour independently. This fakes it by
 * rendering the icon twice — once dim as a base layer, once accent-coloured
 * on top — each clipped to its own half-width window via overflow:hidden,
 * then animating each half's accent-layer opacity out of phase.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function FootstepsBlinkIcon({
  size = 30,
  accentColor,
  dimColor = 'rgba(15,27,46,0.18)',
}: {
  size?: number;
  accentColor: string;
  dimColor?: string;
}) {
  // 0 = left foot lit, 1 = right foot lit
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 500 })
      ),
      -1
    );
  }, []);

  const leftAccentStyle = useAnimatedStyle(() => ({ opacity: 1 - phase.value }));
  const rightAccentStyle = useAnimatedStyle(() => ({ opacity: phase.value }));

  const half = size / 2;

  return (
    <View style={{ width: size, height: size, flexDirection: 'row' }}>
      <View style={{ width: half, height: size, overflow: 'hidden' }}>
        <View style={{ width: size, height: size }}>
          <Ionicons name="footsteps" size={size} color={dimColor} />
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, leftAccentStyle]}>
            <Ionicons name="footsteps" size={size} color={accentColor} />
          </Animated.View>
        </View>
      </View>
      <View style={{ width: half, height: size, overflow: 'hidden' }}>
        <View style={{ width: size, height: size, marginLeft: -half }}>
          <Ionicons name="footsteps" size={size} color={dimColor} />
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, rightAccentStyle]}>
            <Ionicons name="footsteps" size={size} color={accentColor} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
