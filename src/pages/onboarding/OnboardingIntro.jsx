import { useNavigate } from 'react-router-dom'
import IntroInterstitial from './IntroInterstitial.jsx'

// The first thing a new user sees after verifying their number: one breath of
// intent before the seven onboarding steps. Chosen copy (variant C) and photo
// were picked from live previews; the component and image are reused for the
// pre-photos interstitial when that page is built.
export function OnboardingIntro() {
  const navigate = useNavigate()

  return (
    <IntroInterstitial
      headline="Tickets get you in. People make it a night."
      body="The next steps shape how you show up to everyone already going where you’re going."
      onContinue={() => navigate('/onboarding/name', { replace: true })}
    />
  )
}

export default OnboardingIntro
