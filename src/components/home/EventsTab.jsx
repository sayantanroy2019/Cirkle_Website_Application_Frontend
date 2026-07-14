import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCity } from '../../context/ActiveCityContext.jsx'
import { api, ApiError } from '../../lib/api.js'
import { getEventCategories } from '../../lib/reference.js'
import EventCard from './EventCard.jsx'

export function EventsTab() {
  const navigate = useNavigate()
  const { activeCityId } = useActiveCity()

  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
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

  // Re-fetch events whenever the active browsing city changes.
  useEffect(() => {
    if (!activeCityId) return
    let active = true
    setIsLoading(true)
    setLoadError('')
    api
      .get(`/events?city=${activeCityId}`)
      .then((data) => {
        if (active) setEvents(data.events)
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load events.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeCityId])

  const labelById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.label])),
    [categories],
  )

  const visibleEvents = activeCategory
    ? events.filter((e) => e.categoryId === activeCategory)
    : events

  const chips = [{ id: null, label: 'All' }, ...categories]

  return (
    <div>
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
        {!isLoading && !loadError && visibleEvents.length === 0 && (
          <p className="mt-4 font-body text-[14px] text-cirkle-text-muted">
            No events here yet. Try another category or city.
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
