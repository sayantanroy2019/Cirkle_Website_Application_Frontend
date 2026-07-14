import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { useActiveCity } from '../context/ActiveCityContext.jsx'

export function CitySwitcher() {
  const navigate = useNavigate()
  const { cities, activeCityId, setActiveCityId, isLoading } = useActiveCity()
  const [query, setQuery] = useState('')

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const handleSelect = (id) => {
    setActiveCityId(id)
    navigate('/feed')
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <div className="max-w-[400px] w-full mx-auto flex flex-col flex-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>

        <h1 className="mt-4 font-display text-section-md text-white uppercase">
          Choose your city
        </h1>
        <p className="mt-2 font-body text-[15px] text-cirkle-text-muted">
          This reshapes your feed — you'll see events and groups for the city you pick.
        </p>

        <div className="mt-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cirkle-text-placeholder" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city"
            className="input-dark pl-11"
            aria-label="Search city"
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto flex flex-col gap-2 pb-4">
          {isLoading && (
            <p className="mt-4 text-center font-body text-[14px] text-cirkle-text-muted">
              Loading cities…
            </p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="mt-4 text-center font-body text-[14px] text-cirkle-text-muted">
              No cities match "{query}".
            </p>
          )}
          {filtered.map((c) => {
            const isActive = activeCityId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-[10px] border font-body text-[15px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border-cirkle-yellow bg-cirkle-chip text-white'
                    : 'border-cirkle-border-card bg-cirkle-input text-cirkle-text-light hover:border-cirkle-text-muted/50'
                }`}
              >
                {c.name}
                {isActive && <Check size={18} className="text-cirkle-yellow" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CitySwitcher
