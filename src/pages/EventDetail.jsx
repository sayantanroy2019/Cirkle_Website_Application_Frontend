import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
// Upload, Bookmark, Share2, MoreHorizontal are commented out along with the
// share/save/more buttons below — add them back here when those are implemented.
import { ArrowLeft, MapPin, CalendarDays, FileText } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { useEventsStore, selectEventById } from '../store/eventsStore.js'
import { useProfileStore } from '../store/profileStore.js'
import { formatPrice, formatEventDay, formatEventTime, instagramUrl } from '../lib/format.js'
import BottomNav from '../components/BottomNav.jsx'
import ArtistAvatar from '../components/ArtistAvatar.jsx'
import InstagramIcon from '../components/InstagramIcon.jsx'
import SocialHandlesDialog from '../components/SocialHandlesDialog.jsx'
import PersonAvatar from '../components/PersonAvatar.jsx'
import AttendeeProfileSheet from '../components/AttendeeProfileSheet.jsx'
import { socialGateMissing, PLATFORM_LABELS } from '../lib/socialHandles.js'
import {
  requiredHandlesFor,
  missingHandles,
  formNeededFor,
  markFormConfirmed,
} from '../lib/eventGate.js'
import { useBackOr } from '../lib/navigation.js'

// Only the first few attendees are needed for the avatar row — "See All" opens
// the paginated list. `total` from the response drives the count and +N badge.
const PREVIEW_ATTENDEES = 4

// Find Your Tribe / Browse Groups — deferred to Phase 2 (groups).
/*
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
*/

