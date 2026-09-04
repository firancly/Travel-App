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
  /** Snapshot of `days` before the last destructive edit (single-level undo). */
  _prev: ItineraryDay[] | null;
  canUndo: boolean;

  addPlaceToPlan: (place: Place) => number; // returns the day number it landed in
  /** Fetch up to 3 replacement candidates for a stop (AI-first, mock-pool fallback).
   *  Read-only — does not mutate the plan. */
  getSwapCandidates: (dayNumber: number, itemId: string) => Promise<ItineraryItem[]>;
  /** Apply a chosen candidate in place of `itemId`, keeping its id + time slot. */
  applySwap: (dayNumber: number, itemId: string, replacement: ItineraryItem) => void;
  reorderDayItems: (dayNumber: number, items: ItineraryItem[]) => void;
  removeItem: (dayNumber: number, itemId: string) => void;
  isPlaceInPlan: (placeId: string) => boolean;
  /** Generate a fresh plan via the AI proxy. Returns true on success; keeps the
   *  current plan as a fallback on failure. */
  generatePlan: (prefs: GeneratePrefs) => Promise<boolean>;
  /** Revert the last destructive plan edit (swap, reorder, rain-proof, remove, add, regenerate). */
  undo: () => void;
  resetPlan: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      days: seedDays(),
      source: 'mock',
      generating: false,
      error: null,
      _prev: null,
      canUndo: false,

      addPlaceToPlan: (place) => {
        const { days } = get();
        set({ _prev: days, canUndo: true });
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

      getSwapCandidates: async (dayNumber, itemId) => {
        const { days } = get();
        const day = days.find((d) => d.day === dayNumber);
        const item = day?.items.find((i) => i.id === itemId);
        if (!day || !item) return [];

        const usedTitles = days.flatMap((d) => d.items.map((i) => i.title));
        const seen = new Set(usedTitles);
        const results: ItineraryItem[] = [];

        if (itineraryApiConfigured()) {
          try {
            const destination = usePrefsStore.getState().destination;
            const anchor = swapAnchor(day.items, itemId);
            const exclude = [...usedTitles];
            for (let i = 0; i < 3; i++) {
              const swapped = await swapStop(
                destination,
                item.category,
                exclude,
                item.time,
                anchor?.latitude,
                anchor?.longitude,
              );
              if (seen.has(swapped.title)) continue;
              seen.add(swapped.title);
              exclude.push(swapped.title);
              results.push({ ...swapped, id: genId('cand'), time: item.time });
            }
          } catch {
            // partial or zero AI results — fill the rest from the mock pool below
          }
        }

        if (results.length < 3) {
          const sameCategory = swapPool.filter((s) => s.category === item.category);
          const rest = swapPool.filter((s) => s.category !== item.category);
          for (const p of [...sameCategory, ...rest]) {
            if (results.length >= 3) break;
            if (seen.has(p.title)) continue;
            seen.add(p.title);
            results.push({ ...p, id: genId('cand'), time: item.time });
          }
        }

        return results;
      },

      applySwap: (dayNumber, itemId, replacement) => {
        set({ _prev: get().days, canUndo: true });
        set({
          days: get().days.map((d) =>
            d.day === dayNumber
              ? {
                  ...d,
                  items: d.items.map((i) =>
                    i.id === itemId ? { ...replacement, id: itemId, time: i.time } : i,
                  ),
                }
              : d,
          ),
        });
      },

      reorderDayItems: (dayNumber, items) =>
        set((s) => ({
          _prev: s.days,
          canUndo: true,
          days: s.days.map((d) => (d.day === dayNumber ? { ...d, items } : d)),
        })),

      removeItem: (dayNumber, itemId) =>
        set((s) => ({
          _prev: s.days,
          canUndo: true,
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
          set({ _prev: get().days, canUndo: true, days, source: 'ai', generating: false });
          return true;
        } catch (e: any) {
          // Keep the existing plan as a fallback; surface a soft error.
          set({ generating: false, error: String(e?.message ?? 'generation failed') });
          return false;
        }
      },

      undo: () => {
        const prev = get()._prev;
        if (!prev) return;
        set({ days: prev, _prev: null, canUndo: false });
      },

      resetPlan: () => set({ days: seedDays(), source: 'mock', error: null, _prev: null, canUndo: false }),
    }),
    {
      name: 'ntm-plan',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the plan itself, not transient generation flags.
      partialize: (s) => ({ days: s.days, source: s.source }),
    },
  ),
);
