import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '@/services/auth';
import type { AuthUser } from '@/services/auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** True once AsyncStorage has rehydrated this store. */
  _hydrated: boolean;

  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Verifies a persisted token is still valid on app boot; clears it if not. */
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      _hydrated: false,

      signup: async (name, email, password) => {
        const { token, user } = await authApi.signup(name, email, password);
        set({ token, user });
      },

      login: async (email, password) => {
        const { token, user } = await authApi.login(email, password);
        set({ token, user });
      },

      logout: async () => {
        const { token } = get();
        set({ token: null, user: null });
        if (token) {
          try {
            await authApi.logout(token);
          } catch {
            // best-effort — local state is already cleared
          }
        }
      },

      restoreSession: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const { user } = await authApi.me(token);
          set({ user });
        } catch {
          set({ token: null, user: null });
        }
      },
    }),
    {
      name: 'ntm-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);

useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.setState({ _hydrated: true });
});
if (useAuthStore.persist.hasHydrated()) {
  useAuthStore.setState({ _hydrated: true });
}
