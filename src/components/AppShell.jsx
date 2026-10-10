import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, Wallet } from 'lucide-react'
import { useActiveCity } from '../store/cityStore.js'
import { useWalletStore } from '../store/walletStore.js'
import { NAV_ITEMS } from './navItems.js'
import BottomNav from './BottomNav.jsx'
import Logo from './Logo.jsx'

function LocationPill({ cityName, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cirkle-chip border border-cirkle-border-card text-cirkle-text-light transition-all duration-200 hover:border-cirkle-text-muted/50"
    >
      <MapPin size={14} className="text-cirkle-yellow" strokeWidth={2} />
      <span className="font-body text-[13px] font-semibold">
        {cityName || 'Set city'}
      </span>
      <ChevronDown size={14} className="text-cirkle-text-muted" strokeWidth={2} />
    </button>
  )
}

/** My Wallet (F&B Part 5) — mobile top bar, left of the location pill. */
function WalletButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="My wallet"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-cirkle-chip border border-cirkle-border-card transition-all duration-200 hover:border-cirkle-yellow/60"
    >
      <Wallet size={17} className="text-cirkle-yellow" strokeWidth={2.25} />
    </button>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const { activeCityName } = useActiveCity()
  const openCitySwitcher = () => navigate('/city')
  const openWallet = () => navigate('/wallet')

  // Warm the wallet cache the moment the app opens after login, so My Wallet
  // and its screens render instantly when tapped (F&B Part 5).
  const prefetchWallet = useWalletStore((s) => s.prefetch)
  useEffect(() => {
    prefetchWallet()
  }, [prefetchWallet])

  return (
    // Full-height flex column: header / scrolling main / (tab bar) / bottom nav.
    // The bars are flex siblings of the single scroll area, never position:fixed —
    // so they can't drift on iOS Chrome (which mishandles fixed during scroll).
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-none bg-cirkle-black border-b border-cirkle-border">
        {/* Desktop: logo left · nav center · location right */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center max-w-[1040px] mx-auto px-6 h-16">
          <div className="justify-self-start">
            <Logo />
          </div>
          <nav className="flex items-center gap-8">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative font-body text-sm transition-all duration-200 ${
                    isActive
                      ? 'font-bold text-cirkle-yellow after:absolute after:-bottom-[22px] after:inset-x-0 after:h-[2px] after:bg-cirkle-yellow after:rounded-full'
                      : 'font-medium text-cirkle-text-muted hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="justify-self-end">
            <LocationPill cityName={activeCityName} onClick={openCitySwitcher} />
          </div>
        </div>

        {/* Mobile / tablet: logo left · wallet + location right */}
        <div className="md:hidden flex items-center justify-between px-4 h-14">
          <Logo />
          <div className="flex items-center gap-2">
            <WalletButton onClick={openWallet} />
            <LocationPill cityName={activeCityName} onClick={openCitySwitcher} />
          </div>
        </div>
      </header>

      {/* The only scroll area */}
      <main id="app-scroll" className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1040px] mx-auto w-full h-full">
          <Outlet />
        </div>
      </main>

      {/* Slot for a tab-specific bottom bar (e.g. the Vibes bar portals in here) */}
      <div id="tab-bottom-bar" className="flex-none empty:hidden" />

      {/* Bottom nav (mobile / tablet only) */}
      <BottomNav />
    </div>
  )
}

export default AppShell
