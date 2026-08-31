import { useNavigate } from 'react-router-dom'
import { useGateStore } from '../store/gateStore.js'
import { setRedirect } from './redirect.js'
import { routeForOnboardingStep } from '../pages/onboarding/onboardingRoutes.js'

/**
 * The one way into the deferred profile steps, shared by every surface that
 * offers them (the Vibes prompt, the gated-action dialog, the Profile card).
 *
 * Refreshes the gate state first so an attempt abandoned in another session
 * resumes at the saved step, stores `returnTo` (the walkthrough consumes it
 * on the far side), then navigates to the right step.
 *
 * setRedirect, not rememberRedirect: each tap of an entry point is a fresh
 * declaration of intent, so the LATEST destination wins — an abandoned
 * earlier attempt must not pin every later completion to its stale one.
 */
export function useStartProfileCompletion() {
  const navigate = useNavigate()
  return async (returnTo) => {
    const { profileComplete, currentStep } = await useGateStore.getState().refresh()
    setRedirect(returnTo)
    navigate(
      routeForOnboardingStep({
        currentOnboardingStep: currentStep,
        partialProfileComplete: profileComplete,
      }),
    )
  }
}
