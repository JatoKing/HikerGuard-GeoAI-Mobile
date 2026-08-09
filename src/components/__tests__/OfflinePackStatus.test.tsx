import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { OfflinePackStatus } from '@/src/components/OfflinePackStatus';
import type { TrailPack } from '@/src/domain/trail';

function makePack(overrides: Partial<TrailPack['model']> = {}): TrailPack {
  return {
    schemaVersion: 'trail-pack-v1',
    trailId: 'test-trail',
    name: 'Test Trail',
    packVersion: '2026-08-06T00:00:00Z',
    generatedAt: '2026-08-06T00:00:00Z',
    stage: 'route_only',
    predictionAvailable: false,
    model: {
      modelVersion: null,
      validationLevel: 'route_geometry_only',
      intendedUse: 'navigation_development',
      fieldValidated: false,
      labelSource: 'AllTrails GPX export',
      labelRelease: '2026',
      labelResolutionM: 0,
      predictionSupportM: 0,
      approvedForMobileWarning: false,
      ...overrides,
    },
    segments: [],
    integrity: { algorithm: 'sha256', checksum: 'abc' },
  };
}

describe('OfflinePackStatus', () => {
  it('shows a route_only pack has no model, not a blank/crashed field', () => {
    render(<OfflinePackStatus pack={makePack()} />);
    expect(screen.getByText('None — geometry only')).toBeTruthy();
  });

  it('shows the real model version for a model-backed pack', () => {
    render(<OfflinePackStatus pack={makePack({ modelVersion: 'connectivity-transfer-v0.1.0' })} />);
    expect(screen.getByText('connectivity-transfer-v0.1.0')).toBeTruthy();
  });

  it('discloses the planning-prediction disclaimer required by Section 3', () => {
    render(<OfflinePackStatus pack={makePack()} />);
    expect(
      screen.getByText('This pack is a planning prediction, not confirmed coverage.', { exact: false })
    ).toBeTruthy();
  });

  it('only shows the downloaded-to-device row when downloadedAt is provided', () => {
    render(<OfflinePackStatus pack={makePack()} />);
    expect(screen.queryByText('Downloaded to this device')).toBeNull();

    render(<OfflinePackStatus pack={makePack()} downloadedAt="2026-08-06T00:00:00Z" />);
    expect(screen.getByText('Downloaded to this device')).toBeTruthy();
  });
});
