import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Pencil, Eye, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useProfileStore } from '../store/profileStore.js'
import { resetUserStores } from '../store/session.js'
import { clearRedirect } from '../lib/redirect.js'
import {
  SOCIAL_PLATFORMS,
  PLATFORM_LABELS,
  PROFILE_URL_BUILDERS,
} from '../lib/socialHandles.js'

const HELP_ROWS = [
  { label: 'Check for updates' },
  { label: 'Contact us' },
  { label: 'Manage account' },
]
const LEGAL_ROWS = [
  { label: 'Privacy policy', to: '/legal/privacy' },
  { label: 'Terms of use', to: '/legal/terms' },
  { label: 'Safety guidelines', to: '/legal/safety' },
]

function SettingsRow({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 font-body text-[15px] text-white transition-all duration-200 hover:bg-white/5"
    >
      {label}
      <ChevronRight size={18} className="text-cirkle-text-muted" strokeWidth={2} />
    </button>
  )
}

function SettingsSection({ title, rows, onRow }) {
  return (
    <div className="mt-6">
      <p className="px-4 mb-2 font-body text-label uppercase font-bold text-cirkle-text-muted">
        {title}
      </p>
      <div className="rounded-card bg-cirkle-card border border-cirkle-border-card overflow-hidden divide-y divide-cirkle-border">
        {rows.map((row) => (
          <SettingsRow key={row.label} label={row.label} onClick={() => onRow(row)} />
        ))}
      </div>
    </div>
  )
}

