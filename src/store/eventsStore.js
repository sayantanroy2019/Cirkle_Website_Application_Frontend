import { create } from 'zustand'
import { api, ApiError } from '../lib/api.js'

// Caches the events feed per city so navigating away and back (e.g. into an
// event detail) doesn't refetch. The list response holds full event objects,
// so the detail page can read from this cache too.
export const useEventsStore = create((set, get) => ({
  eventsByCity: {}, // cityId -> Event[]
  loadingCity: null, // cityId currently being fetched
  errorByCity: {}, // cityId -> error message

  fetchEvents: async (cityId, { force = false } = {}) => {
    if (!cityId) return
    if (!force && get().eventsByCity[cityId]) return // already cached
    if (get().loadingCity === cityId) return // already in flight

    set({ loadingCity: cityId })
    try {
      const data = await api.get(`/events?city=${cityId}`)
      set((s) => ({
        eventsByCity: { ...s.eventsByCity, [cityId]: data.events },
        errorByCity: { ...s.errorByCity, [cityId]: undefined },
      }))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load events.'
      set((s) => ({ errorByCity: { ...s.errorByCity, [cityId]: message } }))
    } finally {
      set((s) => (s.loadingCity === cityId ? { loadingCity: null } : {}))
    }
  },
}))

// Selector factory: find a cached event by id across all cities (detail page).
export function selectEventById(id) {
  return (state) => {
    for (const list of Object.values(state.eventsByCity)) {
      const found = list.find((e) => e.id === id)
      if (found) return found
    }
    return null
  }
}
