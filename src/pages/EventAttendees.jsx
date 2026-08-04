import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import PersonAvatar from '../components/PersonAvatar.jsx'
import AttendeeProfileSheet from '../components/AttendeeProfileSheet.jsx'

const PAGE_SIZE = 50

export function EventAttendees() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [attendees, setAttendees] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState(null)

  // Each row already carries the full profile card, so opening one costs no request.
  const loadPage = useCallback(
    async (nextOffset) => {
      const res = await api.get(`/events/${id}/attendees`, {
        params: { limit: PAGE_SIZE, offset: nextOffset },
      })
      setTotal(res.total)
      setOffset(nextOffset + res.data.length)
      setAttendees((prev) => (nextOffset === 0 ? res.data : [...prev, ...res.data]))
    },
    [id],
  )

  useEffect(() => {
    let active = true
    // Wrapped rather than called directly so the state updates land after the
    // await, not synchronously in the effect body.
    void (async () => {
      try {
        await loadPage(0)
      } catch (err) {
        if (active) {
          setLoadError(err instanceof ApiError ? err.message : 'Could not load who’s going.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [loadPage])

  const handleLoadMore = async () => {
    if (isLoadingMore) return
    setIsLoadingMore(true)
    try {
      await loadPage(offset)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load more.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  // The server may return fewer rows than `total` — a ticket-holder who never
  // finished onboarding is filtered out — so trust the array, not the count.
  const hasMore = attendees.length < total && !loadError

  return (
    <div className="min-h-[100dvh] bg-cirkle-black">
      <header className="sticky top-0 z-40 bg-cirkle-black border-b border-cirkle-border flex items-center px-4 h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70 -ml-1.5"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="ml-1 font-body text-[16px] font-semibold text-white">Who’s Going</h1>
      </header>

      <div className="px-4 py-4 max-w-[480px] mx-auto">
        {isLoading && (
          <p className="font-body text-[14px] text-cirkle-text-muted">Loading…</p>
        )}

        {loadError && !isLoading && attendees.length === 0 && (
          <p className="font-body text-[14px] text-red-400">{loadError}</p>
        )}

        {!isLoading && !loadError && total === 0 && (
          <p className="font-body text-[14px] text-cirkle-text-muted">
            Nobody has booked yet. Be the first.
          </p>
        )}

        {total > 0 && (
          <p className="font-body text-[13px] text-cirkle-text-muted mb-3">
            {total} {total === 1 ? 'person' : 'people'} going
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {attendees.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => setSelected(person)}
                className="w-full flex items-center gap-3 p-3 rounded-[14px] bg-cirkle-card border border-cirkle-border-card text-left transition-colors duration-200 hover:border-cirkle-text-muted/50"
              >
                <PersonAvatar person={person} size={48} />
                <span className="flex-1 min-w-0">
                  <span className="block font-body text-[15px] font-semibold text-white truncate">
                    {person.firstName}
                    {person.age ? `, ${person.age}` : ''}
                    {person.isYou && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-cirkle-yellow text-cirkle-text-dark text-[11px] font-bold align-middle">
                        You
                      </span>
                    )}
                  </span>
                  {person.tagline && (
                    <span className="block font-body text-[13px] text-cirkle-text-muted truncate">
                      {person.tagline}
                    </span>
                  )}
                </span>
                <ChevronRight size={18} className="text-cirkle-text-muted flex-shrink-0" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>

        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="btn-secondary w-full py-3 mt-4 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {loadError && attendees.length > 0 && (
          <p className="mt-3 font-body text-[13px] text-red-400">{loadError}</p>
        )}
      </div>

      {selected && (
        <AttendeeProfileSheet person={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

export default EventAttendees
