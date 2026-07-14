const STEP_ROUTES = [
  '/onboarding/name',
  '/onboarding/dob',
  '/onboarding/gender',
  '/onboarding/city',
  '/onboarding/tags',
  '/onboarding/photos',
  '/onboarding/email',
]

export function routeForOnboardingStep({ currentOnboardingStep, partialProfileComplete }) {
  if (partialProfileComplete) return '/feed'
  return STEP_ROUTES[currentOnboardingStep] ?? '/onboarding/name'
}
