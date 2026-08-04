import { useState } from 'react'

// Circular avatar for an attendee. The initial-over-gradient placeholder sits
// underneath the photo rather than replacing it, so a person with no photos and
// a person whose presigned URL has expired (~1hr TTL) both land on the same
// finished-looking fallback instead of a broken-image glyph.
export function PersonAvatar({ person, size = 44, className = '' }) {
  const [photoOk, setPhotoOk] = useState(true)
  const url = person.photos?.[0]?.url
  const initial = person.firstName?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gradient-to-br from-cirkle-chip to-cirkle-black flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display leading-none text-white/30 uppercase select-none"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      </div>
      {url && photoOk && (
        <img
          src={url}
          alt={person.firstName}
          loading="lazy"
          onError={() => setPhotoOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  )
}

export default PersonAvatar
