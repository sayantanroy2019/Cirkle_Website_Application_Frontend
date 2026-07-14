import { useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from './navItems.js'

// Mobile / tablet bottom navigation. Pass `activeTo` to force-highlight a tab
// on screens whose route isn't itself a tab (e.g. event detail → Home).
export function BottomNav({ activeTo }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = activeTo ?? pathname

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-cirkle-nav-bottom border-t border-cirkle-border h-[60px] flex items-center pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const isActive = current === to || current.startsWith(`${to}/`)
        return (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200"
          >
            <Icon
              size={20}
              strokeWidth={2}
              className={isActive ? 'text-cirkle-yellow' : 'text-cirkle-text-muted'}
            />
            <span
              className={`font-body text-[10px] font-medium ${
                isActive ? 'text-cirkle-yellow' : 'text-cirkle-text-muted'
              }`}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
