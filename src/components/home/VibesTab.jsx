import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { Sparkles, Music2, Martini, Plane, Users, CalendarDays, MapPin } from 'lucide-react'
import { useVibesStore } from '../../store/vibesStore.js'
import { useGateStore } from '../../store/gateStore.js'
import CreateProfilePrompt from '../CreateProfilePrompt.jsx'
import { formatEventDay } from '../../lib/format.js'

const CATEGORY_ICON = {
  concert: Music2,
  club: Martini,
  trip: Plane,
  meetup: Users,
}

// A flick past this distance (px) or velocity throws the card to the next person.
const SWIPE_DISTANCE = 90
const SWIPE_VELOCITY = 0.3

function EventStrip({ event }) {
  const Icon = CATEGORY_ICON[event.categoryId] ?? CalendarDays
  return (
    <div className="mx-5 mt-4 flex items-center gap-3 rounded-[14px] bg-cirkle-input border border-cirkle-border-card p-3.5">
      <span className="w-10 h-10 shrink-0 rounded-full bg-cirkle-chip flex items-center justify-center">
        <Icon size={18} className="text-cirkle-yellow" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[15px] font-semibold text-white truncate">{event.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 font-body text-[12.5px] text-cirkle-text-muted">
          <CalendarDays size={13} className="shrink-0" strokeWidth={2} />
          <span className="truncate">{formatEventDay(event.startsAt)}</span>
          <span className="text-cirkle-border-card">·</span>
          <MapPin size={13} className="shrink-0" strokeWidth={2} />
          <span className="truncate">{event.venueName}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cirkle-yellow" />
          <span className="font-body text-[13px] font-bold text-cirkle-yellow">{event.goingCount} going</span>
        </div>
      </div>
    </div>
  )
}

