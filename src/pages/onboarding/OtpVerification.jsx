import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const CODE_LENGTH = 6
const RESEND_SECONDS = 30

export function OtpVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const phone = location.state?.phone ?? ''

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const inputRefs = useRef([])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const code = digits.join('')
  const isComplete = code.length === CODE_LENGTH

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = () => {
    if (secondsLeft > 0) return
    setDigits(Array(CODE_LENGTH).fill(''))
    setSecondsLeft(RESEND_SECONDS)
    inputRefs.current[0]?.focus()
  }

  const handleVerify = (e) => {
    e.preventDefault()
    if (!isComplete) return
    // TODO: once auth backend exists, branch new vs returning user here.
    // For now every verified code proceeds into onboarding step 1.
    navigate('/onboarding/name')
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <button
        type="button"
        onClick={() => navigate('/phone')}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
        aria-label="Back"
      >
        <ArrowLeft size={22} strokeWidth={2} />
      </button>

      <form onSubmit={handleVerify} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <span
          className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] w-14 h-14 flex items-center justify-center rounded-full bg-cirkle-chip border border-cirkle-border-card"
          aria-hidden="true"
        >
          <ShieldCheck size={24} className="text-cirkle-yellow" strokeWidth={2} />
        </span>

        <h1 className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.1s] mt-6 font-display text-[70px] leading-[0.9] tracking-[-0.01em] text-white uppercase">
          Enter the code
        </h1>
        <p className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.2s] mt-3 font-body text-[15px] text-cirkle-text-muted">
          We sent a 6-digit code to {phone ? <span className="text-white font-semibold">+91 {phone}</span> : 'your number'}.
        </p>

        <div className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.3s] mt-8 flex items-center justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-full aspect-square bg-cirkle-input border border-cirkle-border-card rounded-[10px] text-center font-display text-2xl text-white outline-none transition-all duration-200 focus:border-cirkle-yellow"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        <div className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.35s] mt-6 text-center">
          {secondsLeft > 0 ? (
            <p className="font-body text-[13px] text-cirkle-text-muted">
              Resend code in 0:{secondsLeft.toString().padStart(2, '0')}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-body text-[13px] font-semibold text-cirkle-yellow transition-all duration-200 hover:text-cirkle-yellow-hover"
            >
              Resend code
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!isComplete}
          className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.4s] btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          Verify
        </button>
      </form>
    </div>
  )
}

export default OtpVerification
