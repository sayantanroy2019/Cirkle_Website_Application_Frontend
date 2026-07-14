import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useOnboarding } from '../../../store/onboardingStore.js'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'

// value = API enum (PATCH /onboarding/step/3); label = what the user sees.
const GENDER_OPTIONS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function GenderStep() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useOnboarding()

  const [gender, setGender] = useState(profile.gender)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const isValid = Boolean(gender)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/step/3', { gender })
      updateProfile({ gender })
      navigate('/onboarding/city')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={3} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <h1 className="font-display text-section-lg text-white uppercase">
          How do you identify?
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Shown on your profile. Never used to filter who you can join.
        </p>

        <div className="mt-8 flex flex-col gap-2.5">
          {GENDER_OPTIONS.map(({ value, label }) => {
            const isSelected = gender === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setGender(value)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-[10px] border font-body text-[15px] font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'border-cirkle-yellow bg-cirkle-chip text-white'
                    : 'border-cirkle-border-card bg-cirkle-input text-cirkle-text-light hover:border-cirkle-text-muted/50'
                }`}
              >
                {label}
                {isSelected && <Check size={18} className="text-cirkle-yellow" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>

        {apiError && (
          <p className="mt-4 font-body text-[13px] text-red-400">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default GenderStep
