import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { CameraRef, LngLat } from '@maplibre/maplibre-react-native';

import type { TrailSegment } from '@/src/domain/trail';
import { RISK_CLASS_META } from '@/src/components/ConnectivityLegend';
import { isExpoGo } from '@/src/lib/expo-go';
import { MapUnavailablePlaceholder } from '@/src/components/MapUnavailablePlaceholder';

// Expo Go doesn't have MapLibre's native module compiled in, so importing it
// there crashes at module-load time and takes the whole screen down with it
// (see TrailMap.tsx for the same guard). Only require it in builds that
// actually have the native code.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MapLibre: any = isExpoGo ? null : require('@maplibre/maplibre-react-native');

export type LatLng = { latitude: number; longitude: number };

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const toLngLat = (point: LatLng): LngLat => [point.longitude, point.latitude];

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
  const cameraRef = useRef<CameraRef>(null);
  const hasCenteredRef = useRef(false);

  const currentLngLat = currentPosition ? toLngLat(currentPosition) : null;

  useEffect(() => {
    if (isExpoGo) return;
    if (!currentLngLat) return;
    cameraRef.current?.easeTo({
      center: currentLngLat,
      zoom: 16,
      pitch: 55,
      duration: hasCenteredRef.current ? 450 : 0,
    });
    hasCenteredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPosition?.latitude, currentPosition?.longitude]);

  const walkedLngLats = useMemo(() => walkedPath.map(toLngLat), [walkedPath]);

  if (isExpoGo) return <MapUnavailablePlaceholder />;

  const { Map, Camera, GeoJSONSource, Layer, Marker } = MapLibre;

  const fallback = segments[0]?.geometry.coordinates[0];
  const initialCenter: LngLat = currentLngLat ?? fallback ?? [0, 0];

  const sortedSegments = segments.slice().sort((a, b) => a.segmentOrder - b.segmentOrder);

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP_STYLE_URL}>
        <Camera ref={cameraRef} initialViewState={{ center: initialCenter, zoom: 16, pitch: 55 }} />

        {sortedSegments.map((segment) => (
          <GeoJSONSource
            key={segment.segmentId}
            id={`planned-${segment.segmentId}`}
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: segment.geometry.coordinates },
            }}
          >
            <Layer
              id={`planned-line-${segment.segmentId}`}
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': RISK_CLASS_META[segment.riskClass].color,
                'line-width': 3,
                'line-dasharray': [2, 1.5],
              }}
            />
          </GeoJSONSource>
        ))}

        {walkedLngLats.length > 1 && (
          <GeoJSONSource
            id="walked-path"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: walkedLngLats },
            }}
          >
            <Layer
              id="walked-path-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#2563EB', 'line-width': 5 }}
            />
          </GeoJSONSource>
        )}

        {currentLngLat && (
          <Marker id="current-position" lngLat={currentLngLat} anchor="center">
            <View style={styles.currentDotRing}>
              <View style={styles.currentDot} />
            </View>
          </Marker>
        )}
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
