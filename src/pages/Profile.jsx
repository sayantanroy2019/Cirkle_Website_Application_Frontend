import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Pencil } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useProfileStore } from '../store/profileStore.js'

const HELP_ROWS = ['Check for updates', 'Contact us', 'Manage account']
const LEGAL_ROWS = ['Privacy policy', 'Terms of use', 'Safety guidelines']

function SettingsRow({ label }) {
  return (
    <button
      type="button"
      className="w-full flex items-center justify-between px-4 py-3.5 font-body text-[15px] text-white transition-all duration-200 hover:bg-white/5"
    >
      {label}
      <ChevronRight size={18} className="text-cirkle-text-muted" strokeWidth={2} />
    </button>
  )
}

function SettingsSection({ title, rows }) {
  return (
    <div className="mt-6">
      <p className="px-4 mb-2 font-body text-label uppercase font-bold text-cirkle-text-muted">
        {title}
      </p>
      <div className="rounded-card bg-cirkle-card border border-cirkle-border-card overflow-hidden divide-y divide-cirkle-border">
        {rows.map((label) => (
          <SettingsRow key={label} label={label} />
        ))}
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
    navigate('/')
  }

  const initial = profile?.firstName?.[0]?.toUpperCase() ?? ''

  return (
    <div className="px-6 py-6 max-w-[480px] mx-auto">
      {loadError && (
        <p className="font-body text-[14px] text-red-400">{loadError}</p>
      )}

      {/* Header: photo · name · edit */}
      <div className="flex items-center gap-4">
        <span className="w-16 h-16 rounded-full bg-gradient-to-br from-cirkle-chip to-cirkle-border-card border border-cirkle-border-card flex items-center justify-center font-display text-2xl text-white">
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-body text-[18px] font-bold text-white truncate">
            {profile ? `${profile.firstName}${profile.age ? `, ${profile.age}` : ''}` : '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile/edit')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-cirkle-border-card text-white font-body text-[13px] font-semibold transition-all duration-200 hover:border-cirkle-yellow hover:text-cirkle-yellow"
        >
          <Pencil size={14} strokeWidth={2} />
          Edit profile
        </button>
      </div>

      <SettingsSection title="Help and support" rows={HELP_ROWS} />
      <SettingsSection title="Legal" rows={LEGAL_ROWS} />

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
