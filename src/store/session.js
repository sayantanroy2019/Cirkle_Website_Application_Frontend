import { useAuthStore } from './authStore.js'
import { useProfileStore } from './profileStore.js'
import { useCityStore } from './cityStore.js'
import { useEventsStore } from './eventsStore.js'
import { useVibesStore } from './vibesStore.js'
import { useOnboarding } from './onboardingStore.js'
import { useGateStore } from './gateStore.js'
import { clearCompletionReturn, clearRedirect } from '../lib/redirect.js'
import { clearCachedTickets } from '../lib/ticketCache.js'

// Clear every per-user cache so switching accounts never shows stale data
// (e.g. the previous user's feed). Call on both login and logout.
export function resetUserStores() {
  useProfileStore.getState().reset()
  useCityStore.getState().reset()
  useEventsStore.getState().reset()
  useVibesStore.getState().reset()
  useOnboarding.getState().resetProfile()
  useGateStore.getState().reset()
}

/**
 * Ghost session: the server says this account no longer exists (404 from
 * /profile/me or /onboarding/status) but the browser still holds a valid
 * JWT — tokens are stateless and outlive their accounts, most visibly for
 * the soft-launch users whose rows the 30 Aug wipe removed while their
 * 7-day tokens lived on. Clear everything and start over at the landing
 * page; the number can simply register again.
 */
let handlingGhost = false
export function handleGhostSession() {
  if (handlingGhost) return
  handlingGhost = true
  useAuthStore.getState().clearToken()
  resetUserStores()
  clearRedirect()
  clearCompletionReturn()
  window.location.replace('/')
  // An abandoned profile-completion's return destination must never cross
  // into another account's session (the login deep-link redirect is separate
  // and deliberately survives login).
  clearCompletionReturn()
  clearCachedTickets() // a cached QR must never outlive its owner's session
}
