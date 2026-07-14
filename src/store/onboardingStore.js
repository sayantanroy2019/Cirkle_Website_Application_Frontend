import { create } from 'zustand'

const INITIAL_PROFILE = {
  firstName: '',
  lastName: '',
  day: '',
  month: '',
  year: '',
  age: null,
  gender: '',
  cityId: '',
  lifestyleTagIds: [],
  photos: [],
  email: '',
}

// Draft profile collected across the 7 onboarding steps. In-memory only —
// resets on a full page reload, matching the old context behaviour.
export const useOnboarding = create((set) => ({
  profile: INITIAL_PROFILE,
  updateProfile: (fields) => set((state) => ({ profile: { ...state.profile, ...fields } })),
  resetProfile: () => set({ profile: INITIAL_PROFILE }),
}))
