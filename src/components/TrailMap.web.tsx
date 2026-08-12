import React from 'react';

import { MapUnavailablePlaceholder } from '@/src/components/MapUnavailablePlaceholder';
import type { TrailSegment } from '@/src/domain/trail';

export function TrailMap({ segments: _segments }: { segments: TrailSegment[] }) {
  return <MapUnavailablePlaceholder />;
}