function PhotoHero({ person, photoIndex, onTapLeft, onTapRight, onImageError }) {
  const photos = person.photos ?? []
  const total = Math.max(photos.length, 1)
  const currentUrl = photos[photoIndex]?.url
  return (
    <div className="relative w-full aspect-[4/5] bg-gradient-to-br from-cirkle-chip to-cirkle-black overflow-hidden">
      {photos.length > 1 && (
        <div className="absolute top-3 inset-x-3 z-10 flex gap-1.5">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-all duration-200 ${
                i <= photoIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-[140px] leading-none text-white/15 uppercase select-none">
          {person.firstName?.[0] ?? '?'}
        </span>
      </div>

      {currentUrl && (
        <img
          src={currentUrl}
          alt={person.firstName}
          onError={onImageError}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Tap zones to move between this person's photos (only on the interactive card) */}
      {total > 1 && onTapLeft && (
        <>
          <button type="button" onClick={onTapLeft} className="absolute left-0 top-0 w-1/2 h-full" aria-label="Previous photo" />
          <button type="button" onClick={onTapRight} className="absolute right-0 top-0 w-1/2 h-full" aria-label="Next photo" />
        </>
      )}
    </div>
  )
}

// One person's scrollable profile. `scrollable` false is used for the peek card
// behind the deck (no scroll, no photo taps).
function ProfileCard({ card, photoIndex = 0, onTapLeft, onTapRight, onImageError, scrollRef, scrollable = true }) {
  const { person, event } = card
  return (
    <div
      ref={scrollRef}
      className={`h-full ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} overflow-x-hidden bg-cirkle-black`}
    >
      <div className="max-w-[440px] mx-auto pb-24">
        <PhotoHero
          person={person}
          photoIndex={photoIndex}
          onTapLeft={onTapLeft}
          onTapRight={onTapRight}
          onImageError={onImageError}
        />

        <h2 className="px-5 pt-6 font-body text-[28px] font-medium text-white leading-tight">
          {person.firstName}, {person.age}
        </h2>

        <EventStrip event={event} />

        {person.tagline && (
          <p className="px-5 pt-4 font-body text-[16px] text-cirkle-text-light leading-[1.6]">
            {person.tagline}
          </p>
        )}

        {person.lifestyleTags?.length > 0 && (
          <div className="px-5 pt-4 flex flex-wrap gap-2">
            {person.lifestyleTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-cirkle-chip text-cirkle-text-light font-body text-[13px] font-semibold"
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VibesSkeleton() {
  return (
    <div className="h-full overflow-hidden animate-pulse">
      <div className="max-w-[440px] mx-auto">
        <div className="w-full aspect-[4/5] bg-cirkle-input" />
        <div className="px-5 pt-6">
          <div className="h-7 w-44 rounded-lg bg-cirkle-input" />
        </div>
        <div className="mx-5 mt-4 h-[78px] rounded-[14px] bg-cirkle-input" />
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          <div className="h-8 w-20 rounded-full bg-cirkle-input" />
          <div className="h-8 w-16 rounded-full bg-cirkle-input" />
          <div className="h-8 w-24 rounded-full bg-cirkle-input" />
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <span className="w-16 h-16 rounded-full bg-cirkle-chip flex items-center justify-center">
        <Sparkles size={30} className="text-cirkle-yellow" strokeWidth={2} />
      </span>
      <h2 className="mt-6 font-display text-section-md text-white uppercase">No vibes yet</h2>
      <p className="mt-2 font-body text-[15px] text-cirkle-text-muted max-w-[320px]">
        Grab a ticket to an event and you'll show up here for others to find.
      </p>
    </div>
  )
}

export function VibesTab() {
  const navigate = useNavigate()
  const cards = useVibesStore((s) => s.cards)
  const index = useVibesStore((s) => s.index)
  const error = useVibesStore((s) => s.error)
  const fetchVibes = useVibesStore((s) => s.fetchVibes)
  const setIndex = useVibesStore((s) => s.setIndex)

  const [photoIndex, setPhotoIndex] = useState(0)
  const refetchedForExpiry = useRef(false)
  const scrollRef = useRef(null)
  const [{ x, rot, scale }, spring] = useSpring(() => ({ x: 0, rot: 0, scale: 1 }))

  const cardsLen = cards?.length ?? 0
  const clampedIndex = Math.min(index, Math.max(0, cardsLen - 1))
  const hasPrev = clampedIndex > 0
  const hasNext = clampedIndex < cardsLen - 1

  // The feed is reciprocal — you see people only once you can be seen. Only
  // fetch once the profile is known complete; a Browser gets the prompt.
  const profileComplete = useGateStore((s) => s.profileComplete)
  const ensureKnown = useGateStore((s) => s.ensureKnown)
  useEffect(() => {
    ensureKnown()
  }, [ensureKnown])
  useEffect(() => {
    if (profileComplete === true) fetchVibes()
  }, [profileComplete, fetchVibes])

  // New person → reset photo + scroll to top, and pop the fresh card in.
  useEffect(() => {
    setPhotoIndex(0)
    scrollRef.current?.scrollTo({ top: 0 })
    spring.set({ x: 0, rot: 0 })
    spring.start({ from: { scale: 0.96 }, to: { scale: 1 } })
  }, [index, spring])

  const handleImageError = () => {
    if (refetchedForExpiry.current) return
    refetchedForExpiry.current = true
    fetchVibes({ force: true })
  }

  // Swipe left = next person, swipe right = previous. Card follows the finger,
  // tilts, and throws off-screen when flicked; otherwise it springs back.
  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], last }) => {
      const flung = Math.abs(mx) > SWIPE_DISTANCE || vx > SWIPE_VELOCITY
      if (last) {
        if (flung && mx < 0 && hasNext) {
          spring.start({ x: -window.innerWidth * 1.3, rot: -16, config: { tension: 260, friction: 32 }, onRest: () => setIndex(clampedIndex + 1) })
        } else if (flung && mx > 0 && hasPrev) {
          spring.start({ x: window.innerWidth * 1.3, rot: 16, config: { tension: 260, friction: 32 }, onRest: () => setIndex(clampedIndex - 1) })
        } else {
          spring.start({ x: 0, rot: 0, config: { tension: 420, friction: 32 } })
        }
      } else {
        spring.start({ x: mx, rot: mx / 18, immediate: down })
      }
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } },
  )

  if (profileComplete === false) {
    return (
      <CreateProfilePrompt
        message="Create your profile to see who’s going where."
        returnTo="/feed"
      />
    )
  }
  if (error && !cards) {
    return <p className="h-full flex items-center justify-center px-6 font-body text-[14px] text-red-400">{error}</p>
  }
  if (!cards) return <VibesSkeleton />
  if (cardsLen === 0) return <EmptyState />

  const card = cards[clampedIndex]
  const nextCard = cards[clampedIndex + 1]
  const { person, event } = card
  const photoCount = person.photos?.length ?? 0
  const tapLeft = () => setPhotoIndex((i) => Math.max(0, i - 1))
  const tapRight = () => setPhotoIndex((i) => Math.min(photoCount - 1, i + 1))

  return (
    <div className="relative h-full overflow-hidden select-none">
      {/* Peek of the next card behind the deck */}
      {nextCard && (
        <div className="absolute inset-0 pointer-events-none scale-[0.96] opacity-70">
          <ProfileCard card={nextCard} scrollable={false} />
        </div>
      )}

      {/* Front card — draggable, follows the finger and throws */}
      <animated.div
        {...bind()}
        style={{ x, rotateZ: rot, scale, touchAction: 'pan-y' }}
        className="absolute inset-0 will-change-transform"
      >
        <ProfileCard
          card={card}
          photoIndex={photoIndex}
          onTapLeft={tapLeft}
          onTapRight={tapRight}
          onImageError={handleImageError}
          scrollRef={scrollRef}
        />
      </animated.div>

      {/* Join me — floating bottom-right */}
      <button
        type="button"
        onClick={() => navigate(`/events/${event.id}`)}
        className="absolute bottom-4 right-4 z-20 btn-primary rounded-full px-6 py-3.5 text-[15px] font-bold shadow-lg shadow-black/40"
      >
        Join me
      </button>
    </div>
  )
}

export default VibesTab
