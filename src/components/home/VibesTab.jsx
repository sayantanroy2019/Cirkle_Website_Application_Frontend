import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, Music2, Martini, Plane, Users, CalendarDays, MapPin } from 'lucide-react'
import { useVibesStore } from '../../store/vibesStore.js'
import { formatEventDay } from '../../lib/format.js'

const CATEGORY_ICON = {
  concert: Music2,
  club: Martini,
  trip: Plane,
  meetup: Users,
}

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
    <div className="relative w-full h-[60vh] bg-gradient-to-br from-cirkle-chip to-cirkle-black overflow-hidden">
      {/* Story-style photo progress segments (top) */}
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

      {/* Initial as a fallback behind the photo (and if it fails to load) */}
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

      {/* Tap zones to move between this person's photos */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={onTapLeft}
            className="absolute left-0 top-0 w-1/2 h-full"
            aria-label="Previous photo"
          />
          <button
            type="button"
            onClick={onTapRight}
            className="absolute right-0 top-0 w-1/2 h-full"
            aria-label="Next photo"
          />
        </>
      )}
    </div>
  )
}

// Shimmering placeholder shaped like the real card — shown while /vibes loads
// so the screen never looks empty or stuck.
function VibesSkeleton() {
  return (
    <div className="pb-[150px] animate-pulse">
      <div className="w-full h-[60vh] bg-cirkle-input" />
      <div className="px-5 pt-6">
        <div className="h-7 w-44 rounded-lg bg-cirkle-input" />
      </div>
      <div className="mx-5 mt-4 h-[78px] rounded-[14px] bg-cirkle-input" />
      <div className="px-5 pt-4 flex flex-wrap gap-2">
        <div className="h-8 w-20 rounded-full bg-cirkle-input" />
        <div className="h-8 w-16 rounded-full bg-cirkle-input" />
        <div className="h-8 w-24 rounded-full bg-cirkle-input" />
        <div className="h-8 w-14 rounded-full bg-cirkle-input" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-24">
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

  useEffect(() => {
    fetchVibes()
  }, [fetchVibes])

  // A photo failing to load usually means its presigned URL expired — pull a
  // fresh feed (with fresh URLs) once, rather than showing broken images.
  const handleImageError = () => {
    if (refetchedForExpiry.current) return
    refetchedForExpiry.current = true
    fetchVibes({ force: true })
  }

  // New person → reset to their first photo and scroll back up to the photo.
  useEffect(() => {
    setPhotoIndex(0)
    window.scrollTo({ top: 0 })
  }, [index])

  if (error && !cards) {
    return <p className="px-6 py-10 font-body text-[14px] text-red-400">{error}</p>
  }
  if (!cards) return <VibesSkeleton /> // covers both the first frame and the fetch
  if (cards.length === 0) return <EmptyState />

  const clampedIndex = Math.min(index, cards.length - 1)
  const card = cards[clampedIndex]
  const { person, event } = card
  const photoCount = person.photos?.length ?? 0

  const goPrev = () => clampedIndex > 0 && setIndex(clampedIndex - 1)
  const goNext = () => clampedIndex < cards.length - 1 && setIndex(clampedIndex + 1)
  const tapLeft = () => setPhotoIndex((i) => Math.max(0, i - 1))
  const tapRight = () => setPhotoIndex((i) => Math.min(photoCount - 1, i + 1))

  return (
    <div className="pb-[150px]">
      {/* Keyed for a quick crossfade when moving between people */}
      <div key={clampedIndex} className="animate-[fadeUp_0.2s_ease]">
        <PhotoHero
          person={person}
          photoIndex={photoIndex}
          onTapLeft={tapLeft}
          onTapRight={tapRight}
          onImageError={handleImageError}
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

      {/* Fixed Vibes bar — above the mobile footer nav (which is md:hidden) */}
      <div className="fixed bottom-[60px] md:bottom-0 inset-x-0 z-40 bg-cirkle-black border-t border-cirkle-border">
        <div className="max-w-[1040px] mx-auto flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={clampedIndex === 0}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full border border-cirkle-border-card text-white transition-all duration-200 hover:border-cirkle-yellow hover:text-cirkle-yellow disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous person"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/events/${event.id}`)}
            className="btn-primary flex-1 py-3.5 text-[15px] font-bold"
          >
            Join me
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={clampedIndex === cards.length - 1}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full border border-cirkle-border-card text-white transition-all duration-200 hover:border-cirkle-yellow hover:text-cirkle-yellow disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next person"
          >
            <ChevronRight size={22} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default VibesTab
