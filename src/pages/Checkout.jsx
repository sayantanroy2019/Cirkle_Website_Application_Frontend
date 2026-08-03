import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ticket, Loader2 } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { useEventsStore, selectEventById } from '../store/eventsStore.js'
import { useProfileStore } from '../store/profileStore.js'
import { formatPrice, formatEventDateTime } from '../lib/format.js'
import {
  estimateBreakdown,
  validateCoupon,
  createOrder,
  verifyPayment,
  pollOrderUntilPaid,
  openRazorpayCheckout,
} from '../lib/payment.js'
import { socialGateMissing } from '../lib/socialHandles.js'
import SocialHandlesDialog from '../components/SocialHandlesDialog.jsx'

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

function Row({ label, value, muted, accent }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`font-body text-[14px] ${muted ? 'text-cirkle-text-muted' : 'text-cirkle-text-light'}`}>
        {label}
      </span>
      <span className={`font-body text-[14px] ${accent ? 'font-bold text-cirkle-yellow' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

export function Checkout() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const cachedEvent = useEventsStore(selectEventById(eventId))
  const [event, setEvent] = useState(cachedEvent)

  const profile = useProfileStore((s) => s.profile)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)

  const [couponInput, setCouponInput] = useState('')
  const [couponCode, setCouponCode] = useState('') // applied
  const [couponBreakdown, setCouponBreakdown] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  // idle | creating | awaiting | verifying | polling | pending
  const [phase, setPhase] = useState('idle')
  const [payError, setPayError] = useState('')
  // Non-null when the purchase was blocked by the social-handle gate: the exact
  // handles the server says are missing.
  const [gateMissing, setGateMissing] = useState(null)
  const [cancelled, setCancelled] = useState(false)
  const [alreadyHasTicket, setAlreadyHasTicket] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // If we didn't arrive with the event cached, try to fetch it (may 404 today).
  useEffect(() => {
    if (event || !eventId) return
    let active = true
    api
      .get(`/events/${eventId}`)
      .then((data) => {
        if (active) setEvent(data.event)
      })
      .catch(() => {
        /* degrade: checkout still works from the order response */
      })
    return () => {
      active = false
    }
  }, [event, eventId])

  const breakdown = couponBreakdown ?? (event ? estimateBreakdown(event.price) : null)
  const isBusy = phase !== 'idle' && phase !== 'pending'

  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code || isApplying) return
    setIsApplying(true)
    setCouponError('')
    try {
      const res = await validateCoupon(code, eventId)
      setCouponBreakdown(res.breakdown)
      setCouponCode(res.couponCode)
    } catch (err) {
      setCouponError(err instanceof ApiError ? err.message : 'Could not apply this coupon.')
      setCouponBreakdown(null)
      setCouponCode('')
    } finally {
      setIsApplying(false)
    }
  }

  const removeCoupon = () => {
    setCouponCode('')
    setCouponBreakdown(null)
    setCouponInput('')
    setCouponError('')
  }

  const goSuccess = (bookingRef, totalPaise) => {
    navigate('/payment/success', { state: { bookingRef, eventId, totalPaise }, replace: true })
  }

  const handlePay = async () => {
    if (isBusy) return
    setPayError('')
    setCancelled(false)
    setAlreadyHasTicket(false)
    setPhase('creating')

    let order
    try {
      order = await createOrder(eventId, couponCode || undefined)
    } catch (err) {
      setPhase('idle')
      // The social-handle gate — open the dialog instead of surfacing an error.
      // Keyed off the response code, so other 403s fall through to the generic
      // handling below.
      const missing = err instanceof ApiError ? socialGateMissing(err) : null
      if (missing) {
        setGateMissing(missing)
        return
      }
      const msg = err instanceof ApiError ? err.message : 'Could not start payment. Please try again.'
      if (err instanceof ApiError && err.status === 400 && /coupon/i.test(msg)) {
        removeCoupon()
        setCouponError(msg)
      } else if (err instanceof ApiError && err.status === 409 && /ticket/i.test(msg)) {
        setAlreadyHasTicket(true)
        setPayError(msg)
      } else {
        setPayError(msg)
      }
      return
    }

    const prefill = {
      name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : undefined,
      email: profile?.email,
    }

    setPhase('awaiting')
    let handlerRes
    try {
      handlerRes = await openRazorpayCheckout({ order, prefill })
    } catch (e) {
      if (e && e.dismissed) {
        setPhase('idle')
        setCancelled(true) // hold stays live; tapping Pay again resumes it
        return
      }
      setPhase('idle')
      setPayError(e?.message || 'Payment could not start.')
      return
    }

    // Channel A — fast path.
    setPhase('verifying')
    try {
      const v = await verifyPayment(handlerRes)
      goSuccess(v.bookingRef, order.amount)
      return
    } catch {
      // The relay failed — NOT the payment. Fall back to polling (Channel B).
      setPhase('polling')
      const polled = await pollOrderUntilPaid(order.orderId)
      if (polled && polled.status === 'paid') {
        goSuccess(polled.bookingRef, order.amount)
      } else {
        setPhase('pending')
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <div className="max-w-[440px] w-full mx-auto flex-1 flex flex-col">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>

        <h1 className="mt-4 font-display text-section-md text-white uppercase">Checkout</h1>

        {/* Event summary */}
        {event && (
          <div className="mt-5 card-dark p-4">
            <p className="font-body text-[16px] font-bold text-white">{event.name}</p>
            <p className="mt-1 font-body text-[13px] text-cirkle-text-muted">
              {formatEventDateTime(event.startsAt)}
            </p>
            <p className="font-body text-[13px] text-cirkle-text-muted">{event.venueName}</p>
          </div>
        )}

        {/* Fixed single-ticket indicator (§13 — never a quantity selector) */}
        <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-cirkle-input border border-cirkle-border-card px-4 py-3">
          <Ticket size={18} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
          <div>
            <p className="font-body text-[14px] font-semibold text-white">Tickets: 1 — just for you</p>
            <p className="font-body text-[12px] text-cirkle-text-muted">
              Every Cirkle booking is one ticket for yourself. You can look for a group after you pay.
            </p>
          </div>
        </div>

        {/* Coupon */}
        <div className="mt-5">
          <label className="font-body text-[13px] font-semibold text-cirkle-text-light">Have a coupon?</label>
          {couponCode ? (
            <div className="mt-1.5 flex items-center justify-between px-4 py-3 rounded-[10px] bg-cirkle-input border border-cirkle-yellow">
              <span className="font-body text-[14px] font-bold text-white">{couponCode} applied</span>
              <button
                type="button"
                onClick={removeCoupon}
                className="font-body text-[13px] font-semibold text-cirkle-text-muted hover:text-white transition-all duration-200"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase())
                  setCouponError('')
                }}
                placeholder="Enter code"
                className="input-dark flex-1 uppercase"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponInput.trim() || isApplying}
                className="px-5 rounded-[10px] border border-cirkle-border-card font-body text-[14px] font-semibold text-white transition-all duration-200 hover:border-cirkle-yellow hover:text-cirkle-yellow disabled:opacity-40 disabled:pointer-events-none"
              >
                {isApplying ? '…' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && (
            <p className="mt-1.5 font-body text-[13px] text-red-400">{couponError}</p>
          )}
        </div>

        {/* Price breakdown */}
        {breakdown && (
          <div className="mt-5 border-t border-cirkle-border pt-4">
            <Row label="Ticket price" value={rupees(breakdown.basePricePaise)} />
            {breakdown.discountPaise > 0 && (
              <Row label="Discount" value={`− ${rupees(breakdown.discountPaise)}`} accent />
            )}
            <Row label={`GST (${breakdown.gstPercentage}%)`} value={rupees(breakdown.gstPaise)} muted />
            <div className="mt-2 pt-3 border-t border-cirkle-border flex items-center justify-between">
              <span className="font-body text-[16px] font-bold text-white">Total</span>
              <span className="font-body text-[18px] font-bold text-white">{rupees(breakdown.totalPaise)}</span>
            </div>
            {breakdown.estimated && (
              <p className="mt-1 font-body text-[12px] text-cirkle-text-muted">
                Final amount is confirmed at payment.
              </p>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Error / cancelled / pending states */}
        {cancelled && (
          <p className="mt-4 font-body text-[13px] text-cirkle-text-muted">Payment cancelled. You can try again.</p>
        )}
        {payError && (
          <p className="mt-4 font-body text-[13px] text-red-400">{payError}</p>
        )}
        {alreadyHasTicket && (
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="mt-2 font-body text-[13px] font-semibold text-cirkle-yellow hover:text-cirkle-yellow-hover transition-all duration-200"
          >
            View my tickets →
          </button>
        )}

        {phase === 'pending' ? (
          <div className="mt-6">
            <p className="font-body text-[14px] text-white">
              We're confirming this payment. It'll appear in My Tickets shortly.
            </p>
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="btn-primary w-full px-8 py-3.5 mt-4"
            >
              View my tickets
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={isBusy || !breakdown}
            className="btn-primary w-full px-8 py-3.5 mt-6 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isBusy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" strokeWidth={2} />
                {phase === 'verifying' || phase === 'polling' ? 'Confirming your payment…' : 'Starting…'}
              </span>
            ) : (
              `Pay ${breakdown ? rupees(breakdown.totalPaise) : ''}`
            )}
          </button>
        )}
      </div>

      {gateMissing && (
        <SocialHandlesDialog
          missing={gateMissing}
          // Cancel abandons the purchase — no order was created.
          onCancel={() => setGateMissing(null)}
          onSaved={async () => {
            setGateMissing(null)
            await handlePay() // the gate now passes; resumes the normal flow
          }}
        />
      )}
    </div>
  )
}

export default Checkout
