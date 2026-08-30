import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { useEventsStore, selectEventById } from '../store/eventsStore.js'
import { formatPrice, formatEventDateTime } from '../lib/format.js'
import TicketCategorySelector from '../components/TicketCategorySelector.jsx'
import { useBackOr } from '../lib/navigation.js'

// Step between the event and checkout: pick which ticket you're buying.
// Fetches the event itself rather than relying on router state, so a refresh or
// a shared link lands here intact.
export function EventTickets() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Back to the event; the event page itself if this is the first page in the tab.
  const goBack = useBackOr(`/events/${id}`)

  const cachedEvent = useEventsStore(selectEventById(id))
  const [fetchedEvent, setFetchedEvent] = useState(null)
  const [loadError, setLoadError] = useState('')
  // Never pre-selected — how many people a ticket admits has to be deliberate.
  const [selected, setSelected] = useState(null)

  // The list object has no ticketCategories, so the fetch is what makes this
  // page usable; the cached copy only fills in the header sooner.
  const event = fetchedEvent ?? cachedEvent

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await api.get(`/events/${id}`)
        if (active) setFetchedEvent(data.event)
      } catch (err) {
        if (active) {
          setLoadError(err instanceof ApiError ? err.message : 'Could not load tickets.')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const categories = fetchedEvent?.ticketCategories ?? []
  const isLoading = !fetchedEvent && !loadError

  const handleContinue = () => {
    if (!selected) return
    navigate(`/checkout/${id}`, {
      // The whole category travels, not just the id: checkout shows the name,
      // and order creation will send the id once it accepts one.
      state: { ticketCategoryId: selected.id, ticketCategory: selected },
    })
  }

  return (
    <div className="min-h-[100dvh] bg-cirkle-black flex flex-col">
      <header className="sticky top-0 z-40 bg-cirkle-black border-b border-cirkle-border flex items-center px-4 h-14">
        <button
          type="button"
          onClick={goBack}
          className="w-9 h-9 flex items-center justify-center text-white transition-opacity duration-200 hover:opacity-70 -ml-1.5"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="ml-1 font-body text-[16px] font-semibold text-white">Choose your ticket</h1>
      </header>

      <div className="flex-1 px-4 py-4 max-w-[480px] w-full mx-auto">
        {event && (
          <div className="card-dark p-4 mb-5">
            <p className="font-body text-[16px] font-bold text-white">{event.name}</p>
            <p className="mt-1 font-body text-[13px] text-cirkle-text-muted">
              {formatEventDateTime(event.startsAt)}
            </p>
            <p className="font-body text-[13px] text-cirkle-text-muted">{event.venueName}</p>
          </div>
        )}

        {isLoading && (
          <p className="font-body text-[14px] text-cirkle-text-muted">Loading tickets…</p>
        )}

        {loadError && (
          <p className="font-body text-[14px] text-red-400">{loadError}</p>
        )}

        {fetchedEvent && categories.length === 0 && (
          <div className="bg-cirkle-card border border-cirkle-border-card rounded-[14px] px-4 py-5 text-center">
            <p className="font-body text-[15px] font-semibold text-white">Tickets not yet available</p>
            <p className="mt-1 font-body text-[13px] text-cirkle-text-muted">
              The organizer hasn’t opened sales for this event.
            </p>
          </div>
        )}

        {categories.length > 0 && (
          <>
            {fetchedEvent.soldOut && (
              <div className="mb-4 bg-cirkle-card border border-cirkle-border-card rounded-[14px] px-4 py-3 text-center">
                <p className="font-body text-[15px] font-bold uppercase tracking-wide text-white">
                  Sold out
                </p>
                <p className="mt-1 font-body text-[13px] text-cirkle-text-muted">
                  Every ticket type for this event has gone.
                </p>
              </div>
            )}

            <TicketCategorySelector
              categories={categories}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />

            <p className="mt-4 font-body text-[12px] text-cirkle-text-muted text-center">
              One booking is one ticket with one QR code — a Couple or Group pass admits several
              people on that single ticket.
            </p>
          </>
        )}
      </div>

      {/* Sticky footer so the action stays reachable with a long category list. */}
      {categories.length > 0 && (
        <div className="sticky bottom-0 bg-cirkle-black border-t border-cirkle-border px-4 py-4">
          <div className="max-w-[480px] mx-auto">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selected}
              className="btn-primary w-full px-6 py-3.5 text-[15px] font-bold tracking-wide uppercase disabled:opacity-40 disabled:pointer-events-none"
            >
              {selected
                ? `Continue · ${selected.categoryName} · ${formatPrice(selected.pricePaise)}`
                : 'Select a ticket'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventTickets
