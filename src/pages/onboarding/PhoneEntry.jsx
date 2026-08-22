import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone } from 'lucide-react'
import { api, ApiError } from '../../lib/api.js'
import { mapOtpError } from '../../lib/otpErrors.js'
import { countryByIso2, DEFAULT_COUNTRY, toE164 } from '../../lib/phone.js'
import CountrySelect from '../../components/CountrySelect.jsx'

export function PhoneEntry() {
  const navigate = useNavigate()
  // India by default — the existing audience. Any other default would add
  // friction for nearly every current user.
  const [country, setCountry] = useState(() => countryByIso2(DEFAULT_COUNTRY))
  const [national, setNational] = useState('')
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  // Set by a rate_limit — sending again is the very thing to stop them doing.
  const [sendBlocked, setSendBlocked] = useState(false)

  // Validated by the same library and version the backend uses, so the two
  // sides agree. No hardcoded per-country rule: the old /^[6-9]\d{9}$/ would
  // now reject Indian numbers the server accepts.
  const e164 = toE164(country.callingCode, national)
  const isValid = e164 !== null
  const showError = touched && national.length > 0 && !isValid

  const handleChange = (e) => {
    // Keep only digits; length is the library's judgement, not a fixed cap,
    // since national numbers differ per country.
    setNational(e.target.value.replace(/\D/g, '').slice(0, 15))
    setApiError('')
    setSendBlocked(false) // a different number is a different rate-limit bucket
  }

  const handleCountryChange = (next) => {
    setCountry(next)
    setApiError('')
    setSendBlocked(false)
  }

  // Sends the code only. No token is issued here — that happens at verify,
  // which is the one place a JWT is minted.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isValid || isSubmitting || sendBlocked) return

    setIsSubmitting(true)
    setApiError('')
    try {
      // Always canonical E.164 — the library has already stripped spacing,
      // brackets and any leading zero.
      await api.post('/auth/otp/send', { phone: e164 }, { auth: false })
      // isSubmitting stays true through the navigation, so a second tap during
      // the transition can't fire another send.
      //
      // replace, not push: the whole login flow occupies ONE history entry,
      // which the post-verify redirect overwrites. Back from wherever the
      // user lands must never return to a login screen — login is a
      // checkpoint, not a place.
      navigate('/otp', { replace: true, state: { phone: e164 } })
    } catch (err) {
      const mapped = err instanceof ApiError ? mapOtpError(err) : null
      // The cooldown refusal means their code is ALREADY in WhatsApp — the
      // classic trigger is back-button + resubmit. Escort them forward to
      // enter it instead of dead-ending them here; the server's remaining
      // seconds drive the resend countdown on the next screen.
      if (mapped?.retryAfterSeconds != null) {
        navigate('/otp', {
          replace: true,
          state: { phone: e164, alreadySent: true, resendIn: mapped.retryAfterSeconds },
        })
        return
      }
      setApiError(mapped?.message ?? 'Something went wrong. Please try again.')
      if (mapped?.blocksSend) setSendBlocked(true)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-6">
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
          We'll send you a 6-digit code to sign in.
        </p>

        <div className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.3s] mt-8">
          <div
            className={`flex items-center bg-cirkle-input border rounded-[10px] transition-all duration-200 ${
              showError ? 'border-red-400' : 'border-cirkle-border-card focus-within:border-cirkle-yellow'
            }`}
          >
            <CountrySelect
              country={country}
              onChange={handleCountryChange}
              disabled={isSubmitting}
            />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Mobile number"
              value={national}
              onChange={handleChange}
              onBlur={() => setTouched(true)}
              className="flex-1 min-w-0 bg-transparent px-4 py-3 font-body text-[16px] text-white placeholder:text-cirkle-text-placeholder appearance-none [-webkit-appearance:none] outline-none focus:outline-none [box-shadow:none] [-webkit-tap-highlight-color:transparent]"
              aria-label="Phone number"
            />
          </div>
          {showError && (
            <p className="mt-2 font-body text-[13px] text-red-400">
              Enter a valid mobile number, including your country code.
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
          disabled={!isValid || isSubmitting || sendBlocked}
          className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.4s] btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Sending code…' : 'Send code'}
        </button>
      </form>
    </div>
  )
}

export default PhoneEntry
