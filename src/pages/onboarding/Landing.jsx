import { useNavigate } from 'react-router-dom'
import { Music2, Martini, Plane } from 'lucide-react'
import Logo from '../../components/Logo.jsx'

const EVENT_TAGS = [
  { label: 'Concerts', Icon: Music2 },
  { label: 'Clubs', Icon: Martini },
  { label: 'Trips', Icon: Plane },
]

const AVATARS = [
  { initial: 'P', color: 'bg-cirkle-avatar-green' },
  { initial: 'A', color: 'bg-cirkle-avatar-blue' },
  { initial: 'R', color: 'bg-cirkle-avatar-purple' },
  { initial: 'K', color: 'bg-cirkle-avatar-coral' },
]

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Wordmark */}
      <Logo className="opacity-0 animate-[fadeUp_0.5s_ease_forwards]" />

      {/* Tagline */}
      <div
        className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.15s] mt-8"
      >
        <h1 className="font-display text-hero-sm md:text-section-lg text-white uppercase">
          Find your <span className="text-cirkle-yellow">crew.</span>
        </h1>
        <p className="mt-3 font-body text-[15px] md:text-[17px] text-cirkle-text-muted max-w-[420px] mx-auto">
          Attend events together. No more going solo.
        </p>
      </div>

      {/* Event type tags */}
      <div
        className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.3s] mt-7 flex items-center gap-2.5"
      >
        {EVENT_TAGS.map(({ label, Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cirkle-chip text-cirkle-text-light font-body text-[13px] font-semibold rounded-full"
          >
            <Icon size={14} className="text-cirkle-yellow" strokeWidth={2} />
            {label}
          </span>
        ))}
      </div>

      {/* Social proof */}
      <div
        className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.3s] mt-8 card-dark flex items-center gap-4 px-6 py-4"
      >
        <div className="flex -space-x-3">
          {AVATARS.map(({ initial, color }) => (
            <span
              key={initial}
              className={`w-10 h-10 rounded-full ${color} border-2 border-cirkle-card flex items-center justify-center font-body text-[13px] font-bold text-cirkle-text-dark`}
              aria-hidden="true"
            >
              {initial}
            </span>
          ))}
        </div>
        <p className="font-body text-[14px] text-cirkle-text-light text-left">
          <span className="font-bold text-white">2,400+</span> people finding crews in Delhi
        </p>
      </div>

      {/* Log in */}
      <button
        type="button"
        onClick={() => navigate('/phone')}
        className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] [animation-delay:0.45s] btn-primary w-full max-w-[340px] px-8 py-3.5 mt-10"
      >
        Log in
      </button>
    </div>
  )
}

export default Landing