// A faithful preview of the user's card as it appears in the Vibes feed — same
// photo hero, name, tagline and tags others see when this person books a ticket.
function ProfilePreviewCard({ profile }) {
  const photos = [...(profile.photos ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )
  const [photoIndex, setPhotoIndex] = useState(0)
  const total = photos.length
  const idx = Math.min(photoIndex, Math.max(0, total - 1))
  const currentUrl = photos[idx]?.url
  const initial = profile.firstName?.[0]?.toUpperCase() ?? '?'

  const tapLeft = () => setPhotoIndex((i) => Math.max(0, i - 1))
  const tapRight = () => setPhotoIndex((i) => Math.min(total - 1, i + 1))

  return (
    <div className="rounded-[22px] overflow-hidden bg-cirkle-card border border-cirkle-border-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)]">
      {/* Photo hero */}
      <div className="relative w-full aspect-[4/5] bg-gradient-to-br from-cirkle-chip to-cirkle-black overflow-hidden">
        {total > 1 && (
          <div className="absolute top-3 inset-x-3 z-10 flex gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-[3px] flex-1 rounded-full transition-all duration-200 ${
                  i <= idx ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[140px] leading-none text-white/12 uppercase select-none">
            {initial}
          </span>
        </div>

        {currentUrl && (
          <img src={currentUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {total > 1 && (
          <>
            <button type="button" onClick={tapLeft} className="absolute left-0 top-0 w-1/2 h-full" aria-label="Previous photo" />
            <button type="button" onClick={tapRight} className="absolute right-0 top-0 w-1/2 h-full" aria-label="Next photo" />
          </>
        )}
      </div>

      {/* Name + age */}
      <h3 className="px-5 pt-5 font-body text-[26px] font-medium text-white leading-tight">
        {profile.firstName}
        {profile.age ? `, ${profile.age}` : ''}
      </h3>

      {/* Ghost event strip — the real one appears once they book */}
      <div className="mx-5 mt-4 flex items-center gap-3 rounded-[14px] border border-dashed border-cirkle-border-card bg-cirkle-input/40 p-3.5">
        <span className="w-10 h-10 shrink-0 rounded-full bg-cirkle-chip/60 flex items-center justify-center">
          <CalendarDays size={18} className="text-cirkle-text-muted" strokeWidth={2} />
        </span>
        <p className="font-body text-[12.5px] text-cirkle-text-muted leading-snug">
          The event you book appears here — so people going can find you.
        </p>
      </div>

      {/* Tagline (bio) */}
      {profile.bio ? (
        <p className="px-5 pt-4 font-body text-[15px] text-cirkle-text-light leading-[1.6]">
          {profile.bio}
        </p>
      ) : (
        <p className="px-5 pt-4 font-body text-[14px] italic text-cirkle-text-muted">
          Add a bio so people get your vibe.
        </p>
      )}

      {/* Social handles — only the ones that are set. */}
      {SOCIAL_PLATFORMS.some((p) => profile[p]) && (
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {SOCIAL_PLATFORMS.filter((p) => profile[p]).map((platform) => (
            <a
              key={platform}
              href={PROFILE_URL_BUILDERS[platform](profile[platform])}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cirkle-chip font-body text-[13px] font-semibold text-cirkle-text-light transition-colors duration-200 hover:text-cirkle-yellow"
            >
              <span className="text-cirkle-text-muted">{PLATFORM_LABELS[platform]}</span>
              {profile[platform]}
            </a>
          ))}
        </div>
      )}

      {/* Lifestyle tags */}
      {profile.lifestyleTags?.length > 0 ? (
        <div className="px-5 pt-4 pb-5 flex flex-wrap gap-2">
          {profile.lifestyleTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-cirkle-chip text-cirkle-text-light font-body text-[13px] font-semibold"
            >
              {tag.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="pb-5" />
      )}
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <div className="rounded-[22px] overflow-hidden bg-cirkle-card border border-cirkle-border-card animate-pulse">
      <div className="w-full aspect-[4/5] bg-cirkle-input" />
      <div className="px-5 pt-5">
        <div className="h-7 w-40 rounded-lg bg-cirkle-input" />
      </div>
      <div className="mx-5 mt-4 h-[70px] rounded-[14px] bg-cirkle-input" />
      <div className="px-5 pt-4 pb-5 flex gap-2">
        <div className="h-8 w-20 rounded-full bg-cirkle-input" />
        <div className="h-8 w-16 rounded-full bg-cirkle-input" />
      </div>
    </div>
  )
}

export function Profile() {
  const navigate = useNavigate()
  const clearToken = useAuthStore((s) => s.clearToken)
  const profile = useProfileStore((s) => s.profile)
  const loadError = useProfileStore((s) => s.error)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleLogout = () => {
    clearToken()
    resetUserStores()
    clearRedirect() // a stored deep-link destination must not outlive the session that captured it
    navigate('/')
  }

  // Rows with a `to` navigate; the rest are placeholders for now.
  const handleRow = (row) => {
    if (row.to) navigate(row.to)
  }

  return (
    <div className="px-6 py-6 max-w-[480px] mx-auto">
      {loadError && <p className="font-body text-[14px] text-red-400">{loadError}</p>}

      {/* How others see you — the identity centrepiece, leads the screen */}
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-cirkle-yellow" strokeWidth={2} />
        <h1 className="font-body text-[19px] font-bold text-white">How others see you</h1>
      </div>
      <p className="mt-1.5 font-body text-[13.5px] text-cirkle-text-muted leading-relaxed">
        This is your card in the Vibes feed. When you book an event, people heading
        there can discover you exactly like this.
      </p>

      <div className="mt-5">
        {profile ? <ProfilePreviewCard profile={profile} /> : <PreviewSkeleton />}
      </div>

      {/* Edit profile — sits with the card, since editing changes what's above */}
      <button
        type="button"
        onClick={() => navigate('/profile/edit')}
        className="btn-primary w-full px-8 py-3.5 mt-4"
      >
        <Pencil size={16} strokeWidth={2.5} className="mr-2" />
        Edit profile
      </button>

      <SettingsSection title="Help and support" rows={HELP_ROWS} onRow={handleRow} />
      <SettingsSection title="Legal" rows={LEGAL_ROWS} onRow={handleRow} />

      <button
        type="button"
        onClick={handleLogout}
        className="w-full mt-8 py-3.5 rounded-full border border-red-400/60 text-red-400 font-body text-[15px] font-bold transition-all duration-200 hover:bg-red-400/10"
      >
        Log out
      </button>
    </div>
  )
}

export default Profile
