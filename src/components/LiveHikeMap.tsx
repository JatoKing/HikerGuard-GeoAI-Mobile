import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, type LatLng } from 'react-native-maps';

import type { TrailSegment } from '@/src/domain/trail';
import { RISK_CLASS_META } from '@/src/components/ConnectivityLegend';

/**
 * A Strava-style live tracking map for Active Hike: the planned route
 * (dashed, coloured by risk_class) as a reference layer, the actual
 * walked-so-far path as a solid line, and a marker for the latest
 * recorded position that the camera follows as new points come in.
 *
 * Same online-tile caveat as TrailMap — this needs a network connection
 * for map tiles, which is separate from GPS recording itself (that keeps
 * working offline; only the visual basemap doesn't render without signal).
 */
export function LiveHikeMap({
  segments,
  walkedPath,
  currentPosition,
}: {
  segments: TrailSegment[];
  walkedPath: LatLng[];
  currentPosition: LatLng | null;
}) {
  const mapRef = useRef<MapView>(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!currentPosition) return;
    mapRef.current?.animateToRegion(
      {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      hasCenteredRef.current ? 450 : 0
    );
    hasCenteredRef.current = true;
  }, [currentPosition]);

  const fallback = segments[0]?.geometry.coordinates[0];
  const initialRegion = currentPosition
    ? { ...currentPosition, latitudeDelta: 0.006, longitudeDelta: 0.006 }
    : fallback
      ? { latitude: fallback[1], longitude: fallback[0], latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : { latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {segments
          .slice()
          .sort((a, b) => a.segmentOrder - b.segmentOrder)
          .map((segment) => (
            <Polyline
              key={segment.segmentId}
              coordinates={segment.geometry.coordinates.map(([longitude, latitude]) => ({
                latitude,
                longitude,
              }))}
              strokeColor={RISK_CLASS_META[segment.riskClass].color}
              strokeWidth={3}
              lineDashPattern={[6, 5]}
            />
          ))}

        {walkedPath.length > 1 && (
          <Polyline coordinates={walkedPath} strokeColor="#2563EB" strokeWidth={5} />
        )}

        {currentPosition && (
          <Marker coordinate={currentPosition} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.currentDotRing}>
              <View style={styles.currentDot} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  currentDotRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37,99,235,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
