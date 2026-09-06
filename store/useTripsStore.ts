import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip } from '@/types';
import { usePrefsStore } from './usePrefsStore';
import { usePlanStore } from './usePlanStore';
import { useAuthStore } from './useAuthStore';
import * as authApi from '@/services/auth';

let idc = 0;
const genTripId = () => `trip-${Date.now().toString(36)}-${idc++}`;
// Server ids (newId('trip') in server/src/index.ts) use an underscore;
// local-only ids use a dash — cheap way to tell "not yet synced" apart
// without a separate flag on the shared Trip shape.
const isRemoteId = (id: string) => id.startsWith('trip_');

function tripPayloadFrom(trip: Trip): Omit<Trip, 'id' | 'updatedAt'> {
  const { id, updatedAt, ...rest } = trip;
  return rest;
}

/** Builds the active trip's snapshot from the live prefs+plan stores,
 *  without touching the server — callers decide what to sync and when. */
function buildActiveSnapshot(existingId: string | null): Trip {
  const prefs = usePrefsStore.getState();
  const plan = usePlanStore.getState();
  return {
    id: existingId ?? genTripId(),
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
}

/** Best-effort push of one trip to the server — create if it's still a local
 *  id, update if it's already a server id. Local state stays authoritative
 *  on any failure (offline, etc.) — no retry queue for now. */
async function syncSave(trip: Trip): Promise<void> {
  const { token } = useAuthStore.getState();
  if (!token) return;
  try {
    if (isRemoteId(trip.id)) {
      await authApi.updateTrip(token, trip.id, tripPayloadFrom(trip));
    } else {
      const { trip: created } = await authApi.createTrip(token, tripPayloadFrom(trip));
      useTripsStore.setState((s) => ({
        trips: s.trips.map((t) =>
          t.id === trip.id ? { ...t, id: created.id, updatedAt: created.updatedAt } : t,
        ),
        activeTripId: s.activeTripId === trip.id ? created.id : s.activeTripId,
      }));
    }
  } catch {
    // offline or server error — try again on the next save
  }
}

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
  /** Called right after login — an existing account's server trips replace
   *  whatever's local (server is authoritative for a returning user). */
  syncFromServer: () => Promise<void>;
  /** Called right after signup — pushes every local trip (including the
   *  live active one) up to the brand-new account. */
  migrateLocalTrips: () => Promise<void>;
}

export const useTripsStore = create<TripsState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: null,
      newTripCancelId: null,
      _hydrated: false,

      saveActiveSnapshot: () => {
        const { trips, activeTripId } = get();
        const snapshot = buildActiveSnapshot(activeTripId);
        const exists = trips.some((t) => t.id === snapshot.id);
        set({
          activeTripId: snapshot.id,
          trips: exists
            ? trips.map((t) => (t.id === snapshot.id ? snapshot : t))
            : [snapshot, ...trips],
        });
        void syncSave(snapshot);
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

      deleteTrip: (id) => {
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          activeTripId: s.activeTripId === id ? null : s.activeTripId,
        }));
        const { token } = useAuthStore.getState();
        if (token && isRemoteId(id)) authApi.deleteTrip(token, id).catch(() => {});
      },

      resetAll: () => set({ trips: [], activeTripId: null, newTripCancelId: null }),

      syncFromServer: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        try {
          const { trips } = await authApi.fetchTrips(token);
          set({ trips, activeTripId: trips[0]?.id ?? null });
          const active = trips[0];
          if (active) {
            usePrefsStore.getState().restorePreferences({
              destination: active.destination,
              startDate: active.startDate,
              endDate: active.endDate,
              budget: active.budget,
              interests: active.interests,
              durationDays: active.durationDays,
            });
            usePlanStore.setState({
              days: active.days,
              source: active.source,
              _prev: null,
              canUndo: false,
            });
          }
        } catch {
          // offline/failed — keep whatever was local
        }
      },

      migrateLocalTrips: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;

        // Capture the live trip into the local archive first — deliberately
        // not via saveActiveSnapshot(), which would also kick off its own
        // background syncSave() and race with the loop below over the same id.
        const { trips, activeTripId } = get();
        const snapshot = buildActiveSnapshot(activeTripId);
        const exists = trips.some((t) => t.id === snapshot.id);
        set({
          activeTripId: snapshot.id,
          trips: exists
            ? trips.map((t) => (t.id === snapshot.id ? snapshot : t))
            : [snapshot, ...trips],
        });

        for (const trip of get().trips) {
          if (isRemoteId(trip.id)) continue;
          try {
            const { trip: created } = await authApi.createTrip(token, tripPayloadFrom(trip));
            set((s) => ({
              trips: s.trips.map((t) =>
                t.id === trip.id ? { ...t, id: created.id, updatedAt: created.updatedAt } : t,
              ),
              activeTripId: s.activeTripId === trip.id ? created.id : s.activeTripId,
            }));
          } catch {
            // leave this one local-only — not fatal, it'll retry on its next save
          }
        }
      },
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
