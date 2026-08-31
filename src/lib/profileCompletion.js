import { useNavigate } from 'react-router-dom'
import { useGateStore } from '../store/gateStore.js'
import { rememberRedirect } from './redirect.js'
import { routeForOnboardingStep } from '../pages/onboarding/onboardingRoutes.js'

/**
 * The one way into the deferred profile steps, shared by every surface that
 * offers them (the Vibes prompt, the gated-action dialog, the Profile card).
 *
 * Refreshes the gate state first so an attempt abandoned in another session
 * resumes at the saved step, remembers `returnTo` (the walkthrough consumes
 * it on the far side), then navigates to the right step.
 */
export function useStartProfileCompletion() {
  const navigate = useNavigate()
  return async (returnTo) => {
    const { profileComplete, currentStep } = await useGateStore.getState().refresh()
    rememberRedirect(returnTo)
    navigate(
      routeForOnboardingStep({
        currentOnboardingStep: currentStep,
        partialProfileComplete: profileComplete,
      }),
    )
  }
}
