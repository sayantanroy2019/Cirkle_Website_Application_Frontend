import { useState } from 'react'
import { X } from 'lucide-react'

// One attendee's profile, rendered entirely from the row already in memory —
// the attendees list carries the full card, so opening this makes no request.
export function AttendeeProfileSheet({ person, onClose }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoOk, setPhotoOk] = useState(true)

  const photos = person.photos ?? []
  const total = photos.length
  const current = photos[photoIndex]?.url
  const initial = person.firstName?.trim()?.[0]?.toUpperCase() ?? '?'

  const step = (delta) => {
    if (total < 2) return
    setPhotoIndex((i) => (i + delta + total) % total)
    setPhotoOk(true) // each photo gets its own chance to load
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${person.firstName}'s profile`}
    >
      <div className="w-full sm:max-w-[400px] max-h-[92dvh] overflow-y-auto bg-cirkle-card border border-cirkle-border-card rounded-t-[22px] sm:rounded-[22px]">
        {/* Photo hero — tap either half to move between photos. */}
        <div className="relative aspect-[4/5] bg-gradient-to-br from-cirkle-chip to-cirkle-black overflow-hidden rounded-t-[22px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[110px] leading-none text-white/12 uppercase select-none">
              {initial}
            </span>
          </div>

          {current && photoOk && (
            <img
              src={current}
              alt={person.firstName}
              onError={() => setPhotoOk(false)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {total > 1 && (
            <>
              <div className="absolute top-3 inset-x-3 flex gap-1.5">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={`h-[3px] flex-1 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => step(-1)}
                className="absolute left-0 top-0 w-1/2 h-full"
                aria-label="Previous photo"
              />
              <button
                type="button"
                onClick={() => step(1)}
                className="absolute right-0 top-0 w-1/2 h-full"
                aria-label="Next photo"
              />
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white transition-all duration-200 hover:bg-black/70"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 py-5">
          <h3 className="font-display text-[34px] leading-none text-white uppercase">
            {person.firstName}
            {person.age ? `, ${person.age}` : ''}
          </h3>

          {person.tagline && (
            <p className="mt-3 font-body text-[15px] text-cirkle-text-light leading-[1.6]">
              {person.tagline}
            </p>
          )}

          {person.lifestyleTags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {person.lifestyleTags.map((tag, i) => (
                <span
                  key={`${tag.label}-${i}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-cirkle-chip text-cirkle-text-light font-body text-[13px] font-semibold"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttendeeProfileSheet
