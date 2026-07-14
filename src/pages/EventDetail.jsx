import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, Bookmark, Share2, MoreHorizontal, MapPin, CalendarDays } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { useEventsStore, selectEventById } from '../store/eventsStore.js'
import { formatPrice, formatEventDay, formatEventTime } from '../lib/format.js'
import BottomNav from '../components/BottomNav.jsx'

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// The backend does not provide lineup, attendees, or groups yet. These are
// placeholders — replace with real API data once those endpoints exist.
const MOCK_LINEUP = [
  { id: 1, name: 'DJ Nucleya', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&q=80' },
  { id: 2, name: 'Sanaya K', image: 'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=100&q=80' },
  { id: 3, name: 'The Local Train', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&q=80' },
  { id: 4, name: 'TBA', image: 'https://images.unsplash.com/photo-1614786269829-d24616faf56d?w=100&q=80' },
]

const MOCK_ATTENDEES = {
  count: 24,
  overflow: 19,
  visible: [
    { id: 1, name: 'Arjun', image: 'https://images.unsplash.com/photo-1610216705422-caa3fcb6d158?w=60&q=80' },
    { id: 2, name: 'Ananya', image: 'https://images.unsplash.com/photo-1614786269829-d24616faf56d?w=60&q=80' },
    { id: 3, name: 'Rohan', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=60&q=80' },
    { id: 4, name: 'Ishita', image: 'https://images.unsplash.com/photo-1619436277100-90a4d96f8efc?w=60&q=80' },
  ],
}

const MOCK_GROUPS = [
  {
    id: 1,
    name: "Arjun's Group",
    members: 2,
    avatars: [
      'https://images.unsplash.com/photo-1610216705422-caa3fcb6d158?w=40&q=80',
      'https://images.unsplash.com/photo-1614786269829-d24616faf56d?w=40&q=80',
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=40&q=80',
    ],
  },
  {
    id: 2,
    name: "Kabir's Group",
    members: 2,
    avatars: [
      'https://images.unsplash.com/photo-1619436277100-90a4d96f8efc?w=40&q=80',
      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=40&q=80',
    ],
  },
]

// ─── Header ───────────────────────────────────────────────────────────────────
function EventDetailHeader({ onBack }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cirkle-black flex items-center justify-between px-4 h-14">
      <button
        type="button"
        onClick={onBack}
        className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70"
        aria-label="Back"
      >
        <ArrowLeft size={22} strokeWidth={2.5} />
      </button>

      <h1 className="font-body text-[16px] font-semibold text-white absolute left-1/2 -translate-x-1/2">
        Event Details
      </h1>

      <div className="flex items-center gap-3">
        <button type="button" className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70">
          <Upload size={20} strokeWidth={2} />
        </button>
        <button type="button" className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70">
          <Bookmark size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}

// ─── Hero (gradient placeholder — backend has no image URL yet) ────────────────
function EventHero() {
  return (
    <div className="bg-cirkle-black px-4 pt-4 pb-2">
      <div className="relative w-full rounded-[16px] overflow-hidden bg-gradient-to-br from-cirkle-chip to-cirkle-border-card" style={{ aspectRatio: '4/3' }}>
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button type="button" className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70">
            <Share2 size={16} strokeWidth={2} />
          </button>
          <button type="button" className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70">
            <Bookmark size={16} strokeWidth={2} />
          </button>
          <button type="button" className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70">
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Info block ───────────────────────────────────────────────────────────────
function EventInfoBlock({ title, location, day, time, price }) {
  return (
    <div className="bg-cirkle-black px-4 pt-3 pb-4">
      <h2 className="font-body text-[24px] font-bold text-white leading-tight mb-3">{title}</h2>

      <div className="flex items-center gap-2 mb-2">
        <MapPin size={15} strokeWidth={2} className="text-cirkle-text-muted flex-shrink-0" />
        <span className="font-body text-[14px] font-normal text-cirkle-text-muted">{location}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={15} strokeWidth={2} className="text-cirkle-text-muted flex-shrink-0" />
        <span className="font-body text-[14px] font-normal text-cirkle-text-muted">{day} · {time}</span>
      </div>

      <hr className="border-cirkle-border mb-4" />

      <div className="flex items-center justify-between bg-cirkle-card border border-cirkle-border-card rounded-[14px] px-4 py-3">
        <span className="font-body text-[18px] font-semibold text-white">{price}</span>
        <button type="button" className="btn-primary px-6 py-3 text-[15px] font-bold tracking-wide uppercase">
          JOIN THIS EVENT
        </button>
      </div>
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────
function EventAbout({ about }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <h3 className="font-body text-[20px] font-bold text-white mb-3">About</h3>

      <p className={`font-body text-[14px] font-normal text-cirkle-text-muted leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
        {about}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="font-body text-[14px] font-semibold text-cirkle-yellow mt-2 hover:text-cirkle-yellow-hover transition-colors duration-200"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>

      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Lineup (mock) ────────────────────────────────────────────────────────────
function PerformerAvatar({ performer }) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: 'calc(25% - 8px)' }}>
      <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-cirkle-border-card flex-shrink-0">
        <img src={performer.image} alt={performer.name} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <span className="font-body text-[12px] font-medium text-white text-center leading-tight">
        {performer.name}
      </span>
    </div>
  )
}

function EventLineup({ lineup }) {
  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <h3 className="font-body text-[20px] font-bold text-white mb-4">Lineup</h3>
      <div className="flex items-start justify-between">
        {lineup.map((performer) => (
          <PerformerAvatar key={performer.id} performer={performer} />
        ))}
      </div>
      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Venue ────────────────────────────────────────────────────────────────────
function EventVenue({ name, address }) {
  const mapsQuery = encodeURIComponent([name, address].filter(Boolean).join(', '))

  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <h3 className="font-body text-[20px] font-bold text-white mb-3">Venue</h3>
      <p className="font-body text-[16px] font-bold text-white mb-1">{name}</p>
      {address && <p className="font-body text-[13px] font-normal text-cirkle-text-muted mb-4">{address}</p>}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 border border-cirkle-border-card rounded-full px-5 py-2.5 text-white font-body text-[14px] font-medium transition-all duration-200 hover:border-cirkle-yellow hover:text-cirkle-yellow"
      >
        <MapPin size={16} strokeWidth={2} />
        OPEN IN MAPS
      </a>
      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Who's Going (mock) ───────────────────────────────────────────────────────
function EventWhosGoing({ attendees }) {
  const visibleNames = attendees.visible.slice(0, 3)

  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-body text-[20px] font-bold text-white">Who's Going</h3>
        <button type="button" className="font-body text-[14px] font-semibold text-cirkle-yellow hover:text-cirkle-yellow-hover transition-colors duration-200">
          See All
        </button>
      </div>

      <p className="font-body text-[13px] font-normal text-cirkle-text-muted mb-3">
        {attendees.count} attending
      </p>

      <div className="flex items-center mb-2">
        {attendees.visible.map((person, index) => (
          <div
            key={person.id}
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-cirkle-black flex-shrink-0"
            style={{ marginLeft: index === 0 ? '0' : '-12px', zIndex: attendees.visible.length - index }}
          >
            <img src={person.image} alt={person.name} loading="lazy" className="w-full h-full object-cover" />
          </div>
        ))}
        <div
          className="w-11 h-11 rounded-full bg-cirkle-yellow border-2 border-cirkle-black flex items-center justify-center flex-shrink-0"
          style={{ marginLeft: '-12px', zIndex: 0 }}
        >
          <span className="font-body text-[13px] font-bold text-cirkle-text-dark">+{attendees.overflow}</span>
        </div>
      </div>

      <p className="font-body text-[13px] font-normal text-cirkle-text-muted">
        {visibleNames.map((p, i) => (
          <span key={p.id}>
            <span className="text-white font-medium">{p.name}</span>
            {i < visibleNames.length - 1 ? ', ' : ''}
          </span>
        ))}
        {' '}and {attendees.count - 3} others
      </p>

      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Find Your Tribe (mock) ───────────────────────────────────────────────────
function GroupCard({ group }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 bg-cirkle-input border border-cirkle-border rounded-[14px] p-3 min-w-[160px]">
      <div className="flex items-center">
        {group.avatars.slice(0, 3).map((avatar, i) => (
          <img
            key={i}
            src={avatar}
            alt=""
            loading="lazy"
            className="w-8 h-8 rounded-full object-cover border-2 border-cirkle-input"
            style={{ marginLeft: i === 0 ? '0' : '-10px', zIndex: 3 - i }}
          />
        ))}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-body text-[13px] font-semibold text-white truncate">{group.name}</span>
        <span className="font-body text-[11px] font-normal text-cirkle-text-muted">{group.members} members</span>
      </div>
    </div>
  )
}

function EventFindYourTribe({ groups }) {
  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-6">
      <div className="bg-cirkle-card border border-cirkle-border-card rounded-[20px] p-4">
        <p className="font-body text-label uppercase font-bold text-cirkle-yellow mb-2">
          FIND YOUR TRIBE
        </p>
        <h3 className="font-body text-[18px] font-bold text-white leading-snug mb-1">
          Join Groups Going to This Event
        </h3>
        <p className="font-body text-[13px] font-normal text-cirkle-text-muted mb-4">
          Connect with people attending this event
        </p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
        <button type="button" className="w-full btn-primary py-3.5 text-[15px] font-bold">
          Browse Groups
        </button>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Serve from the events cache instantly when we already have it (arriving
  // from the feed); only fetch by id as a fallback (e.g. a direct link).
  const cachedEvent = useEventsStore(selectEventById(id))
  const [fetchedEvent, setFetchedEvent] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [loadError, setLoadError] = useState('')

  const event = cachedEvent ?? fetchedEvent

  useEffect(() => {
    if (cachedEvent) return // already have it — no fetch
    let active = true
    setIsFetching(true)
    setLoadError('')
    api
      .get(`/events/${id}`)
      .then((data) => {
        if (active) setFetchedEvent(data.event)
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load this event.')
      })
      .finally(() => {
        if (active) setIsFetching(false)
      })
    return () => {
      active = false
    }
  }, [id, cachedEvent])

  const isLoading = !event && isFetching

  const location = event
    ? [event.venueName, event.venueAddress].filter(Boolean).join(', ')
    : ''

  return (
    <div className="bg-cirkle-black min-h-screen pb-[60px]">
      <EventDetailHeader onBack={() => navigate(-1)} />

      <main className="pt-14">
        {isLoading && (
          <p className="px-4 mt-6 font-body text-[14px] text-cirkle-text-muted">Loading…</p>
        )}
        {loadError && (
          <p className="px-4 mt-6 font-body text-[14px] text-red-400">{loadError}</p>
        )}

        {event && (
          <>
            <EventHero />
            <EventInfoBlock
              title={event.name}
              location={location}
              day={formatEventDay(event.startsAt)}
              time={formatEventTime(event.startsAt)}
              price={formatPrice(event.price)}
            />
            {event.description && <EventAbout about={event.description} />}
            <EventLineup lineup={MOCK_LINEUP} />
            <EventVenue name={event.venueName} address={event.venueAddress} />
            <EventWhosGoing attendees={MOCK_ATTENDEES} />
            <EventFindYourTribe groups={MOCK_GROUPS} />
          </>
        )}
      </main>

      <BottomNav activeTo="/feed" />
    </div>
  )
}

export default EventDetail
