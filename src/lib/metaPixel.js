// Meta Pixel (METAPIXEL-AND-CAPI-INTEGRATION.md). Everything fbq-shaped
// lives here so no page ever touches window.fbq directly.
//
// Two hard rules, enforced in this module:
//   1. Nothing happens without a configured VITE_META_PIXEL_ID — dev,
//      previews, and any misconfigured build stay silent, never broken.
//   2. Every call is wrapped so an ad blocker (which strips fbevents.js and
//      may replace fbq with a poisoned stub) can never take the app down —
//      analytics must be incapable of breaking checkout.
//
// Dedup contract with the backend's Conversions API: events that exist on
// both sides carry the same eventID — the booking ref for Purchase, the
// order id for InitiateCheckout — so Meta counts each conversion once no
// matter which side delivered it.

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID

let initialized = false

/** Injects Meta's loader and fires the first PageView. Call once, at app mount. */
export function initMetaPixel() {
  if (!PIXEL_ID || initialized || typeof window === 'undefined') return
  initialized = true
  try {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'
      n.queue = []; t = b.createElement(e); t.async = !0
      t.src = v; s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    window.fbq('init', PIXEL_ID)
    window.fbq('track', 'PageView')
  } catch {
    /* blocked or failed — the app must not care */
  }
}

/** SPA route change — the base snippet only sees the first page. */
export function trackPageView() {
  if (!PIXEL_ID || !window.fbq) return
  try {
    window.fbq('track', 'PageView')
  } catch { /* ignore */ }
}

/**
 * A standard event. `eventId` feeds Meta's dedup — pass it whenever a
 * server-side twin exists (see the contract above).
 */
export function trackMetaEvent(name, params = {}, eventId = null) {
  if (!PIXEL_ID || !window.fbq) return
  try {
    window.fbq('track', name, params, eventId ? { eventID: eventId } : undefined)
  } catch { /* ignore */ }
}
