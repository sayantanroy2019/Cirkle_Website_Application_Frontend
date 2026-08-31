import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCity } from '../../store/cityStore.js'
import { useEventsStore } from '../../store/eventsStore.js'
import { getEventCategories } from '../../lib/reference.js'
import EventCard from './EventCard.jsx'

export function EventsTab() {
  const navigate = useNavigate()
  const { activeCityId, activeCityName } = useActiveCity()

  // Events come from the shared cache — instant on repeat visits, no refetch.
  const events = useEventsStore((s) => s.eventsByCity[activeCityId])
  const loadingCity = useEventsStore((s) => s.loadingCity)
  const loadError = useEventsStore((s) => s.errorByCity[activeCityId])
  const fetchEvents = useEventsStore((s) => s.fetchEvents)

  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null) // null = All

  // Category chips come from the backend, not a hardcoded list.
  useEffect(() => {
    let active = true
    getEventCategories()
      .then((cats) => {
        if (active) setCategories(cats)
      })
      .catch(() => {
        /* chips just show "All" if this fails */
      })
    return () => {
      active = false
    }
  }, [])

  // Fetch only if this city isn't cached yet; cached cities load instantly.
  useEffect(() => {
    fetchEvents(activeCityId)
  }, [activeCityId, fetchEvents])

  const isLoading = !events && loadingCity === activeCityId

  const labelById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.label])),
    [categories],
  )

  const cityEvents = events ?? []
  const visibleEvents = activeCategory
    ? cityEvents.filter((e) => e.categoryId === activeCategory)
    : cityEvents

  const chips = [{ id: null, label: 'All' }, ...categories]

  return (
    <div className="h-full overflow-y-auto">
      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto px-6 py-4 scrollbar-hide">
        {chips.map((c) => {
          const isActive = activeCategory === c.id
          return (
            <button
              key={c.id ?? 'all'}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full border font-body text-[13px] font-semibold transition-all duration-200 ${
                isActive
                  ? 'border-cirkle-yellow bg-cirkle-yellow text-cirkle-text-dark'
                  : 'border-cirkle-border-card bg-cirkle-input text-cirkle-text-light hover:border-cirkle-text-muted/50'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="px-6 pb-6">
        {isLoading && (
          <p className="mt-4 font-body text-[14px] text-cirkle-text-muted">Loading events…</p>
        )}
        {loadError && (
          <p className="mt-4 font-body text-[14px] text-red-400">{loadError}</p>
        )}
        {/* Two different kinds of empty. A city with NO events at all gets the
            coming-soon promise — a brand-new user in an unlaunched city must
            read intent, not absence. A city with events where the chosen
            category chip filtered them all out is just a filter miss. */}
        {!isLoading && !loadError && cityEvents.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center px-4">
            <h2 className="font-display text-section-md text-white uppercase">
              We&rsquo;re coming soon{activeCityName ? ` to ${activeCityName}` : ''}
            </h2>
            <p className="mt-2 font-body text-[14px] text-cirkle-text-muted max-w-[320px]">
              We&rsquo;re working on bringing events here. Switch city to see
              what&rsquo;s already happening.
            </p>
          </div>
        )}
        {!isLoading && !loadError && cityEvents.length > 0 && visibleEvents.length === 0 && (
          <p className="mt-4 font-body text-[14px] text-cirkle-text-muted">
            No {labelById[activeCategory] ?? ''} events in {activeCityName || 'this city'} yet — try
            another category.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              categoryLabel={labelById[event.categoryId]}
              onClick={() => navigate(`/events/${event.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default EventsTab
