import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { COUNTRIES, searchCountries } from '../lib/phone.js'

// The dial-code control that sits to the left of the phone input. Opens a
// searchable sheet rather than a native <select>: 245 entries is unusable as a
// dropdown, and people look for a country by name *or* by dial code.
export function CountrySelect({ country, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)

  const results = useMemo(() => (isOpen ? searchCountries(query) : COUNTRIES), [isOpen, query])

  useEffect(() => {
    if (isOpen) searchRef.current?.focus()
  }, [isOpen])

  const close = () => {
    setIsOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 pl-4 pr-3 py-3 border-r border-cirkle-border-card text-white transition-colors duration-200 hover:bg-white/5 disabled:opacity-40 rounded-l-[10px]"
        aria-label={`Country: ${country.name}, +${country.callingCode}`}
      >
        <span className="text-[18px] leading-none">{country.flag}</span>
        <span className="font-body text-[16px]">+{country.callingCode}</span>
        <ChevronDown size={15} className="text-cirkle-text-muted" strokeWidth={2} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your country"
        >
          <div className="w-full sm:max-w-[420px] h-[80dvh] sm:h-[70dvh] flex flex-col bg-cirkle-card border border-cirkle-border-card rounded-t-[20px] sm:rounded-[20px]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-body text-[17px] font-bold text-white">Choose your country</h2>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full text-cirkle-text-muted transition-all duration-200 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 bg-cirkle-input border border-cirkle-border-card rounded-[10px] px-3">
                <Search size={16} className="text-cirkle-text-muted shrink-0" strokeWidth={2} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Country or code — India, +44"
                  autoComplete="off"
                  className="flex-1 bg-transparent py-2.5 font-body text-[15px] text-white placeholder:text-cirkle-text-placeholder outline-none"
                  aria-label="Search countries"
                />
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 pb-4">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center font-body text-[14px] text-cirkle-text-muted">
                  No country matches “{query}”.
                </li>
              )}
              {results.map((c) => {
                const isSelected = c.iso2 === country.iso2
                return (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(c)
                        close()
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors duration-200 ${
                        isSelected ? 'bg-cirkle-chip' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="text-[20px] leading-none">{c.flag}</span>
                      <span className="flex-1 font-body text-[15px] text-white truncate">{c.name}</span>
                      <span className="font-body text-[14px] text-cirkle-text-muted">
                        +{c.callingCode}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

export default CountrySelect
