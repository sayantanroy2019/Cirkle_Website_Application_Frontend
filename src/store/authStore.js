import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Auth token, persisted to localStorage via zustand's persist middleware.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      // Client-side "show once" flag for the post-onboarding walkthrough.
      // Reset on each login so a fresh onboarding on the same device shows it;
      // set true when the walkthrough is dismissed.
      walkthroughSeen: false,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null, walkthroughSeen: false }),
      markWalkthroughSeen: () => set({ walkthroughSeen: true }),
      resetWalkthrough: () => set({ walkthroughSeen: false }),
    }),
    { name: 'cirkle-auth' },
  ),
)
