import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown } from 'lucide-react'
import { useActiveCity } from '../context/ActiveCityContext.jsx'
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

export function AppShell() {
  const navigate = useNavigate()
  const { activeCityName } = useActiveCity()
  const openCitySwitcher = () => navigate('/city')

  return (
    <div className="min-h-screen pb-[60px] md:pb-0">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-cirkle-black border-b border-cirkle-border">
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

        {/* Mobile / tablet: logo left · location right */}
        <div className="md:hidden flex items-center justify-between px-4 h-14">
          <Logo />
          <LocationPill cityName={activeCityName} onClick={openCitySwitcher} />
        </div>
      </header>

      {/* Page content */}
      <main className="pt-14 md:pt-16 max-w-[1040px] mx-auto">
        <Outlet />
      </main>

      {/* Bottom nav (mobile / tablet only) */}
      <BottomNav />
    </div>
  )
}

export default AppShell
