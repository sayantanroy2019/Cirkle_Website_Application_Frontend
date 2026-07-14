import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext.jsx'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailStep() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useOnboarding()

  const [email, setEmail] = useState(profile.email)
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const isValid = EMAIL_REGEX.test(email.trim())
  const showError = touched && email.trim().length > 0 && !isValid

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isValid || isSubmitting) return

    const trimmed = email.trim()
    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/step/7', { email: trimmed })
      updateProfile({ email: trimmed })
      navigate('/feed')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={7} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <span
          className="w-14 h-14 flex items-center justify-center rounded-full bg-cirkle-chip border border-cirkle-border-card"
          aria-hidden="true"
        >
          <Mail size={24} className="text-cirkle-yellow" strokeWidth={2} />
        </span>

        <h1 className="mt-6 font-display text-section-lg text-white uppercase">
          Where should we send your tickets?
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Used only for ticket delivery and reminders — never for login.
        </p>

        <div className="mt-8">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setApiError('')
            }}
            onBlur={() => setTouched(true)}
            placeholder="you@example.com"
            className={`input-dark ${showError ? 'border-red-400' : ''}`}
            aria-label="Email address"
          />
          {showError && (
            <p className="mt-2 font-body text-[13px] text-red-400">
              Enter a valid email address.
            </p>
          )}
          {apiError && !showError && (
            <p className="mt-2 font-body text-[13px] text-red-400">
              {apiError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Finishing…' : 'Finish setup'}
        </button>
      </form>
    </div>
  )
}

export default EmailStep
