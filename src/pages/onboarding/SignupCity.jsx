import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { api, ApiError } from '../../lib/api.js'
import { consumeRedirect } from '../../lib/redirect.js'
import { markHistoryFloor } from '../../lib/navigation.js'

// The whole of sign-up beyond the phone number (deferred-onboarding model):
// pick a city, land on the feed. The full profile comes later, at the first
// action that needs it — this screen deliberately carries no step counter
// and no back button, because there is nothing behind it and only the feed
// ahead of it.
//
// PATCH /onboarding/city (not step/4): the step counter means "furthest
// profile step completed" and this isn't a profile step.
export function SignupCity() {
  const navigate = useNavigate()

  const [cities, setCities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [cityId, setCityId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/reference/cities', { auth: false })
      .then((data) => {
        if (active) setCities(data.cities)
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load cities.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cityId || isSubmitting) return

    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/city', { cityId })
      // A deep link (shared event, ticket) survives the city screen — this is
      // where it gets consumed for a brand-new user. Nothing before this
      // entry is "back": the login screens were replaces.
      markHistoryFloor()
      navigate(consumeRedirect() ?? '/feed', { replace: true })
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col px-6 py-6">
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col max-w-[400px] w-full mx-auto pt-10"
      >
        <h1 className="font-display text-section-lg text-white uppercase">
          Which city are you in?
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          This decides which events you see. You can change it any time.
        </p>

        <div className="mt-6 flex flex-col gap-2 pb-4">
          {isLoading && (
            <p className="mt-4 text-center font-body text-[14px] text-cirkle-text-muted">
              Loading cities…
            </p>
          )}
          {loadError && (
            <p className="mt-4 text-center font-body text-[14px] text-red-400">{loadError}</p>
          )}
          {cities.map((c) => {
            const isSelected = cityId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCityId(c.id)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-[10px] border font-body text-[15px] font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'border-cirkle-yellow bg-cirkle-chip text-white'
                    : 'border-cirkle-border-card bg-cirkle-input text-cirkle-text-light hover:border-cirkle-text-muted/50'
                }`}
              >
                {c.name}
                {isSelected && <Check size={18} className="text-cirkle-yellow" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>

        {apiError && <p className="mb-2 font-body text-[13px] text-red-400">{apiError}</p>}

        <button
          type="submit"
          disabled={!cityId || isSubmitting}
          className="btn-primary w-full px-8 py-3.5 mt-2 mb-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default SignupCity
