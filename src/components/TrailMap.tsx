import React, { useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { CameraRef, LngLatBounds } from '@maplibre/maplibre-react-native';

import type { TrailSegment } from '@/src/domain/trail';
import { RISK_CLASS_META } from '@/src/components/ConnectivityLegend';
import { isExpoGo } from '@/src/lib/expo-go';
import { MapUnavailablePlaceholder } from '@/src/components/MapUnavailablePlaceholder';

// Expo Go doesn't have MapLibre's native module compiled in, so importing it
// there crashes at module-load time and takes the whole screen down with it
// (see LiveHikeMap.tsx for the same guard). Only require it in builds that
// actually have the native code.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MapLibre: any = isExpoGo ? null : require('@maplibre/maplibre-react-native');

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Renders the pack's segments as coloured lines on a real 3D map (MapLibre +
 * OpenFreeMap vector tiles — free, no API key). The pitched camera plus the
 * "liberty" style's building extrusions give the map its 3D look.
 *
 * This does NOT satisfy Section 15's "reopen the downloaded route without a
 * network connection" requirement yet — that needs an offline basemap
 * strategy (cached/vector tiles), which is still the open decision from
 * Section 7's map spike (ADR). This is a first working map, not that spike.
 */
export function TrailMap({ segments }: { segments: TrailSegment[] }) {
  const cameraRef = useRef<CameraRef>(null);

  const sortedSegments = useMemo(
    () => segments.slice().sort((a, b) => a.segmentOrder - b.segmentOrder),
    [segments]
  );

  const points = useMemo(
    () => segments.flatMap((segment) => segment.geometry.coordinates),
    [segments]
  );

  if (points.length === 0) return null;
  if (isExpoGo) return <MapUnavailablePlaceholder />;

  const { Map, Camera, GeoJSONSource, Layer, Marker } = MapLibre;

  const trailhead = points[0];

  const bounds: LngLatBounds = points.reduce(
    (acc, [longitude, latitude]) => [
      Math.min(acc[0], longitude),
      Math.min(acc[1], latitude),
      Math.max(acc[2], longitude),
      Math.max(acc[3], latitude),
    ],
    [points[0][0], points[0][1], points[0][0], points[0][1]] as LngLatBounds
  );

  const handleMapReady = () => {
    cameraRef.current?.fitBounds(bounds, { padding: { top: 32, right: 32, bottom: 32, left: 32 } });
  };

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP_STYLE_URL} onDidFinishLoadingMap={handleMapReady}>
        <Camera ref={cameraRef} initialViewState={{ center: trailhead, zoom: 13, pitch: 55 }} />

        {sortedSegments.map((segment) => (
          <GeoJSONSource
            key={segment.segmentId}
            id={`route-${segment.segmentId}`}
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: segment.geometry.coordinates },
            }}
          >
            <Layer
              id={`route-line-${segment.segmentId}`}
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': RISK_CLASS_META[segment.riskClass].color, 'line-width': 5 }}
            />
          </GeoJSONSource>
        ))}

        <Marker id="trailhead" lngLat={trailhead}>
          <View style={[styles.pin, { backgroundColor: RISK_CLASS_META.likely_covered.color }]} />
        </Marker>
      </Map>
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
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});