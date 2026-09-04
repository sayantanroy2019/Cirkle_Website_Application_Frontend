import { create } from 'zustand'
import { api } from '../lib/api.js'

// Deferred-onboarding gate state: is this user's profile complete, and if
// not, which step they'd resume at. Set from the login response, kept fresh
// by refresh() (GET /onboarding/status) whenever a gate is about to rely on
// it. `profileComplete: null` means "unknown" — a hard refresh landed
// straight on an authenticated page — and ensureKnown() resolves it before
// any gate decides.
//
// This mirrors, never replaces, the server: every gated endpoint 403s with
// `profile_incomplete` regardless of what this store believes.
export const useGateStore = create((set, get) => ({
  profileComplete: null,
  currentStep: 0,

  setFromLogin: ({ partialProfileComplete, currentOnboardingStep }) =>
    set({
      profileComplete: Boolean(partialProfileComplete),
      currentStep: currentOnboardingStep ?? 0,
    }),

  // The final onboarding step (email) flips the server flag; the client
  // mirrors it here so gates open without a round trip.
  markComplete: () => set({ profileComplete: true, currentStep: 7 }),

  refresh: async () => {
    try {
      const d = await api.get('/onboarding/status')
      set({
        profileComplete: Boolean(d.partialProfileComplete),
        currentStep: d.currentOnboardingStep ?? 0,
      })
    } catch (err) {
      // 404 = ghost session (token for a deleted account) — reset it.
      if (err?.status === 404) {
        const { handleGhostSession } = await import('./session.js')
        handleGhostSession()
      }
      /* otherwise keep what we have — the server gates are the real wall */
    }
    return get()
  },

  ensureKnown: async () => {
    if (get().profileComplete === null) await get().refresh()
    return get()
  },

  reset: () => set({ profileComplete: null, currentStep: 0 }),
}))
