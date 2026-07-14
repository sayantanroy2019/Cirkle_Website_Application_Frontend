import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Auth token, persisted to localStorage via zustand's persist middleware.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    { name: 'cirkle-auth' },
  ),
)
