import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { MapUnavailablePlaceholder } from '@/src/components/MapUnavailablePlaceholder';

describe('MapUnavailablePlaceholder', () => {
  it('explains why the map is unavailable rather than rendering a blank area', async () => {
    render(<MapUnavailablePlaceholder />);
    // Ionicons loads its font asynchronously; wait for that state update to
    // settle so it doesn't fire after this test has already finished.
    expect(
      await screen.findByText('Map preview needs a development build — not available in Expo Go')
    ).toBeTruthy();
  });
});
