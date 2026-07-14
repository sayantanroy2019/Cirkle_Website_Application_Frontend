import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone } from 'lucide-react'
import { api, setToken, ApiError } from '../../lib/api.js'
import { routeForOnboardingStep } from './onboardingRoutes.js'

const PHONE_REGEX = /^[6-9]\d{9}$/

export function PhoneEntry() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const isValid = PHONE_REGEX.test(phone)
  const showError = touched && phone.length > 0 && !isValid

  const handleChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digitsOnly)
    setApiError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    setApiError('')
    try {
      const data = await api.post('/auth/login', { phone: `+91${phone}` }, { auth: false })
      setToken(data.token)
      navigate(routeForOnboardingStep(data))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
        aria-label="Back"
      >
        <ArrowLeft size={22} strokeWidth={2} />
      </button>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <span
          className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] w-14 h-14 flex items-center justify-center rounded-full bg-cirkle-chip border border-cirkle-border-card"
          aria-hidden="true"
        >
          <Phone size={24} className="text-cirkle-yellow" strokeWidth={2} />
        </span>

        <h1 className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.1s] mt-6 font-display text-[60px] md:text-[60px] leading-[0.9] tracking-[-0.01em] text-white uppercase">
          What's your phone number?
        </h1>
        <p className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.2s] mt-3 font-body text-[15px] text-cirkle-text-muted">
          We'll use this number to find or create your account.
        </p>

        <div className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.3s] mt-8">
          <div
            className={`flex items-center bg-cirkle-input border rounded-[10px] transition-all duration-200 ${
              showError ? 'border-red-400' : 'border-cirkle-border-card focus-within:border-cirkle-yellow'
            }`}
          >
            <span className="pl-4 pr-3 py-3 font-body text-[14px] text-white border-r border-cirkle-border-card">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={handleChange}
              onBlur={() => setTouched(true)}
              className="flex-1 bg-transparent px-4 py-3 font-body text-[14px] text-white placeholder:text-cirkle-text-placeholder outline-none"
              aria-label="Phone number"
            />
          </div>
          {showError && (
            <p className="mt-2 font-body text-[13px] text-red-400">
              Enter a valid 10-digit Indian mobile number.
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
          className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.4s] btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Logging in…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default PhoneEntry
