import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItineraryDay, ItineraryItem, Place } from '@/types';
import { itinerary as mockItinerary, swapPool } from '@/mock';
import { addMinutes } from '@/utils/time';

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

  addPlaceToPlan: (place: Place) => number; // returns the day number it landed in
  smartSwap: (dayNumber: number, itemId: string) => void;
  reorderDayItems: (dayNumber: number, items: ItineraryItem[]) => void;
  removeItem: (dayNumber: number, itemId: string) => void;
  isPlaceInPlan: (placeId: string) => boolean;
  resetPlan: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      days: seedDays(),

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

      smartSwap: (dayNumber, itemId) => {
        const { days } = get();
        const day = days.find((d) => d.day === dayNumber);
        const item = day?.items.find((i) => i.id === itemId);
        if (!day || !item) return;

        const usedTitles = new Set(days.flatMap((d) => d.items.map((i) => i.title)));
        const sameCategory = swapPool.filter((s) => s.category === item.category);
        const fresh = sameCategory.filter((s) => !usedTitles.has(s.title));
        const pool = fresh.length ? fresh : sameCategory;
        if (pool.length === 0) return;

        const pick = pool[Math.floor(Math.random() * pool.length)];
        const replacement: ItineraryItem = {
          ...pick,
          id: item.id, // keep the same id + slot so the row can animate in place
          time: item.time,
        };

        set({
          days: days.map((d) =>
            d.day === dayNumber
              ? { ...d, items: d.items.map((i) => (i.id === itemId ? replacement : i)) }
              : d,
          ),
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

      resetPlan: () => set({ days: seedDays() }),
    }),
    {
      name: 'ntm-plan',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
