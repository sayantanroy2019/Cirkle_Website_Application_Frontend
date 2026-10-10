import { create } from 'zustand'
import QRCode from 'qrcode'
import { ApiError } from '../lib/api.js'
import { getWalletSummary, getTopupEvents, getWalletHistory } from '../lib/wallet.js'

/**
 * My Wallet cache (F&B spec Part 5). The wallet's summary, the top-up event
 * list and the history are fetched as soon as the app shell mounts after
 * login — before the attendee ever taps the wallet icon — and kept here, so
 * every wallet screen renders instantly from memory and refreshes quietly
 * in the background (stale-while-revalidate). The QR is pre-rendered too.
 *
 * Reset on login/logout with the other per-user stores (session.js).
 */

const FRESH_MS = 30 * 1000
const QR_SIZE = 260

const initial = {
  summary: null,
  summaryAt: 0,
  summaryError: '',
  events: null,
  eventsAt: 0,
  eventsError: '',
  history: null,
  historyAt: 0,
  historyError: '',
  qrDataUrl: '',
  qrForUrl: '',
}
const inFlight = { summary: null, events: null, history: null }
const message = (err, fallback) => (err instanceof ApiError ? err.message : fallback)

async function renderQr(url) {
  try {
    return await QRCode.toDataURL(url, { width: QR_SIZE, margin: 1, color: { dark: '#060606', light: '#FFFFFF' } })
  } catch {
    return ''
  }
}

export const useWalletStore = create((set, get) => ({
  ...initial,

  // Returns the cached summary when fresh; otherwise refetches. Concurrent
  // callers share one request. Never throws — errors land in summaryError.
  fetchSummary: async ({ force = false } = {}) => {
    const { summary, summaryAt } = get()
    if (!force && summary && Date.now() - summaryAt < FRESH_MS) return summary
    if (inFlight.summary) return inFlight.summary
    inFlight.summary = getWalletSummary()
      .then(async (data) => {
        set({ summary: data, summaryAt: Date.now(), summaryError: '' })
        if (data.qrUrl && data.qrUrl !== get().qrForUrl) {
          const qrDataUrl = await renderQr(data.qrUrl)
          set({ qrDataUrl, qrForUrl: data.qrUrl })
        }
        return data
      })
      .catch((err) => {
        set({ summaryError: message(err, 'Could not load your wallet.') })
        return null
      })
      .finally(() => {
        inFlight.summary = null
      })
    return inFlight.summary
  },

  fetchEvents: async ({ force = false } = {}) => {
    const { events, eventsAt } = get()
    if (!force && events && Date.now() - eventsAt < FRESH_MS) return events
    if (inFlight.events) return inFlight.events
    inFlight.events = getTopupEvents()
      .then((data) => {
        set({ events: data.events, eventsAt: Date.now(), eventsError: '' })
        return data.events
      })
      .catch((err) => {
        set({ eventsError: message(err, 'Could not load events.') })
        return null
      })
      .finally(() => {
        inFlight.events = null
      })
    return inFlight.events
  },

  fetchHistory: async ({ force = false } = {}) => {
    const { history, historyAt } = get()
    if (!force && history && Date.now() - historyAt < FRESH_MS) return history
    if (inFlight.history) return inFlight.history
    inFlight.history = getWalletHistory()
      .then((data) => {
        set({ history: data, historyAt: Date.now(), historyError: '' })
        return data
      })
      .catch((err) => {
        set({ historyError: message(err, 'Could not load your history.') })
        return null
      })
      .finally(() => {
        inFlight.history = null
      })
    return inFlight.history
  },

  // Warm everything the wallet screens need. Fire-and-forget.
  prefetch: () => {
    const s = get()
    s.fetchSummary()
    s.fetchEvents()
    s.fetchHistory()
  },

  // The server's fresh summary (e.g. after a top-up is verified).
  setSummary: (summary) => {
    set({ summary, summaryAt: Date.now(), summaryError: '' })
    if (summary?.qrUrl && summary.qrUrl !== get().qrForUrl) {
      renderQr(summary.qrUrl).then((qrDataUrl) => set({ qrDataUrl, qrForUrl: summary.qrUrl }))
    }
  },

  // A local change we already know about (lock state, a new QR) — applied
  // at once, no round trip.
  patchSummary: (partial) => {
    set((s) => (s.summary ? { summary: { ...s.summary, ...partial } } : {}))
    if (partial.qrUrl && partial.qrUrl !== get().qrForUrl) {
      renderQr(partial.qrUrl).then((qrDataUrl) => set({ qrDataUrl, qrForUrl: partial.qrUrl }))
    }
  },

  // Money moved: the next open of any wallet screen refetches.
  invalidate: () => set({ summaryAt: 0, eventsAt: 0, historyAt: 0 }),

  reset: () => set({ ...initial }),
}))
