import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../../store/onboardingStore.js'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'

const MIN_LENGTH = 2

export function NameStep() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useOnboarding()

  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const isValid = firstName.trim().length >= MIN_LENGTH && lastName.trim().length >= MIN_LENGTH
  const showFirstNameError = touched && firstName.trim().length < MIN_LENGTH
  const showLastNameError = touched && lastName.trim().length < MIN_LENGTH

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isValid || isSubmitting) return

    const trimmed = { firstName: firstName.trim(), lastName: lastName.trim() }
    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/step/1', trimmed)
      updateProfile(trimmed)
      navigate('/onboarding/dob')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={1} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <h1 className="font-display text-section-lg text-white uppercase">
          What's your name?
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          This is how you'll show up everywhere on Cirkle — as "{firstName.trim() || 'FirstName'}, Age".
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="firstName" className="font-body text-[13px] font-semibold text-cirkle-text-light">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => setTouched(true)}
              className={`input-dark mt-1.5 ${showFirstNameError ? 'border-red-400' : ''}`}
              placeholder="Priya"
            />
            {showFirstNameError && (
              <p className="mt-1.5 font-body text-[13px] text-red-400">
                First name must be at least {MIN_LENGTH} characters.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="font-body text-[13px] font-semibold text-cirkle-text-light">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => setTouched(true)}
              className={`input-dark mt-1.5 ${showLastNameError ? 'border-red-400' : ''}`}
              placeholder="Sharma"
            />
            {showLastNameError && (
              <p className="mt-1.5 font-body text-[13px] text-red-400">
                Last name must be at least {MIN_LENGTH} characters.
              </p>
            )}
          </div>
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

export default NameStep
