import { useState } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { formatPrice, formatEventDateTime } from '../../lib/format.js'

export function EventCard({ event, categoryLabel, onClick }) {
  const [bannerOk, setBannerOk] = useState(true)

  return (
    <button type="button" onClick={onClick} className="card-dark overflow-hidden text-left w-full">
      {/* 16:9 to match the ratio banners are cropped to, so the thumbnail shows
          the same framing the organizer chose rather than a re-cropped slice.
          The gradient stays underneath for events with no banner, and for a
          presigned URL that has expired (~1hr TTL). */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-cirkle-chip to-cirkle-border-card">
        {event.bannerUrl && bannerOk && (
          <img
            src={event.bannerUrl}
            alt={event.name}
            loading="lazy"
            onError={() => setBannerOk(false)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
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
