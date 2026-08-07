import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, type LatLng } from 'react-native-maps';

import type { TrailSegment } from '@/src/domain/trail';
import { RISK_CLASS_META } from '@/src/components/ConnectivityLegend';

/**
 * Renders the pack's segments as coloured polylines on a real map — Apple
 * Maps on iOS / Google Maps on Android via react-native-maps' default
 * provider, so it needs a network connection to fetch map tiles.
 *
 * This does NOT satisfy Section 15's "reopen the downloaded route without a
 * network connection" requirement yet — that needs an offline basemap
 * strategy (cached/vector tiles), which is still the open decision from
 * Section 7's map spike (ADR). This is a first working map, not that spike.
 */
export function TrailMap({ segments }: { segments: TrailSegment[] }) {
  const mapRef = useRef<MapView>(null);

  const points: LatLng[] = segments.flatMap((segment) =>
    segment.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }))
  );

  if (points.length === 0) return null;

  const initialLatitude = points[0].latitude;
  const initialLongitude = points[0].longitude;

  // Real trail routes are rarely square — some run long and narrow (e.g.
  // 8km east-west, 1km north-south). A hand-computed region with a fixed
  // padding multiplier doesn't account for that shape against the map
  // view's own aspect ratio, so it can zoom to the wrong level and crop
  // most of the route out of view. fitToCoordinates asks the map itself to
  // work out the correct zoom for these exact points once it knows its
  // real pixel dimensions, which is the part a manual region can't see.
  const handleMapReady = () => {
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
      animated: false,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: initialLatitude,
          longitude: initialLongitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={handleMapReady}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={points[0]} title="Trailhead" pinColor={RISK_CLASS_META.likely_covered.color} />
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
              strokeWidth={5}
            />
          ))}
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
});
