import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../../lib/api.js'
import { useAuthStore } from '../../store/authStore.js'
import { resetUserStores } from '../../store/session.js'
import { mapOtpError } from '../../lib/otpErrors.js'
import { consumeRedirect } from '../../lib/redirect.js'
import { formatPhoneForDisplay } from '../../lib/phone.js'
import { routeForOnboardingStep } from './onboardingRoutes.js'

// CROSS-LAYER COUPLING — the box count is not a free choice.
//
// Six comes from the Twilio Verify service config (codeLength), because Verify
// generates the code. Three places must agree:
//
//   1. the Verify service setting   (the real source of truth)
//   2. the backend's /^\d{6}$/      (src/routes/auth.js, pinned to 6)
//   3. this constant                (the number of input boxes)
//
// Change Verify's codeLength in the console without updating the other two and
// OTP entry breaks with no server error to explain it — the user simply cannot
// finish typing a 7-digit code into 6 boxes. The backend pins its regex to 6 so
// a mismatch fails loudly as invalid_code rather than silently; this comment is
// its companion on the frontend side.
const CODE_LENGTH = 6
const RESEND_SECONDS = 30


export function OtpVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const phone = location.state?.phone ?? ''

  const setToken = useAuthStore((s) => s.setToken)
  const resetWalkthrough = useAuthStore((s) => s.resetWalkthrough)

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [apiError, setApiError] = useState('')
  // Set by a rate_limit. Resend stays dead until they reload — hammering it is
  // exactly what makes a rate limit worse.
  const [resendBlocked, setResendBlocked] = useState(false)
  const inputRefs = useRef([])
  // Guards the auto-submit against firing twice while a verify is in flight.
  const verifyingRef = useRef(false)

  // Reached directly (refresh, pasted link) with no number to verify against.
  useEffect(() => {
    if (!phone) navigate('/phone', { replace: true })
  }, [phone, navigate])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const isComplete = digits.every((d) => d !== '')

  const submitCode = async (code) => {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setIsVerifying(true)
    setApiError('')
    try {
      const data = await api.post(
        '/auth/otp/verify',
        { phone, code },
        { auth: false },
      )
      // Unchanged from the old login: same response shape, same routing. Only
      // the call in front of it changed.
      resetUserStores() // clear any previous user's cached data
      resetWalkthrough() // a fresh onboarding should see the walkthrough again
      setToken(data.token)

      // A deep link is only claimed once the user is actually through
      // onboarding. Someone mid-flow keeps their stored destination — the
      // walkthrough consumes it on the far side, so a new user still reaches
      // the ticket instead of losing it to the onboarding detour.
      const next = routeForOnboardingStep(data)
      navigate(next === '/feed' ? (consumeRedirect() ?? '/feed') : next, { replace: true })
    } catch (err) {
      const mapped = err instanceof ApiError ? mapOtpError(err) : null
      setApiError(mapped?.message ?? 'Something went wrong. Please try again.')
      if (mapped?.blocksSend) setResendBlocked(true)
      // Clear the boxes so the next attempt starts clean, and put the cursor
      // back at the front.
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
      verifyingRef.current = false
      setIsVerifying(false)
    }
  }

  // Accepts one keystroke or a whole pasted/autofilled code, distributing it
  // across the boxes from wherever the user is.
  const handleChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '')
    setApiError('')

    if (!cleaned) {
      const next = [...digits]
      next[index] = ''
      setDigits(next)
      return
    }

    const next = [...digits]
    for (let i = 0; i < cleaned.length && index + i < CODE_LENGTH; i += 1) {
      next[index + i] = cleaned[i]
    }
    setDigits(next)

    const lastFilled = Math.min(index + cleaned.length, CODE_LENGTH - 1)
    inputRefs.current[lastFilled]?.focus()

    if (next.every((d) => d !== '')) submitCode(next.join(''))
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = async () => {
    if (secondsLeft > 0 || isResending || resendBlocked) return
    setIsResending(true)
    setApiError('')
    try {
      await api.post('/auth/otp/send', { phone }, { auth: false })
      setDigits(Array(CODE_LENGTH).fill(''))
      setSecondsLeft(RESEND_SECONDS)
      inputRefs.current[0]?.focus()
    } catch (err) {
      const mapped = err instanceof ApiError ? mapOtpError(err) : null
      setApiError(mapped?.message ?? 'Something went wrong. Please try again.')
      if (mapped?.blocksSend) setResendBlocked(true)
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isComplete || isVerifying) return
    submitCode(digits.join(''))
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-6">
      <button
        type="button"
        onClick={() => navigate('/phone')}
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
          <ShieldCheck size={24} className="text-cirkle-yellow" strokeWidth={2} />
        </span>

        <h1 className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.1s] mt-6 font-display text-[70px] leading-[0.9] tracking-[-0.01em] text-white uppercase">
          Enter the code
        </h1>
        {/* Channel-neutral by design: today it's SMS, later WhatsApp, and this
            copy is correct either way. */}
        <p className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.2s] mt-3 font-body text-[15px] text-cirkle-text-muted">
          Code sent to <span className="text-white font-semibold">{formatPhoneForDisplay(phone)}</span>.{' '}
          <button
            type="button"
            onClick={() => navigate('/phone')}
            className="font-semibold text-cirkle-yellow transition-colors duration-200 hover:text-cirkle-yellow-hover"
          >
            Change number
          </button>
        </p>

        <div className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.3s] mt-8 flex items-center justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              // Lets iOS/Android offer the code straight from the message.
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={CODE_LENGTH}
              value={digit}
              disabled={isVerifying}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-full aspect-square bg-cirkle-input border rounded-[10px] text-center font-display text-2xl text-white outline-none transition-all duration-200 focus:border-cirkle-yellow disabled:opacity-50 ${
                apiError ? 'border-red-400' : 'border-cirkle-border-card'
              }`}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {apiError && (
          <p className="mt-3 font-body text-[13px] text-red-400 text-center">{apiError}</p>
        )}

        <div className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.35s] mt-6 text-center">
          {/* Rate-limited: the button stays rendered but disabled, rather than
              being swapped for text. The affordance remains visible so the user
              can see it will come back, and there is no live control to hammer
              — tapping resend during a rate limit only deepens it. The "wait a
              few minutes" copy comes from apiError above. */}
          {resendBlocked ? (
            <button
              type="button"
              disabled
              className="font-body text-[13px] font-semibold text-cirkle-yellow opacity-40 pointer-events-none"
            >
              Resend code
            </button>
          ) : secondsLeft > 0 ? (
            <p className="font-body text-[13px] text-cirkle-text-muted">
              Resend code in 0:{secondsLeft.toString().padStart(2, '0')}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-body text-[13px] font-semibold text-cirkle-yellow transition-all duration-200 hover:text-cirkle-yellow-hover disabled:opacity-40 disabled:pointer-events-none"
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!isComplete || isVerifying}
          className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.4s] btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isVerifying ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  )
}

export default OtpVerification
