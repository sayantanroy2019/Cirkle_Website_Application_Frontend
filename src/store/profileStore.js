import { create } from 'zustand'
import { api, ApiError } from '../lib/api.js'

// Single source of truth for the logged-in user's profile. Fetched once and
// cached; updated in place after a successful edit (optimistic — the PATCH
// response carries no body), so no screen needs to refetch.
let inFlight = null

export const useProfileStore = create((set, get) => ({
  profile: null,
  isLoading: false,
  error: '',

  // Fetch once; concurrent callers share the same in-flight request.
  fetchProfile: async () => {
    if (get().profile) return get().profile
    if (inFlight) return inFlight
    set({ isLoading: true, error: '' })
    inFlight = api
      .get('/profile/me')
      .then((data) => {
        set({ profile: data.profile, isLoading: false })
        return data.profile
      })
      .catch((err) => {
        set({
          error: err instanceof ApiError ? err.message : 'Could not load your profile.',
          isLoading: false,
        })
        return null
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  },

  // Merge edited fields into the cached profile after a successful PATCH.
  applyUpdate: (fields) =>
    set((s) => ({ profile: s.profile ? { ...s.profile, ...fields } : fields })),
}))
