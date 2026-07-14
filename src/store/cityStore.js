import { useEffect } from 'react'
import { create } from 'zustand'
import { api } from '../lib/api.js'
import { useProfileStore } from './profileStore.js'

// Active browsing city + the city catalogue. Defaults to the user's profile
// city; changing it only affects the browsing filter, not the saved profile.
export const useCityStore = create((set, get) => ({
  cities: [],
  activeCityId: '',
  isLoading: false,
  loaded: false,

  // Load the city list once, and default the active city from the shared
  // profile store (no separate /profile/me fetch here).
  ensureLoaded: async () => {
    if (get().loaded || get().isLoading) return
    set({ isLoading: true })
    try {
      const [profile, citiesRes] = await Promise.all([
        useProfileStore.getState().fetchProfile(),
        api.get('/reference/cities', { auth: false }),
      ])
      set({
        cities: citiesRes.cities,
        activeCityId: profile?.cityId ?? '',
        loaded: true,
      })
    } catch {
      /* consumers degrade gracefully to empty */
    } finally {
      set({ isLoading: false })
    }
  },

  setActiveCityId: (id) => set({ activeCityId: id }),
}))

// Drop-in replacement for the old context hook. Triggers the one-time load and
// returns the same shape, including the derived active city name.
export function useActiveCity() {
  const cities = useCityStore((s) => s.cities)
  const activeCityId = useCityStore((s) => s.activeCityId)
  const isLoading = useCityStore((s) => s.isLoading)
  const setActiveCityId = useCityStore((s) => s.setActiveCityId)
  const ensureLoaded = useCityStore((s) => s.ensureLoaded)

  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])

  const activeCityName = cities.find((c) => c.id === activeCityId)?.name ?? ''

  return { cities, activeCityId, activeCityName, setActiveCityId, isLoading }
}
