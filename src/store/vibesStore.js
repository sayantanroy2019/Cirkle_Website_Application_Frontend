import { create } from 'zustand'
import { api, ApiError } from '../lib/api.js'

// The Vibes discovery feed — a per-viewer list of cards (one per upcoming
// ticket held by someone else). Cached for the session so leaving and
// returning (e.g. Join me → event → back) is instant and keeps your place.
export const useVibesStore = create((set, get) => ({
  cards: null, // null = not loaded yet
  index: 0, // which person is currently shown
  isLoading: false,
  error: '',
  loaded: false,

  fetchVibes: async ({ force = false } = {}) => {
    if (!force && get().loaded) return
    if (get().isLoading) return
    set({ isLoading: true, error: '' })
    try {
      const data = await api.get('/vibes')
      const cards = data.cards
      set({
        cards,
        loaded: true,
        index: Math.min(get().index, Math.max(0, cards.length - 1)),
      })
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Could not load the feed.' })
    } finally {
      set({ isLoading: false })
    }
  },

  setIndex: (index) => set({ index }),

  reset: () => set({ cards: null, index: 0, isLoading: false, error: '', loaded: false }),
}))
