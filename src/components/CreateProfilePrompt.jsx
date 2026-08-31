import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useStartProfileCompletion } from '../lib/profileCompletion.js'

/**
 * The deferred-onboarding invitation: shown wherever a surface needs a
 * complete profile (the Vibes feed, people on an event page). The button
 * drops the user into the profile steps at whatever point they'd resume,
 * remembering where to return — the walkthrough consumes that destination
 * on the far side, so finishing lands them right back here.
 */
export function CreateProfilePrompt({
  title = 'Create your profile',
  message = 'Create your profile to see who’s going where.',
  returnTo = null,
}) {
  const location = useLocation()
  const startCompletion = useStartProfileCompletion()
  const [isStarting, setIsStarting] = useState(false)

  const start = async () => {
    if (isStarting) return
    setIsStarting(true)
    await startCompletion(returnTo ?? `${location.pathname}${location.search}`)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <span className="w-16 h-16 rounded-full bg-cirkle-chip flex items-center justify-center">
        <Sparkles size={30} className="text-cirkle-yellow" strokeWidth={2} />
      </span>
      <h2 className="mt-6 font-display text-section-md text-white uppercase">{title}</h2>
      <p className="mt-2 font-body text-[15px] text-cirkle-text-muted max-w-[320px]">{message}</p>
      <button
        type="button"
        onClick={start}
        disabled={isStarting}
        className="btn-primary px-8 py-3.5 mt-6 disabled:opacity-40 disabled:pointer-events-none"
      >
        {isStarting ? 'One moment…' : 'Create profile'}
      </button>
    </div>
  )
}

export default CreateProfilePrompt
