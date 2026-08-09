import { toNetworkObservationState } from '@/src/domain/hike';

describe('toNetworkObservationState', () => {
  it('maps true to online', () => {
    expect(toNetworkObservationState(true)).toBe('online');
  });

  it('maps false to offline', () => {
    expect(toNetworkObservationState(false)).toBe('offline');
  });

  it('maps null (NetInfo has not resolved yet) to unknown', () => {
    expect(toNetworkObservationState(null)).toBe('unknown');
  });
});
