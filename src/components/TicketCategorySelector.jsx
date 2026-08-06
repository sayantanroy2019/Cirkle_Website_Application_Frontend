import { Check } from 'lucide-react'
import { formatPrice } from '../lib/format.js'

// One booking is one ticket is one QR — admitsCount is how many people that
// single ticket lets in, not a quantity the user picks.
function admitsLabel(admitsCount) {
  return admitsCount === 1 ? 'Admits 1 person' : `Admits ${admitsCount} people`
}

// Radio-group behaviour: exactly one category selectable, never several.
// Sold-out categories stay visible but unselectable — knowing the Couple Pass
// existed and went is useful information, hiding it is not.
export function TicketCategorySelector({ categories, selectedId, onSelect }) {
  return (
    <div role="radiogroup" aria-label="Ticket category" className="flex flex-col gap-2.5">
      {categories.map((category) => {
        const isSelected = category.id === selectedId
        const isSoldOut = category.soldOut || !category.available

        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isSoldOut}
            onClick={() => onSelect(category)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-[12px] border text-left transition-all duration-200 ${
              isSoldOut
                ? 'border-cirkle-border bg-cirkle-input/40 opacity-50 cursor-not-allowed'
                : isSelected
                  ? 'border-cirkle-yellow bg-cirkle-chip'
                  : 'border-cirkle-border-card bg-cirkle-input hover:border-cirkle-text-muted/50'
            }`}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-body text-[15px] font-semibold text-white truncate">
                  {category.categoryName}
                </span>
                {isSoldOut && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-cirkle-chip font-body text-[11px] font-bold uppercase text-cirkle-text-muted">
                    Sold out
                  </span>
                )}
              </span>
              <span className="block mt-0.5 font-body text-[13px] text-cirkle-text-muted">
                {admitsLabel(category.admitsCount)}
              </span>
            </span>

            <span className="flex items-center gap-2.5 flex-shrink-0">
              <span className="font-body text-[16px] font-bold text-white">
                {formatPrice(category.pricePaise)}
              </span>
              {isSelected && !isSoldOut && (
                <Check size={18} className="text-cirkle-yellow" strokeWidth={2.5} />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default TicketCategorySelector
