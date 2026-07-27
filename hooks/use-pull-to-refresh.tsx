/**
 * hooks/use-pull-to-refresh.ts
 *
 * Reusable pull-to-refresh hook — works on ANY screen with a ScrollView
 * or FlatList. Pass in your own data-fetching function; the hook handles
 * the `refreshing` boolean state and wires up a ready-to-use
 * <RefreshControl> element styled to match the app's accent color.
 *
 * ------------------------------------------------------------------
 * USAGE (any screen):
 *
 *   import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
 *
 *   export default function SomeScreen() {
 *     const { refreshControl } = usePullToRefresh(async () => {
 *       await fetchLatestTrailData(); // whatever this screen needs to refetch
 *     });
 *
 *     return (
 *       <ScrollView refreshControl={refreshControl}>
 *         {/* content *\/}
 *       </ScrollView>
 *     );
 *   }
 *
 * Works the same way inside a <FlatList refreshControl={refreshControl} />.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';

const ACCENT = '#4ADE80';

export function usePullToRefresh(
  onRefreshFn: () => Promise<void> | void,
  options?: Partial<RefreshControlProps>
) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshFn();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshFn]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={ACCENT} // iOS spinner color
      colors={[ACCENT]} // Android spinner color
      {...options}
    />
  );

  return { refreshing, onRefresh, refreshControl };
}