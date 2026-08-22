import { useNavigate } from 'react-router-dom'
import IntroInterstitial from './IntroInterstitial.jsx'

// The breath before the photo upload — the one step people are most likely to
// stall on. Frames photos as showing your best self, not form-filling. Copy and
// photo chosen from live previews; same component as the post-OTP intro, so the
// two interstitials stay visually identical by construction.
export function OnboardingVibe() {
  const navigate = useNavigate()

  return (
    <IntroInterstitial
      headline="Put your best vibe forward"
      body="Pick photos that feel like you at your best. That's who everyone's hoping to meet."
      photo="/onboarding/vibe.jpg"
      onContinue={() => navigate('/onboarding/photos', { replace: true })}
    />
  )
}

export default OnboardingVibe
