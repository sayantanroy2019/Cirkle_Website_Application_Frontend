import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

/**
 * The flash-sale popup an organizer/admin configured for this event. Pure
 * marketing: always dismissible, never blocks a gate, shown once per event
 * per session (see lib/promo.js). When a coupon rides along, the code chip
 * copies on tap — and checkout pre-fills it regardless, so copying is
 * a convenience, not a requirement.
 */
export function PromoPopupDialog({ popup, onClose }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(popup.couponCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard denied — the code is on screen and pre-filled at checkout */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
    >
      {/* Centered on every screen size — unlike the gate dialogs' mobile
          bottom-sheet, a promo must never sit under a browser toolbar with
          its button out of reach. max-h + scroll guards small landscapes. */}
      <div className="w-full max-w-[400px] bg-cirkle-card border border-cirkle-yellow/60 rounded-[20px] p-6 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="promo-popup-title"
            className="font-body text-[20px] font-bold text-white leading-snug"
          >
            {popup.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 -mr-1 -mt-1 flex-shrink-0 flex items-center justify-center rounded-full text-cirkle-text-muted transition-all duration-200 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <p className="mt-2 font-body text-[14.5px] text-cirkle-text-light leading-relaxed">
          {popup.message}
        </p>

        {popup.couponCode && (
          <button
            type="button"
            onClick={copyCode}
            className="mt-4 w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-cirkle-input border border-dashed border-cirkle-yellow"
          >
            <span className="font-mono text-[16px] font-bold tracking-wider text-cirkle-yellow">
              {popup.couponCode}
              {popup.discountPercent ? (
                <span className="ml-2 font-body text-[13px] font-semibold text-white">
                  · {popup.discountPercent}% off
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-1.5 font-body text-[13px] font-semibold text-cirkle-text-muted">
              {copied ? (
                <>
                  <Check size={15} strokeWidth={2.5} className="text-cirkle-yellow" /> Copied
                </>
              ) : (
                <>
                  <Copy size={15} strokeWidth={2} /> Copy
                </>
              )}
            </span>
          </button>
        )}

        <button type="button" onClick={onClose} className="btn-primary w-full px-8 py-3.5 mt-5">
          Got it
        </button>
      </div>
    </div>
  )
}

export default PromoPopupDialog