// ─── Header ───────────────────────────────────────────────────────────────────
function EventDetailHeader({ onBack }) {
  return (
    <header className="flex-none bg-cirkle-black flex items-center justify-between px-4 h-14">
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

      {/* Share / save — hidden until they do something. Restore with the
          Upload and Bookmark imports at the top of this file.
      <div className="flex items-center gap-3">
        <button type="button" className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70">
          <Upload size={20} strokeWidth={2} />
        </button>
        <button type="button" className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70">
          <Bookmark size={20} strokeWidth={2} />
        </button>
      </div>
      */}
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
// 16:9 to match the ratio the admin portal crops banners to. The gradient stays
// underneath as the placeholder, so an event with no banner — or an expired
// presigned URL (~1hr TTL) — degrades to it instead of a broken image.
function EventHero({ bannerUrl, name }) {
  const [bannerOk, setBannerOk] = useState(true)

  return (
    <div className="bg-cirkle-black px-4 pt-4 pb-2">
      <div className="relative w-full rounded-[16px] overflow-hidden bg-gradient-to-br from-cirkle-chip to-cirkle-border-card" style={{ aspectRatio: '16/9' }}>
        {bannerUrl && bannerOk && (
          <img
            src={bannerUrl}
            alt={name}
            onError={() => setBannerOk(false)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Share / save / more — hidden until they do something. Restore with
            the Share2, Bookmark and MoreHorizontal imports at the top.
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
        */}
      </div>
    </div>
  )
}

// The single call-to-action, derived from ticket ownership, event type, and
// (for invite-only) the user's invitation status.
function EventCta({
  userHasTicket,
  eventType,
  invitationStatus,
  isRequestingInvite,
  soldOut,
  hasCategories,
  onChooseTicket,
  onViewTicket,
  onRequestInvite,
}) {
  const base = 'px-6 py-3 text-[15px] font-bold tracking-wide uppercase'

  // Every buy path lands on the category page, so the reasons you can't get
  // there are shared between open and invite-only events.
  const blocked = soldOut ? 'Sold out' : !hasCategories ? 'Not yet available' : null
  const buyButton = (label) =>
    blocked ? (
      <button type="button" disabled className={`btn-secondary ${base} opacity-40 pointer-events-none`}>
        {blocked}
      </button>
    ) : (
      <button type="button" onClick={onChooseTicket} className={`btn-primary ${base}`}>
        {label}
      </button>
    )

  if (userHasTicket) {
    return (
      <button type="button" onClick={onViewTicket} className={`btn-secondary ${base}`}>
        You have a ticket →
      </button>
    )
  }

  if (eventType === 'invite_only') {
    if (invitationStatus === 'accepted') {
      return buyButton('Book a ticket')
    }
    if (invitationStatus === 'pending') {
      return (
        <button type="button" disabled className={`btn-primary ${base} opacity-40 pointer-events-none`}>
          Invite requested
        </button>
      )
    }
    if (invitationStatus === 'rejected') {
      return (
        <button type="button" disabled className={`btn-secondary ${base} opacity-40 pointer-events-none`}>
          Access denied
        </button>
      )
    }
    // null — no request yet
    return (
      <button
        type="button"
        onClick={onRequestInvite}
        disabled={isRequestingInvite}
        className={`btn-primary ${base} disabled:opacity-40 disabled:pointer-events-none`}
      >
        {isRequestingInvite ? 'Requesting…' : 'Request invite'}
      </button>
    )
  }

  // open event
  return buyButton('Buy ticket')
}

// With categories the detail page no longer quotes one price, so it shows the
// cheapest as a "from". Categories arrive cheapest-first, but min() rather than
// [0] so this can't silently mislead if that ordering ever changes.
function entryPrice(event) {
  const categories = event.ticketCategories ?? []
  if (categories.length === 0) return formatPrice(event.price)
  const cheapest = Math.min(...categories.map((c) => c.pricePaise))
  return categories.length === 1 ? formatPrice(cheapest) : `From ${formatPrice(cheapest)}`
}

const INVITE_NOTE = {
  '': 'This is an invite-only event. The organizer approves who can buy a ticket.',
  pending: 'Request sent. Waiting for the organizer to approve your access.',
  rejected: "The organizer didn't approve access to this event.",
  accepted: "You're approved — you can buy your ticket.",
}

// Heads-up copy so the gate isn't a surprise. Names the action the organizer's
// requirements stand in front of, since it differs by event type.
function requirementNote(requiredHandles, hasForm, eventType) {
  const labels = requiredHandles.map((p) => PLATFORM_LABELS[p]).join(' and ')
  const action = eventType === 'invite_only' ? 'to request an invite' : 'to buy a ticket'
  if (requiredHandles.length > 0 && hasForm) {
    return `Requires your ${labels} and a short form from the organizer ${action}.`
  }
  if (hasForm) return `The organizer asks a few questions ${action}.`
  return `Requires your ${labels} to attend.`
}

function EventInfoBlock({
  title,
  location,
  day,
  time,
  price,
  organizerInstagram,
  requiredHandles,
  hasForm,
  userHasTicket,
  eventType,
  invitationStatus,
  isRequestingInvite,
  ticketCategories,
  soldOut,
  onChooseTicket,
  onViewTicket,
  onRequestInvite,
}) {
  const showInviteNote = eventType === 'invite_only' && !userHasTicket
  const organizerIgUrl = instagramUrl(organizerInstagram)

  return (
    <div className="bg-cirkle-black px-4 pt-3 pb-4">
      <h2 className="font-body text-[24px] font-bold text-white leading-tight mb-3">{title}</h2>

      <div className="flex items-center gap-2 mb-2">
        <MapPin size={15} strokeWidth={2} className="text-cirkle-text-muted flex-shrink-0" />
        <span className="font-body text-[14px] font-normal text-cirkle-text-muted">{location}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={15} strokeWidth={2} className="text-cirkle-text-muted flex-shrink-0" />
        <span className="font-body text-[14px] font-normal text-cirkle-text-muted">{day} · {time}</span>
      </div>

      {/* Organizer's Instagram — deliberately understated: just the handle, linked out. */}
      {organizerIgUrl && (
        <a
          href={organizerIgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mb-2 text-cirkle-text-muted transition-colors duration-200 hover:text-cirkle-yellow"
        >
          <InstagramIcon size={15} className="flex-shrink-0" />
          <span className="font-body text-[14px] font-normal">@{organizerInstagram.replace(/^@/, '')}</span>
        </a>
      )}

      <hr className="border-cirkle-border mb-4 mt-2" />

      <div className="flex items-center justify-between bg-cirkle-card border border-cirkle-border-card rounded-[14px] px-4 py-3">
        <span className="font-body text-[18px] font-semibold text-white">{price}</span>
        {/* The key is load-bearing, not decoration.
            Without it React reuses one <button> and swaps its text and opacity
            in place. Because .btn-primary carries `transition-all`, iOS Safari
            was compositing the new label over the old frame — "Request invite"
            and "Invite requested" visibly stacked, at the pre-change brightness,
            until a navigation forced a repaint.
            Changing the key remounts the component, so each CTA state gets a
            fresh element and there is no in-place mutation to leave a ghost. */}
        <EventCta
          key={`${userHasTicket}|${invitationStatus ?? 'none'}|${soldOut}|${ticketCategories.length > 0}`}
          userHasTicket={userHasTicket}
          eventType={eventType}
          invitationStatus={invitationStatus}
          isRequestingInvite={isRequestingInvite}
          soldOut={soldOut}
          hasCategories={ticketCategories.length > 0}
          onChooseTicket={onChooseTicket}
          onViewTicket={onViewTicket}
          onRequestInvite={onRequestInvite}
        />
      </div>

      {showInviteNote && (
        <p className="mt-2 font-body text-[13px] text-cirkle-text-muted">
          {INVITE_NOTE[invitationStatus ?? '']}
        </p>
      )}

      {/* Heads-up so the gate isn't a surprise. The server still enforces the
          handles — this is only a warning, and it's pointless once they
          already hold a ticket. */}
      {!userHasTicket && (requiredHandles.length > 0 || hasForm) && (
        <p className="mt-2 font-body text-[13px] text-cirkle-text-muted">
          {requirementNote(requiredHandles, hasForm, eventType)}
        </p>
      )}
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

// ─── Itinerary ────────────────────────────────────────────────────────────────
// Only rendered when the organizer uploaded an itinerary PDF — the caller
// guards on event.itineraryUrl, so an event without one shows no trace of
// this section. The URL is presigned (~1hr): always taken fresh from the
// event fetch, never cached.
function EventItinerary({ url }) {
  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <h3 className="font-body text-[20px] font-bold text-white mb-3">Itinerary</h3>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-cirkle-border-card bg-cirkle-card px-4 py-3.5 hover:border-cirkle-yellow transition-colors duration-200"
      >
        <FileText size={20} className="shrink-0 text-cirkle-yellow" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-body text-[14px] font-semibold text-white">
            Event itinerary
          </span>
          <span className="block font-body text-[12px] text-cirkle-text-muted">
            PDF · tap to view or download
          </span>
        </span>
      </a>

      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Lineup ───────────────────────────────────────────────────────────────────
// Artists come back from the API already ordered by position (headliner = 0),
// but sort defensively so the headliner leads regardless of response order.
function EventLineup({ artists }) {
  const ordered = [...artists].sort((a, b) => a.position - b.position)

  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <h3 className="font-body text-[20px] font-bold text-white mb-4">Lineup</h3>
      {/* Scrolls horizontally — a lineup can be longer than one screen width. */}
      <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {ordered.map((artist) => (
          <ArtistAvatar key={artist.id} artist={artist} />
        ))}
      </div>
      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
// Square tiles matching the ratio the admin portal crops gallery images to.
// object-cover keeps them uniform even for images uploaded before that crop
// step existed, which have arbitrary ratios.
function GalleryTile({ url, index }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null

  return (
    <div className="flex-shrink-0 w-[140px] aspect-square rounded-[12px] overflow-hidden border border-cirkle-border-card bg-gradient-to-br from-cirkle-chip to-cirkle-border-card">
      <img
        src={url}
        alt={`Event photo ${index + 1}`}
        loading="lazy"
        onError={() => setOk(false)}
        className="w-full h-full object-cover"
      />
    </div>
  )
}

function EventGallery({ gallery }) {
  const ordered = [...gallery].sort((a, b) => a.position - b.position)

  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <h3 className="font-body text-[20px] font-bold text-white mb-4">Gallery</h3>
      <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {ordered.map((photo, i) => (
          <GalleryTile key={photo.url ?? i} url={photo.url} index={i} />
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

// ─── Who's Going ──────────────────────────────────────────────────────────────
// Builds "Arjun, Ananya and 21 others" from however many names we actually have,
// rather than assuming there are at least three.
function attendeeSummary(people, total) {
  const named = people.slice(0, 3).map((p) => (p.isYou ? 'You' : p.firstName))
  if (named.length === 0) return null
  const others = total - named.length
  const list =
    named.length === 1
      ? named[0]
      : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
  if (others <= 0) return `${list} ${named.length === 1 ? 'is' : 'are'} going`
  return `${list} and ${others} other${others === 1 ? '' : 's'}`
}

function EventWhosGoing({ people, total, onSeeAll, onSelect }) {
  const visible = people.slice(0, 4)
  const overflow = total - visible.length
  const summary = attendeeSummary(people, total)

  return (
    <section className="bg-cirkle-black px-4 pt-5 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-body text-[20px] font-bold text-white">Who's Going</h3>
        {total > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="font-body text-[14px] font-semibold text-cirkle-yellow hover:text-cirkle-yellow-hover transition-colors duration-200"
          >
            See All
          </button>
        )}
      </div>

      <p className="font-body text-[13px] font-normal text-cirkle-text-muted mb-3">
        {total === 0 ? 'Nobody has booked yet' : `${total} attending`}
      </p>

      {visible.length > 0 && (
        <div className="flex items-center mb-2">
          {visible.map((person, index) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person)}
              className="rounded-full border-2 border-cirkle-black flex-shrink-0 transition-transform duration-200 hover:scale-105"
              style={{ marginLeft: index === 0 ? '0' : '-12px', zIndex: visible.length - index }}
              aria-label={`${person.firstName}'s profile`}
            >
              <PersonAvatar person={person} size={44} />
            </button>
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={onSeeAll}
              className="w-11 h-11 rounded-full bg-cirkle-yellow border-2 border-cirkle-black flex items-center justify-center flex-shrink-0"
              style={{ marginLeft: '-12px', zIndex: 0 }}
              aria-label={`See all ${total} attendees`}
            >
              <span className="font-body text-[13px] font-bold text-cirkle-text-dark">+{overflow}</span>
            </button>
          )}
        </div>
      )}

      {summary && (
        <p className="font-body text-[13px] font-normal text-cirkle-text-muted">{summary}</p>
      )}

      <hr className="border-cirkle-border mt-5" />
    </section>
  )
}

// ─── Find Your Tribe (mock) — deferred to Phase 2 (groups) ────────────────────
/*
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
*/

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  // A shared link opens this page as the first entry in a fresh tab; back
  // then lands on the feed instead of leaving the app.
  const goBack = useBackOr('/feed')

  // Stale-while-revalidate: paint the cached event instantly (from the feed),
  // then fetch the detail in the background — the detail carries
  // userHasTicket/soldOut, which the cached list object lacks. The fetched copy
  // wins once it arrives.
  const cachedEvent = useEventsStore(selectEventById(id))
  const [fetchedEvent, setFetchedEvent] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [isRequestingInvite, setIsRequestingInvite] = useState(false)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)
  // Non-null while the gate dialog is open: { missing, withForm, intent }.
  // `missing` may be empty — the organizer's Google Form alone can open the
  // gate with no handles to collect; `withForm` says whether to show the form
  // section; `intent` is the action to resume once the user gets through:
  // 'invite' (request an invitation) or 'buy' (go pick a ticket).
  const [gate, setGate] = useState(null)
  // Who's Going preview — fetched separately from the event itself.
  const [attendees, setAttendees] = useState([])
  const [attendeeTotal, setAttendeeTotal] = useState(0)
  const [selectedPerson, setSelectedPerson] = useState(null)

  const event = fetchedEvent ?? cachedEvent

  useEffect(() => {
    let active = true
    setLoadError('')
    api
      .get(`/events/${id}`)
      .then((data) => {
        if (active) setFetchedEvent(data.event)
      })
      .catch((err) => {
        // Only surface an error if there's nothing cached to show.
        if (active && !cachedEvent) {
          setLoadError(err instanceof ApiError ? err.message : 'Could not load this event.')
        }
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Attendees are a separate call — a failure here must not blank the event, so
  // it's swallowed and the section simply shows nobody.
  useEffect(() => {
    let active = true
    api
      .get(`/events/${id}/attendees`, { params: { limit: PREVIEW_ATTENDEES } })
      .then((res) => {
        if (!active) return
        setAttendees(res.data)
        setAttendeeTotal(res.total)
      })
      .catch(() => {
        /* section renders empty */
      })
    return () => {
      active = false
    }
  }, [id])

  const isLoading = !event && !loadError

  const location = event
    ? [event.venueName, event.venueAddress].filter(Boolean).join(', ')
    : ''

  // Flags are only present on the detail response, so the cached list object
  // yields an empty list until the fetch lands.
  const requiredHandles = requiredHandlesFor(event)

  // Merge a field into the currently-shown event (keeps SWR fetched copy authoritative).
  const patchEvent = (fields) => setFetchedEvent((prev) => ({ ...(prev ?? cachedEvent), ...fields }))

  const handleRequestInvite = async () => {
    if (isRequestingInvite) return
    setIsRequestingInvite(true)
    try {
      // Everything the organizer asks for is collected in ONE dialog, before
      // the request is sent: the handles the profile lacks (mirroring the
      // server's gate, so the user isn't asked for ones they already have)
      // plus the Google Form, if any. The server's 403 below stays as the
      // authoritative fallback should the cached profile be stale.
      const needsForm = formNeededFor(event, 'invite')
      const profile = requiredHandles.length > 0 ? await fetchProfile() : null
      const missing = missingHandles(event, profile)
      if (missing.length > 0 || needsForm) {
        setGate({ missing, withForm: needsForm, intent: 'invite' })
        return
      }

      const res = await api.post(`/events/${id}/invitations`)
      patchEvent({ invitationStatus: res.status ?? 'pending' })
    } catch (err) {
      // The social-handle gate runs before the invitation row is created, so
      // nothing was written — collect the handles and retry. Branching on the
      // response code leaves the invite-only 403 to its existing handling.
      // The form was confirmed on the way here, so this reopen is handles-only.
      const missing = err instanceof ApiError ? socialGateMissing(err) : null
      if (missing) {
        setGate({ missing, withForm: false, intent: 'invite' })
        return
      }
      // 409 means a row already exists — resync the real status from the server.
      if (err instanceof ApiError && err.status === 409) {
        try {
          const fresh = await api.get(`/events/${id}`)
          setFetchedEvent(fresh.event)
        } catch {
          /* leave the button as-is */
        }
      }
    } finally {
      setIsRequestingInvite(false)
    }
  }

  // The same gate, ahead of the ticket picker: nobody should choose a
  // category and reach "Pay" only to be told they can't buy. On open events
  // this is where the organizer's form is collected; on invite-only events
  // it was collected with the request, so only handles are checked here.
  // Checkout keeps the server's 403 as the authoritative fallback.
  const handleChooseTicket = async () => {
    const needsForm = formNeededFor(event, 'buy')
    const profile = requiredHandles.length > 0 ? await fetchProfile() : null
    const missing = missingHandles(event, profile)
    if (missing.length > 0 || needsForm) {
      setGate({ missing, withForm: needsForm, intent: 'buy' })
      return
    }
    navigate(`/events/${event.id}/tickets`)
  }

  return (
    <div className="bg-cirkle-black h-[100dvh] flex flex-col overflow-hidden">
      <EventDetailHeader onBack={goBack} />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <p className="px-4 mt-6 font-body text-[14px] text-cirkle-text-muted">Loading…</p>
        )}
        {loadError && (
          <p className="px-4 mt-6 font-body text-[14px] text-red-400">{loadError}</p>
        )}

        {event && (
          <>
            <EventHero bannerUrl={event.bannerUrl} name={event.name} />
            <EventInfoBlock
              title={event.name}
              location={location}
              day={formatEventDay(event.startsAt)}
              time={formatEventTime(event.startsAt)}
              price={entryPrice(event)}
              organizerInstagram={event.organizerInstagram}
              requiredHandles={requiredHandles}
              hasForm={Boolean(event.googleFormUrl)}
              userHasTicket={event.userHasTicket}
              eventType={event.eventType}
              invitationStatus={event.invitationStatus}
              isRequestingInvite={isRequestingInvite}
              ticketCategories={event.ticketCategories ?? []}
              soldOut={event.soldOut}
              onChooseTicket={handleChooseTicket}
              onViewTicket={() => navigate('/tickets')}
              onRequestInvite={handleRequestInvite}
            />
            {event.description && <EventAbout about={event.description} />}
            {event.itineraryUrl && <EventItinerary url={event.itineraryUrl} />}
            {event.artists?.length > 0 && <EventLineup artists={event.artists} />}
            {event.gallery?.length > 0 && <EventGallery gallery={event.gallery} />}
            <EventVenue name={event.venueName} address={event.venueAddress} />
            <EventWhosGoing
              people={attendees}
              total={attendeeTotal}
              onSeeAll={() => navigate(`/events/${id}/attendees`)}
              onSelect={setSelectedPerson}
            />
            {/* <EventFindYourTribe groups={MOCK_GROUPS} /> — deferred to Phase 2 (groups) */}
          </>
        )}
      </main>

      {selectedPerson && (
        <AttendeeProfileSheet person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}

      {gate && (
        <SocialHandlesDialog
          missing={gate.missing}
          googleFormUrl={gate.withForm ? (event?.googleFormUrl ?? null) : null}
          context={gate.intent === 'buy' ? 'purchase' : 'invite'}
          // Cancel abandons the action — the gate runs before anything is
          // written, so there is nothing to undo.
          onCancel={() => setGate(null)}
          onSaved={async () => {
            const { intent, withForm } = gate
            if (withForm) markFormConfirmed(event.id)
            setGate(null)
            if (intent === 'buy') await handleChooseTicket()
            else await handleRequestInvite()
          }}
        />
      )}

      <BottomNav activeTo="/feed" />
    </div>
  )
}

export default EventDetail
