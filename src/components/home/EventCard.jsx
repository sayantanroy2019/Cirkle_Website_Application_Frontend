import { CalendarDays, MapPin } from 'lucide-react'
import { formatPrice, formatEventDateTime } from '../../lib/format.js'

export function EventCard({ event, categoryLabel, onClick }) {
  return (
    <button type="button" onClick={onClick} className="card-dark overflow-hidden text-left w-full">
      <div className="relative h-[140px] bg-gradient-to-br from-cirkle-chip to-cirkle-border-card">
        {categoryLabel && (
          <span className="absolute top-3 left-3 chip">{categoryLabel}</span>
        )}
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-cirkle-yellow text-cirkle-text-dark font-body text-[12px] font-bold">
          {formatPrice(event.price)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-body text-base font-bold text-white">{event.name}</h3>
        <div className="mt-2 flex items-center gap-1.5 font-body text-[13px] text-cirkle-text-muted">
          <CalendarDays size={14} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
          <span>{formatEventDateTime(event.startsAt)}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 font-body text-[13px] text-cirkle-text-muted">
          <MapPin size={14} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
          <span className="truncate">{event.venueName}</span>
        </div>
      </div>
    </button>
  )
}

export default EventCard
