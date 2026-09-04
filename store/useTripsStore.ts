import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip } from '@/types';
import { usePrefsStore } from './usePrefsStore';
import { usePlanStore } from './usePlanStore';

let idc = 0;
const genTripId = () => `trip-${Date.now().toString(36)}-${idc++}`;

/**
 * The live "active trip" is always what's in usePrefsStore + usePlanStore —
 * every existing screen keeps reading those directly, unchanged. This store
 * is just the saved archive of trips plus which one is active. Snapshots are
 * only taken at the moments they matter: switching away from a trip, or
 * finishing onboarding (new trip or edited prefs) — not on every keystroke.
 */
interface TripsState {
  trips: Trip[];
  activeTripId: string | null;
  /** Set while a fresh "new trip" draft is open in onboarding — the trip id
   *  to restore if the user backs out instead of generating. Null the rest
   *  of the time, including while editing the current trip's prefs. */
  newTripCancelId: string | null;
  _hydrated: boolean;

  /** Snapshot the live prefs+plan stores into `trips[activeTripId]`,
   *  creating the entry (and claiming an id) on first save. */
  saveActiveSnapshot: () => void;
  /** Save the trip being left, then load `id`'s saved data into the live
   *  stores and make it active. No-op if `id` is already active or unknown. */
  switchTrip: (id: string) => void;
  /** Save the current trip, then open onboarding on a blank draft for a
   *  new one. `newTripCancelId` remembers what to snap back to on cancel. */
  startNewTrip: () => void;
  deleteTrip: (id: string) => void;
  /** Full wipe — pairs with usePrefsStore.reset() + usePlanStore.resetPlan(). */
  resetAll: () => void;
}

export const useTripsStore = create<TripsState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: null,
      newTripCancelId: null,
      _hydrated: false,

      saveActiveSnapshot: () => {
        const prefs = usePrefsStore.getState();
        const plan = usePlanStore.getState();
        const { trips, activeTripId } = get();
        const id = activeTripId ?? genTripId();
        const snapshot: Trip = {
          id,
          destination: prefs.destination,
          startDate: prefs.startDate,
          endDate: prefs.endDate,
          budget: prefs.budget,
          interests: prefs.interests,
          durationDays: prefs.durationDays,
          days: plan.days,
          source: plan.source,
          updatedAt: Date.now(),
        };
        const exists = trips.some((t) => t.id === id);
        set({
          activeTripId: id,
          trips: exists
            ? trips.map((t) => (t.id === id ? snapshot : t))
            : [snapshot, ...trips],
        });
      },

      switchTrip: (id) => {
        const { trips, activeTripId } = get();
        if (id === activeTripId) return;
        const target = trips.find((t) => t.id === id);
        if (!target) return;
        // Only persist the outgoing trip if it's a real, already-saved one —
        // a null activeTripId means a blank new-trip draft with nothing worth keeping.
        if (activeTripId) get().saveActiveSnapshot();

        usePrefsStore.getState().restorePreferences({
          destination: target.destination,
          startDate: target.startDate,
          endDate: target.endDate,
          budget: target.budget,
          interests: target.interests,
          durationDays: target.durationDays,
        });
        usePlanStore.setState({
          days: target.days,
          source: target.source,
          _prev: null,
          canUndo: false,
        });
        set({ activeTripId: id });
      },

      startNewTrip: () => {
        const { activeTripId } = get();
        if (activeTripId) get().saveActiveSnapshot();
        usePrefsStore.getState().startDraft();
        usePlanStore.getState().resetPlan();
        set({ activeTripId: null, newTripCancelId: activeTripId });
      },

      deleteTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          activeTripId: s.activeTripId === id ? null : s.activeTripId,
        })),

      resetAll: () => set({ trips: [], activeTripId: null, newTripCancelId: null }),
    }),
    {
      name: 'ntm-trips',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ _hydrated, ...rest }) => rest,
    },
  ),
);

useTripsStore.persist.onFinishHydration(() => {
  useTripsStore.setState({ _hydrated: true });
});
if (useTripsStore.persist.hasHydrated()) {
  useTripsStore.setState({ _hydrated: true });
}
