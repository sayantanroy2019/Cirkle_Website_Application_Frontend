import { useProfileStore } from './profileStore.js'
import { useCityStore } from './cityStore.js'
import { useEventsStore } from './eventsStore.js'
import { useVibesStore } from './vibesStore.js'
import { useOnboarding } from './onboardingStore.js'

// Clear every per-user cache so switching accounts never shows stale data
// (e.g. the previous user's feed). Call on both login and logout.
export function resetUserStores() {
  useProfileStore.getState().reset()
  useCityStore.getState().reset()
  useEventsStore.getState().reset()
  useVibesStore.getState().reset()
  useOnboarding.getState().resetProfile()
}
