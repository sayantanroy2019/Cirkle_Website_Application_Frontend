import { useState } from 'react'
import { instagramUrl } from '../lib/format.js'
import InstagramIcon from './InstagramIcon.jsx'

// The default avatar for a photoless artist: the initial over a soft gradient,
// matching the placeholder used on the profile cards. Rendered client-side —
// there is no default image file and no network request to fail.
// It also sits *under* the photo, so an expired presigned URL (they last ~1hr)
// reveals the placeholder rather than a broken-image glyph.
function ArtistPhoto({ name, photoUrl }) {
  const [photoOk, setPhotoOk] = useState(true)
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-cirkle-border-card bg-gradient-to-br from-cirkle-chip to-cirkle-black flex-shrink-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-[30px] leading-none text-white/30 uppercase select-none">
          {initial}
        </span>
      </div>
      {photoUrl && photoOk && (
        <img
          src={photoUrl}
          alt={name}
          loading="lazy"
          onError={() => setPhotoOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  )
}

// One lineup entry: photo (or default), name, and an Instagram link when the
// artist has a handle.
export function ArtistAvatar({ artist }) {
  const igUrl = instagramUrl(artist.instagram)

  return (
    <div className="flex-shrink-0 w-[84px] flex flex-col items-center gap-2">
      <ArtistPhoto name={artist.name} photoUrl={artist.photoUrl} />

      <span className="font-body text-[12px] font-medium text-white text-center leading-tight line-clamp-2">
        {artist.name}
      </span>

      {igUrl && (
        <a
          href={igUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cirkle-text-muted transition-colors duration-200 hover:text-cirkle-yellow"
          aria-label={`${artist.name} on Instagram`}
        >
          <InstagramIcon size={16} />
        </a>
      )}
    </div>
  )
}

export default ArtistAvatar
