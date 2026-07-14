import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TOTAL_STEPS = 7

export function OnboardingHeader({ step }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-[400px] w-full mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
        aria-label="Back"
      >
        <ArrowLeft size={22} strokeWidth={2} />
      </button>

      <div className="mt-4 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-1 rounded-full transition-all duration-200 ${
              i < step ? 'bg-cirkle-yellow' : 'bg-cirkle-border-card'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 font-body text-label uppercase font-bold text-cirkle-text-muted">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  )
}

export default OnboardingHeader
