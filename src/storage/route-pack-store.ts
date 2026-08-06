import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TrailPack } from '@/src/domain/trail';

/**
 * Interim key-value persistence for downloaded trail packs, so a pack
 * survives an app restart / airplane-mode reopen (handoff contract Section
 * 8 + WP2 definition of done) before WP3's SQLite `route_pack` table and
 * migrations exist. Route-pack-store.ts keeps its name/location from the
 * recommended structure (Section 6) so swapping this AsyncStorage
 * implementation for SQLite later doesn't require touching call sites.
 */
function storageKey(trailId: string): string {
  return `route_pack:${trailId}`;
}

export async function loadStoredPack(trailId: string): Promise<TrailPack | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(trailId));
    if (!raw) return null;
    return JSON.parse(raw) as TrailPack;
  } catch {
    return null;
  }
}

export async function saveStoredPack(pack: TrailPack): Promise<void> {
  await AsyncStorage.setItem(storageKey(pack.trailId), JSON.stringify(pack));
}

export async function removeStoredPack(trailId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(trailId));
}
