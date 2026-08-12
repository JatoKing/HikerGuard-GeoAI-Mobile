import React from 'react';

import { MapUnavailablePlaceholder } from '@/src/components/MapUnavailablePlaceholder';
import type { TrailSegment } from '@/src/domain/trail';

export type LatLng = { latitude: number; longitude: number };

export function LiveHikeMap({
  segments: _segments,
  walkedPath: _walkedPath,
  currentPosition: _currentPosition,
}: {
  segments: TrailSegment[];
  walkedPath: LatLng[];
  currentPosition: LatLng | null;
}) {
  return <MapUnavailablePlaceholder />;
}
