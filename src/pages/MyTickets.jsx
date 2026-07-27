import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, ChevronRight, QrCode } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { formatEventDateTime } from '../lib/format.js'

const FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
]

function TicketStub({ ticket, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left card-dark overflow-hidden">
      {/* Top half — pure logistics */}
      <div className="p-4">
        <p className="font-body text-[16px] font-bold text-white">{ticket.event.name}</p>
        <div className="mt-2 flex items-center gap-1.5 font-body text-[13px] text-cirkle-text-muted">
          <CalendarDays size={14} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
          <span>{formatEventDateTime(ticket.event.startsAt)}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 font-body text-[13px] text-cirkle-text-muted">
          <MapPin size={14} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
          <span className="truncate">{ticket.event.venueName}</span>
        </div>
      </div>

      {/* Perforation */}
      <div className="border-t border-dashed border-cirkle-border-card" />

      {/* Bottom half — entry prompt */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-body text-[13px] font-semibold text-cirkle-yellow">
          <QrCode size={16} strokeWidth={2} />
          View ticket &amp; entry QR
        </span>
        <ChevronRight size={18} className="text-cirkle-text-muted" strokeWidth={2} />
      </div>
    </button>
  )
}

function TicketStubSkeleton() {
  return (
    <div className="card-dark overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="h-4 w-2/3 rounded bg-cirkle-input" />
        <div className="mt-3 h-3 w-1/2 rounded bg-cirkle-input" />
        <div className="mt-2 h-3 w-2/5 rounded bg-cirkle-input" />
      </div>
      <div className="border-t border-dashed border-cirkle-border-card" />
      <div className="px-4 py-3">
        <div className="h-3 w-1/3 rounded bg-cirkle-input" />
      </div>
    </div>
  )
}

export function MyTickets() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('upcoming')
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError('')
    api
      .get(`/tickets?filter=${filter}`)
      .then((data) => {
        if (active) setTickets(data.tickets)
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load your tickets.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [filter])

  return (
    <div className="px-6 py-8 max-w-[480px] mx-auto">
      <h1 className="font-display text-section-md text-white uppercase">My Tickets</h1>

      {/* Filter */}
      <div className="mt-4 flex gap-1 p-1 rounded-full bg-cirkle-input border border-cirkle-border-card max-w-[260px]">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`flex-1 py-2 rounded-full text-center font-body text-[13px] font-bold transition-all duration-200 ${
              filter === id ? 'bg-cirkle-yellow text-cirkle-text-dark' : 'text-cirkle-text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <TicketStubSkeleton key={i} />)}
        {loadError && (
          <p className="font-body text-[14px] text-red-400">{loadError}</p>
        )}
        {!isLoading && !loadError && tickets.length === 0 && (
          <p className="font-body text-[14px] text-cirkle-text-muted">
            No {filter} tickets yet.
          </p>
        )}
        {tickets.map((ticket) => (
          <TicketStub key={ticket.id} ticket={ticket} onClick={() => navigate(`/tickets/${ticket.id}`)} />
        ))}
      </div>
    </div>
  )
}

export default MyTickets
