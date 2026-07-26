import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

export function PaymentSuccess() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const bookingRef = state?.bookingRef
  const totalPaise = state?.totalPaise

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <button
        type="button"
        onClick={() => navigate('/feed')}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
        aria-label="Back to feed"
      >
        <ArrowLeft size={22} strokeWidth={2} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[420px] w-full mx-auto">
        <span className="w-16 h-16 rounded-full bg-cirkle-yellow/15 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-cirkle-yellow" strokeWidth={2} />
        </span>

        <h1 className="mt-6 font-display text-section-lg text-white uppercase">You're in!</h1>

        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Your ticket is confirmed. You can look for a group to join anytime from My Tickets.
        </p>

        {bookingRef && (
          <div className="mt-6 px-5 py-3 rounded-full bg-cirkle-input border border-cirkle-border-card">
            <span className="font-body text-[13px] text-cirkle-text-muted">Booking ref </span>
            <span className="font-body text-[14px] font-bold text-white tracking-wider">{bookingRef}</span>
          </div>
        )}
        {totalPaise != null && (
          <p className="mt-3 font-body text-[13px] text-cirkle-text-muted">
            Paid <span className="font-bold text-white">{rupees(totalPaise)}</span>
          </p>
        )}

        <div className="mt-9 flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="btn-primary w-full px-8 py-3.5"
          >
            View my tickets
          </button>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="btn-secondary w-full px-8 py-3.5"
          >
            Back to feed
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess
