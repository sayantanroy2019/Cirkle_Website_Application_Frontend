import { Minus, Plus } from 'lucide-react'
import { formatPrice } from '../lib/format.js'
import { stepperCeiling, DEFAULT_MAX_PEOPLE } from '../lib/cart.js'

// One booking is one ticket is one QR — but that booking is a cart: any mix of
// tiers, each in any quantity, as long as everyone it admits fits under the
// event's people cap. admitsCount is how many people ONE unit of a tier lets
// in, so a line of 2× Couple admits 4.
function admitsLabel(admitsCount) {
  return admitsCount === 1 ? 'Admits 1 person' : `Admits ${admitsCount} people each`
}

// Quantity steppers, one per tier. Sold-out tiers stay visible but inert —
// knowing the Couple Pass existed and went is useful information, hiding it
// is not. The + button stops at whichever comes first: the stock the server
// says is left, or the people cap once the rest of the cart is counted.
export function TicketCategorySelector({ categories, quantities, onChange, maxPeople = DEFAULT_MAX_PEOPLE }) {
  return (
    <div role="group" aria-label="Tickets" className="flex flex-col gap-2.5">
      {categories.map((category) => {
        const qty = quantities[category.id] ?? 0
        const isSoldOut = category.soldOut || !category.available
        const ceiling = isSoldOut ? 0 : stepperCeiling(category, quantities, categories, maxPeople)
        const canAdd = qty < ceiling
        // Why + is greyed: stock, or the cap. Only said when it bites.
        const stockLimited = category.lowStockRemaining != null && qty >= category.lowStockRemaining
        const capLimited = !canAdd && !stockLimited && !isSoldOut
        const isSelected = qty > 0

        return (
          <div
            key={category.id}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-[12px] border transition-all duration-200 ${
              isSoldOut
                ? 'border-cirkle-border bg-cirkle-input/40 opacity-50'
                : isSelected
                  ? 'border-cirkle-yellow bg-cirkle-chip'
                  : 'border-cirkle-border-card bg-cirkle-input'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-body text-[15px] font-semibold text-white truncate">
                  {category.categoryName}
                </span>
                {isSoldOut && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-cirkle-chip font-body text-[11px] font-bold uppercase text-cirkle-text-muted">
                    Sold out
                  </span>
                )}
                {!isSoldOut && category.lowStockRemaining != null && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-cirkle-yellow/15 font-body text-[11px] font-bold uppercase text-cirkle-yellow">
                    Only {category.lowStockRemaining} left
                  </span>
                )}
              </div>
              <span className="block mt-0.5 font-body text-[13px] text-cirkle-text-muted">
                {admitsLabel(category.admitsCount)} · {formatPrice(category.pricePaise)}
              </span>
              {/* The admin's note on this tier — what it includes, how it can
                  be used. A step down from the admits line, never competing
                  with the name. */}
              {category.note && (
                <span className="block mt-1 font-body text-[12px] leading-snug text-cirkle-text-light/80 whitespace-pre-line">
                  {category.note}
                </span>
              )}
              {capLimited && (
                <span className="block mt-0.5 font-body text-[12px] text-cirkle-text-muted">
                  Max {maxPeople} people per booking
                </span>
              )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onChange(category.id, qty - 1)}
                disabled={isSoldOut || qty === 0}
                aria-label={`Remove one ${category.categoryName}`}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-cirkle-border-card text-white transition-all duration-200 hover:border-cirkle-yellow disabled:opacity-30 disabled:pointer-events-none"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>
              <span
                aria-live="polite"
                className={`w-8 text-center font-body text-[16px] font-bold tabular-nums ${isSelected ? 'text-cirkle-yellow' : 'text-white'}`}
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={() => onChange(category.id, qty + 1)}
                disabled={isSoldOut || !canAdd}
                aria-label={`Add one ${category.categoryName}`}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-cirkle-border-card text-white transition-all duration-200 hover:border-cirkle-yellow disabled:opacity-30 disabled:pointer-events-none"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TicketCategorySelector
