import type { ItineraryItem } from '@/types';
import { findPlace } from '@/mock';

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Resolves a plan item's coordinates: AI items carry their own; mock items
 *  resolve via placeId. Returns null when neither is available (no pin). */
export function getItemCoords(item: ItineraryItem): Coords | null {
  if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
    return { latitude: item.latitude, longitude: item.longitude };
  }
  const place = findPlace(item.placeId);
  if (place) return { latitude: place.latitude, longitude: place.longitude };
  return null;
}
