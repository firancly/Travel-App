import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItineraryDay, ItineraryItem, Place } from '@/types';
import { itinerary as mockItinerary, swapPool } from '@/mock';
import { addMinutes } from '@/utils/time';
import { generateItinerary, swapStop, itineraryApiConfigured, type GeneratePrefs } from '@/services/itinerary';
import { usePrefsStore } from '@/store/usePrefsStore';
import { getItemCoords, type Coords } from '@/utils/coords';

/** Anchor for a proximity-aware swap: midpoint of the item's neighbors (whichever
 *  have coords), else the item's own coord, else undefined (city-wide fallback). */
function swapAnchor(items: ItineraryItem[], itemId: string): Coords | undefined {
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return undefined;

  const prevCoord = idx > 0 ? getItemCoords(items[idx - 1]) : null;
  const nextCoord = idx < items.length - 1 ? getItemCoords(items[idx + 1]) : null;

  if (prevCoord && nextCoord) {
    return {
      latitude: (prevCoord.latitude + nextCoord.latitude) / 2,
      longitude: (prevCoord.longitude + nextCoord.longitude) / 2,
    };
  }
  if (prevCoord) return prevCoord;
  if (nextCoord) return nextCoord;
  return getItemCoords(items[idx]) ?? undefined;
}

export type PlanSource = 'mock' | 'ai';

let idCounter = 0;
const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idCounter++}`;

/** Fresh deep copy of the seed itinerary so persisted edits never mutate mock data. */
const seedDays = (): ItineraryDay[] =>
  mockItinerary.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) }));

function sortByTime(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

interface PlanState {
  days: ItineraryDay[];
  source: PlanSource;
  generating: boolean;
  error: string | null;

  addPlaceToPlan: (place: Place) => number; // returns the day number it landed in
  smartSwap: (dayNumber: number, itemId: string) => Promise<void>;
  reorderDayItems: (dayNumber: number, items: ItineraryItem[]) => void;
  removeItem: (dayNumber: number, itemId: string) => void;
  isPlaceInPlan: (placeId: string) => boolean;
  /** Generate a fresh plan via the AI proxy. Returns true on success; keeps the
   *  current plan as a fallback on failure. */
  generatePlan: (prefs: GeneratePrefs) => Promise<boolean>;
  resetPlan: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      days: seedDays(),
      source: 'mock',
      generating: false,
      error: null,

      addPlaceToPlan: (place) => {
        const { days } = get();
        // Drop it on the day with the fewest stops to keep things balanced.
        let targetIdx = 0;
        days.forEach((d, idx) => {
          if (d.items.length < days[targetIdx].items.length) targetIdx = idx;
        });
        const target = days[targetIdx];
        const last = target.items[target.items.length - 1];
        const time = last ? addMinutes(last.time, last.durationMin) : '10:00';

        const newItem: ItineraryItem = {
          id: genId('add'),
          time,
          title: place.name,
          description: place.description,
          durationMin: place.durationMin,
          category: place.category,
          placeId: place.id,
        };

        set({
          days: days.map((d, idx) =>
            idx === targetIdx ? { ...d, items: sortByTime([...d.items, newItem]) } : d,
          ),
        });
        return target.day;
      },

      smartSwap: async (dayNumber, itemId) => {
        const { days } = get();
        const day = days.find((d) => d.day === dayNumber);
        const item = day?.items.find((i) => i.id === itemId);
        if (!day || !item) return;

        const usedTitles = days.flatMap((d) => d.items.map((i) => i.title));

        const applyReplacement = (replacement: ItineraryItem) => {
          set({
            days: get().days.map((d) =>
              d.day === dayNumber
                ? { ...d, items: d.items.map((i) => (i.id === itemId ? replacement : i)) }
                : d,
            ),
          });
        };

        if (itineraryApiConfigured()) {
          try {
            const destination = usePrefsStore.getState().destination;
            const anchor = swapAnchor(day.items, itemId);
            const swapped = await swapStop(
              destination,
              item.category,
              usedTitles,
              item.time,
              anchor?.latitude,
              anchor?.longitude,
            );
            applyReplacement({
              ...swapped,
              id: item.id, // keep the same id + slot so the row can animate in place
              time: item.time,
            });
            return;
          } catch {
            // fall through to the local mock pool below
          }
        }

        const usedSet = new Set(usedTitles);
        const sameCategory = swapPool.filter((s) => s.category === item.category);
        const fresh = sameCategory.filter((s) => !usedSet.has(s.title));
        const pool = fresh.length ? fresh : sameCategory;
        if (pool.length === 0) return;

        const pick = pool[Math.floor(Math.random() * pool.length)];
        applyReplacement({
          ...pick,
          id: item.id,
          time: item.time,
        });
      },

      reorderDayItems: (dayNumber, items) =>
        set((s) => ({
          days: s.days.map((d) => (d.day === dayNumber ? { ...d, items } : d)),
        })),

      removeItem: (dayNumber, itemId) =>
        set((s) => ({
          days: s.days.map((d) =>
            d.day === dayNumber
              ? { ...d, items: d.items.filter((i) => i.id !== itemId) }
              : d,
          ),
        })),

      isPlaceInPlan: (placeId) =>
        get().days.some((d) => d.items.some((i) => i.placeId === placeId)),

      generatePlan: async (prefs) => {
        set({ generating: true, error: null });
        try {
          const days = await generateItinerary(prefs);
          set({ days, source: 'ai', generating: false });
          return true;
        } catch (e: any) {
          // Keep the existing plan as a fallback; surface a soft error.
          set({ generating: false, error: String(e?.message ?? 'generation failed') });
          return false;
        }
      },

      resetPlan: () => set({ days: seedDays(), source: 'mock', error: null }),
    }),
    {
      name: 'ntm-plan',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the plan itself, not transient generation flags.
      partialize: (s) => ({ days: s.days, source: s.source }),
    },
  ),
);
