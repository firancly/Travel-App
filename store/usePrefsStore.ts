import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BudgetRange, Interest, Preferences } from '@/types';
import { addDaysToISO } from '@/utils/date';

interface PrefsState extends Preferences {
  onboarded: boolean;
  /** True once onboarding has been completed at least once — lets the
   *  onboarding screen tell a first-run visit apart from a re-opened edit
   *  (only the latter has somewhere to go back to). Never reset by
   *  `editPreferences`; cleared by `reset`. */
  hasCompletedOnce: boolean;
  /** True once AsyncStorage has rehydrated this store. */
  _hydrated: boolean;

  setBudget: (b: BudgetRange) => void;
  toggleInterest: (i: Interest) => void;
  setDuration: (d: number) => void;
  setDestination: (d: string) => void;
  setStartDate: (iso: string) => void;
  completeOnboarding: () => void;
  /** Re-open onboarding while keeping the current answers. */
  editPreferences: () => void;
  /** Blank the answer fields and open onboarding for a brand-new trip. */
  startDraft: () => void;
  /** Overwrite all answer fields at once (used to restore a snapshot on cancel). */
  restorePreferences: (p: Preferences) => void;
  /** Close a re-opened onboarding edit without generating — just returns to the app. */
  cancelEditing: () => void;
  reset: () => void;
}

const DEFAULTS: Preferences & { onboarded: boolean; hasCompletedOnce: boolean } = {
  budget: null,
  interests: [],
  durationDays: 3,
  destination: 'Kuala Lumpur, Malaysia',
  startDate: null,
  endDate: null,
  onboarded: false,
  hasCompletedOnce: false,
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      _hydrated: false,

      setBudget: (budget) => set({ budget }),

      toggleInterest: (interest) =>
        set((s) => ({
          interests: s.interests.includes(interest)
            ? s.interests.filter((i) => i !== interest)
            : [...s.interests, interest],
        })),

      setDuration: (durationDays) => set({ durationDays }),

      setDestination: (destination) => set({ destination }),

      setStartDate: (startDate) =>
        set((s) => ({
          startDate,
          endDate: addDaysToISO(startDate, Math.max(0, s.durationDays - 1)),
        })),

      completeOnboarding: () =>
        set((s) => ({
          onboarded: true,
          hasCompletedOnce: true,
          endDate: s.startDate
            ? addDaysToISO(s.startDate, Math.max(0, s.durationDays - 1))
            : s.endDate,
        })),

      editPreferences: () => set({ onboarded: false }),

      startDraft: () =>
        set({
          budget: null,
          interests: [],
          durationDays: 3,
          destination: '', // worldwide — no default city for a new trip
          startDate: null,
          endDate: null,
          onboarded: false,
        }),

      restorePreferences: (p) => set({ ...p }),

      cancelEditing: () => set({ onboarded: true }),

      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'ntm-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist the transient hydration flag.
      partialize: ({ _hydrated, ...rest }) => rest,
    },
  ),
);

// Flip the hydration flag once persisted state has loaded.
usePrefsStore.persist.onFinishHydration(() => {
  usePrefsStore.setState({ _hydrated: true });
});
if (usePrefsStore.persist.hasHydrated()) {
  usePrefsStore.setState({ _hydrated: true });
}
