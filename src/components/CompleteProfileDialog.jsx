import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGateStore } from '../store/gateStore.js'
import { rememberRedirect } from '../lib/redirect.js'
import { routeForOnboardingStep } from '../pages/onboarding/onboardingRoutes.js'

/**
 * The modal cousin of CreateProfilePrompt, for the moment a gated ACTION is
 * tapped (request an invite, buy a ticket) rather than a browsed surface.
 *
 * `returnTo` should carry the resume intent (e.g. /events/<id>?resume=buy):
 * the profile steps end in the walkthrough, which consumes this destination,
 * and the event page reads the param to continue the action automatically —
 * the user declared intent once and is never made to re-tap.
 */
export function CompleteProfileDialog({ message, returnTo, onCancel }) {
  const navigate = useNavigate()
  const [isStarting, setIsStarting] = useState(false)

  const start = async () => {
    if (isStarting) return
    setIsStarting(true)
    // Refresh first: an attempt abandoned in another session resumes at the
    // saved step, not from the beginning.
    const { profileComplete, currentStep } = await useGateStore.getState().refresh()
    rememberRedirect(returnTo)
    navigate(
      routeForOnboardingStep({
        currentOnboardingStep: currentStep,
        partialProfileComplete: profileComplete,
      }),
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-profile-title"
    >
      <div className="w-full sm:max-w-[420px] bg-cirkle-card border border-cirkle-border-card rounded-t-[20px] sm:rounded-[20px] p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="complete-profile-title"
            className="font-body text-[20px] font-bold text-white leading-snug"
          >
            Complete your profile
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isStarting}
            className="w-8 h-8 -mr-1 -mt-1 flex-shrink-0 flex items-center justify-center rounded-full text-cirkle-text-muted transition-all duration-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Cancel"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <p className="mt-2 font-body text-[14px] text-cirkle-text-muted leading-relaxed">
          {message}
        </p>

        <button
          type="button"
          onClick={start}
          disabled={isStarting}
          className="btn-primary w-full px-8 py-3.5 mt-6 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isStarting ? 'One moment…' : 'Complete profile'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isStarting}
          className="w-full mt-3 py-2 font-body text-[14px] font-semibold text-cirkle-text-muted transition-colors duration-200 hover:text-white disabled:opacity-40"
        >
          Not now
        </button>
      </div>
    </div>
  )
}

export default CompleteProfileDialog
