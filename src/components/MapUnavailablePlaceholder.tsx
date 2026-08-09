import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Shown instead of the real MapLibre map when running in Expo Go, which
 * can't load MapLibre's native module. Swapped for the real map
 * automatically once running in a development/standalone build.
 */
export function MapUnavailablePlaceholder() {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={28} color="rgba(15,27,46,0.35)" />
      <Text style={styles.text}>
        Map preview needs a development build — not available in Expo Go
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,27,46,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(15,27,46,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(15,27,46,0.55)',
  },
});