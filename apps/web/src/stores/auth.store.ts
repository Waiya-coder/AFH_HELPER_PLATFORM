import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@afh/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : null,
        })),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'afh-auth' },
  ),
);
