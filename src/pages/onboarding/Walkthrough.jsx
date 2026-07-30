import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { Music2, CalendarDays, MapPin, Ticket, ArrowRight, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'

// A card built from the app's own visual vocabulary (photo hero + event strip +
// Join me pill), used as the hero illustration on each walkthrough screen.
function MockCard({ initial = 'A', name = 'Aisha', age = 24, joinGlow = false, youBadge = false }) {
  return (
    <div
      className={`relative w-[230px] rounded-[20px] overflow-hidden bg-cirkle-card border shadow-[0_24px_60px_-18px_rgba(0,0,0,0.75)] ${
        youBadge ? 'border-cirkle-yellow' : 'border-cirkle-border-card'
      }`}
    >
      {/* Photo hero */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-cirkle-chip to-cirkle-black overflow-hidden">
        <div className="absolute top-3 inset-x-3 flex gap-1.5">
          <span className="h-[3px] flex-1 rounded-full bg-white" />
          <span className="h-[3px] flex-1 rounded-full bg-white/30" />
          <span className="h-[3px] flex-1 rounded-full bg-white/30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[110px] leading-none text-white/12 uppercase select-none">
            {initial}
          </span>
        </div>
        {youBadge && (
          <span className="absolute top-6 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-cirkle-yellow text-cirkle-text-dark font-body text-[11px] font-bold uppercase tracking-wide">
            You
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black/85 to-transparent">
          <p className="font-body text-[18px] font-medium text-white leading-tight">
            {name}, {age}
          </p>
        </div>
      </div>

      {/* Event strip */}
      <div className="flex items-center gap-2.5 px-3 pt-3">
        <span className="w-8 h-8 shrink-0 rounded-full bg-cirkle-chip flex items-center justify-center">
          <Music2 size={15} className="text-cirkle-yellow" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-body text-[13px] font-semibold text-white truncate">Neon Nights</p>
          <div className="mt-0.5 flex items-center gap-1 font-body text-[10.5px] text-cirkle-text-muted">
            <CalendarDays size={11} strokeWidth={2} className="shrink-0" />
            <span className="truncate">Sat</span>
            <span className="text-cirkle-border-card">·</span>
            <MapPin size={11} strokeWidth={2} className="shrink-0" />
            <span className="truncate">Kitty Su</span>
          </div>
        </div>
      </div>

      {/* Join me pill */}
      <div className="px-3 py-3">
        <div
          className={`rounded-full text-center py-2 font-body text-[13px] font-bold transition-all ${
            joinGlow
              ? 'bg-cirkle-yellow text-cirkle-text-dark shadow-[0_0_28px_rgba(231,234,74,0.65)]'
              : 'bg-cirkle-chip text-cirkle-text-light'
          }`}
        >
          Join me
        </div>
      </div>
    </div>
  )
}

// Screen 1 — stacked deck with a tilted peek behind, plus the swipe hint.
function DiscoverVisual() {
  return (
    <div className="relative w-[230px] h-[360px]">
      <div className="absolute inset-0 translate-x-6 rotate-[7deg] scale-[0.94] opacity-45">
        <MockCard initial="R" name="Rohan" age={26} />
      </div>
      <div className="absolute inset-0">
        <MockCard initial="A" name="Aisha" age={24} />
      </div>
      {/* Swipe-left hint */}
      <div className="absolute -bottom-11 inset-x-0 flex items-center justify-center gap-2 text-cirkle-text-muted">
        <ChevronLeft
          size={22}
          strokeWidth={2.5}
          className="text-cirkle-yellow"
          style={{ animation: 'swipeHint 1.4s ease-in-out infinite' }}
        />
        <span className="font-body text-[13px] font-semibold">Swipe to explore</span>
      </div>
    </div>
  )
}

// Screen 2 — a card whose Join me pill glows, with a ticket "you're in" beat.
function JoinVisual() {
  return (
    <div className="relative w-[230px] h-[360px] flex items-center justify-center">
      <MockCard initial="A" name="Aisha" age={24} joinGlow />
      <div className="absolute -right-3 -bottom-4 flex items-center gap-2 px-3 py-2 rounded-full bg-cirkle-card border border-cirkle-border-card shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)]">
        <Ticket size={16} className="text-cirkle-yellow" strokeWidth={2} />
        <span className="font-body text-[12px] font-bold text-white">You're in</span>
      </div>
    </div>
  )
}

// Screen 3 — the user's own card, lit up as it joins the feed.
function YourTurnVisual() {
  return (
    <div className="relative w-[230px] h-[360px] flex items-center justify-center">
      <div
        className="absolute w-[240px] h-[300px] rounded-full blur-3xl bg-cirkle-yellow/20"
        style={{ animation: 'softPulse 2.4s ease-in-out infinite' }}
      />
      <div className="relative">
        <MockCard initial="Y" name="You" age={23} youBadge />
      </div>
    </div>
  )
}

const SCREENS = [
  {
    Visual: DiscoverVisual,
    headline: "See who's going out",
    body: 'Swipe through people heading to events near you. Everyone you see has already booked their spot.',
  },
  {
    Visual: JoinVisual,
    headline: 'Found your kind of plan?',
    body: "Tap 'Join me' on anyone's card and you'll jump straight to their event. Grab your ticket and you're in.",
  },
  {
    Visual: YourTurnVisual,
    headline: "Then it's your turn",
    body: 'Once you book, your profile joins the feed — and someone else might come along with you.',
  },
]

export function Walkthrough() {
  const navigate = useNavigate()
  const markWalkthroughSeen = useAuthStore((s) => s.markWalkthroughSeen)
  const walkthroughSeen = useAuthStore((s) => s.walkthroughSeen)

  const containerRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [{ x }, spring] = useSpring(() => ({ x: 0 }))

  const width = () => containerRef.current?.clientWidth ?? window.innerWidth

  // Guard: if already dismissed (e.g. manual nav or refresh after finishing),
  // don't show it again — go straight to the Feed.
  useEffect(() => {
    if (walkthroughSeen) navigate('/feed', { replace: true })
  }, [walkthroughSeen, navigate])

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(SCREENS.length - 1, i))
    setIndex(clamped)
    spring.start({ x: -clamped * width(), config: { tension: 280, friction: 32 } })
  }

  // Keep the active screen aligned if the viewport is resized.
  useEffect(() => {
    const onResize = () => spring.set({ x: -index * width() })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [index, spring])

  const finish = () => {
    markWalkthroughSeen()
    navigate('/feed', { replace: true })
  }

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], last }) => {
      const w = width()
      if (last) {
        const flung = Math.abs(mx) > w * 0.22 || vx > 0.35
        if (flung && mx < 0) goTo(index + 1) // swipe left → next
        else if (flung && mx > 0) goTo(index - 1) // swipe right → back
        else goTo(index) // spring back
      } else {
        // Rubber-band a little past the edges so it feels bounded, not stuck.
        let next = -index * w + mx
        const min = -(SCREENS.length - 1) * w
        if (next > 0) next = mx * 0.35
        else if (next < min) next = min + (next - min) * 0.35
        spring.start({ x: next, immediate: down })
      }
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } },
  )

  const isLast = index === SCREENS.length - 1

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-cirkle-black overflow-hidden select-none"
    >
      {/* Ambient glow — the "stunning" backdrop, from the app's pastel palette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 22%, rgba(201,179,240,0.16), transparent 55%), radial-gradient(circle at 80% 80%, rgba(240,168,168,0.10), transparent 50%)',
        }}
      />

      {/* Skip — top-right, hidden on the final screen (replaced by Start exploring) */}
      {!isLast && (
        <button
          type="button"
          onClick={finish}
          className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-5 z-20 font-body text-[14px] font-semibold text-cirkle-text-muted hover:text-white transition-colors"
        >
          Skip
        </button>
      )}

      {/* Swipeable filmstrip */}
      <animated.div
        {...bind()}
        style={{ x, touchAction: 'pan-y' }}
        className="relative z-10 flex h-full will-change-transform"
      >
        {SCREENS.map(({ Visual, headline, body }, i) => {
          const active = i === index
          return (
            <div
              key={headline}
              className="shrink-0 w-screen h-full flex flex-col items-center justify-center px-8 text-center pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+11rem)]"
            >
              <div className="flex-1 flex items-center justify-center">
                <Visual />
              </div>
              <div
                className={`w-full max-w-[400px] ${active ? 'animate-[fadeUp_0.5s_ease_forwards]' : 'opacity-0'}`}
              >
                <h1 className="font-body text-[28px] font-medium text-white leading-tight tracking-tight">
                  {headline}
                </h1>
                <p className="mt-3 font-body text-[15px] text-cirkle-text-light leading-[1.6] max-w-[340px] mx-auto">
                  {body}
                </p>
              </div>
            </div>
          )
        })}
      </animated.div>

      {/* Bottom controls: dots + (on the last screen) the entry button */}
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-20 flex flex-col items-center gap-6 px-8">
        <div className="flex items-center gap-2">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to screen ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-cirkle-yellow' : 'w-2 bg-white/25'
              }`}
            />
          ))}
        </div>

        {isLast && (
          <button
            type="button"
            onClick={finish}
            className="btn-primary w-full max-w-[340px] px-8 py-3.5 animate-[fadeUp_0.5s_ease_forwards]"
          >
            Start exploring
            <ArrowRight size={18} strokeWidth={2.5} className="ml-2" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Walkthrough
