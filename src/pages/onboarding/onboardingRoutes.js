const STEP_ROUTES = [
  // Step 0 opens with the intent interstitial, which leads into the name step.
  // Users resuming at later steps skip it — it's a welcome, not a gate.
  '/onboarding/intro',
  '/onboarding/dob',
  '/onboarding/gender',
  // City was collected at sign-up (deferred onboarding), so the profile flow
  // skips it: completing gender resumes at tags. Legacy users who finished
  // the old city step (counter 4) land on the same tags route below.
  '/onboarding/tags',
  '/onboarding/tags',
  // Step 5 opens with the photo-motivation interstitial, which leads into the
  // upload itself. Resuming here shows it too — someone who abandoned at
  // photos is exactly who it exists for.
  '/onboarding/vibe',
  '/onboarding/email',
]

export function routeForOnboardingStep({ currentOnboardingStep, partialProfileComplete }) {
  if (partialProfileComplete) return '/feed'
  return STEP_ROUTES[currentOnboardingStep] ?? '/onboarding/intro'
}
