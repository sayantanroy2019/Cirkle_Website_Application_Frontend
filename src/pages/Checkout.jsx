import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ticket, Loader2 } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { useEventsStore, selectEventById } from '../store/eventsStore.js'
import { useProfileStore } from '../store/profileStore.js'
import { formatEventDateTime } from '../lib/format.js'
import {
  estimateBreakdown,
  validateCoupon,
  createOrder,
  verifyPayment,
  pollOrderUntilPaid,
  openRazorpayCheckout,
} from '../lib/payment.js'
import { socialGateMissing } from '../lib/socialHandles.js'
import {
  requiredHandlesFor,
  missingHandles,
  formNeededFor,
  markFormConfirmed,
} from '../lib/eventGate.js'
import SocialHandlesDialog from '../components/SocialHandlesDialog.jsx'
import HoldCountdown from '../components/HoldCountdown.jsx'
import { useBackOr } from '../lib/navigation.js'

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
  const location = useLocation()
  // Normally returns to the ticket picker; if this is the first page in the
  // tab (restored session, pasted URL), the event itself is the parent.
  const goBack = useBackOr(`/events/${eventId}`)

  // The ticket category chosen on the event detail page. Order creation does
  // not accept a category yet (Part 4) — this is carried and displayed so the
  // buyer sees what they picked. When the API takes it, send `ticketCategory.id`
  // (also available as location.state.ticketCategoryId) to createOrder.
  const ticketCategory = location.state?.ticketCategory ?? null

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
  // Non-null while the requirements dialog is open: { missing, withForm } —
  // the handles to collect (from the profile, or the exact list the server
  // said was missing) and whether the organizer's form must be shown too.
  const [gate, setGate] = useState(null)
  const [cancelled, setCancelled] = useState(false)
  const [alreadyHasTicket, setAlreadyHasTicket] = useState(false)
  // The chosen category sold out (or was withdrawn) between picking and paying.
  const [categoryUnavailable, setCategoryUnavailable] = useState('')
  // A live hold on a DIFFERENT category than the one just chosen. The server
  // allows one hold per event, so we stop here and explain rather than opening
  // Razorpay for the wrong ticket.
  const [conflictingHold, setConflictingHold] = useState(null)
  const [holdExpired, setHoldExpired] = useState(false)
  // The live hold behind the current attempt — drives the countdown shown after
  // a dismissed payment, so the user knows their ticket is still reserved.
  const [activeHold, setActiveHold] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Fetch the detail even when the list copy is cached: only the detail carries
  // ticketCategories, which is what names a held category back to the user.
  useEffect(() => {
    if (event?.ticketCategories || !eventId) return
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

  // Name the held category back to the user. The order carries only its id, so
  // this needs the detail response's ticketCategories.
  const heldCategory =
    conflictingHold && event?.ticketCategories
      ? event.ticketCategories.find((c) => c.id === conflictingHold.eventTicketCategoryId)
      : null

  // The server charges the category's price, so estimate from that. Falls back
  // to the event price only when no category came through (see the guard below).
  const basePricePaise = ticketCategory?.pricePaise ?? event?.price
  const breakdown = couponBreakdown ?? (basePricePaise != null ? estimateBreakdown(basePricePaise) : null)
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

    // The event page runs this same gate before the ticket picker, so this
    // normally passes silently. It exists for a buyer who arrived without
    // going through it (stale cache, a restored tab) — nobody reaches
    // Razorpay owing the organizer a handle or their form. The server's 403
    // below remains the authoritative check for handles.
    const needsForm = formNeededFor(event, 'buy')
    const gateProfile = requiredHandlesFor(event).length > 0 ? await fetchProfile() : profile
    const missingNow = missingHandles(event, gateProfile)
    if (missingNow.length > 0 || needsForm) {
      setGate({ missing: missingNow, withForm: needsForm })
      return
    }

    setPhase('creating')

    let order
    try {
      order = await createOrder(eventId, ticketCategory?.id, couponCode || undefined)
    } catch (err) {
      setPhase('idle')
      // The social-handle gate — open the dialog instead of surfacing an error.
      // Keyed off the response code, so other 403s fall through to the generic
      // handling below.
      const missing = err instanceof ApiError ? socialGateMissing(err) : null
      if (missing) {
        setGate({ missing, withForm: false })
        return
      }
      const msg = err instanceof ApiError ? err.message : 'Could not start payment. Please try again.'
      const code = err instanceof ApiError ? err.code : null

      // Category-level 409s must be matched on the code, not the prose: "This
      // ticket category is sold out" contains "ticket" and would otherwise fall
      // into the already-has-a-ticket branch below and offer My Tickets.
      if (code === 'category_sold_out' || code === 'not_available_for_sale') {
        setCategoryUnavailable(msg)
      } else if (err instanceof ApiError && err.status === 400 && /coupon/i.test(msg)) {
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

    // One hold per event: asking for a different category while one is live
    // silently returns the held one. Paying now would buy the wrong ticket at
    // the wrong price, so stop and explain instead of opening Razorpay.
    if (
      order.resumed &&
      order.eventTicketCategoryId &&
      ticketCategory?.id &&
      order.eventTicketCategoryId !== ticketCategory.id
    ) {
      setPhase('idle')
      setConflictingHold(order)
      setHoldExpired(false)
      return
    }

    await payForOrder(order)
  }

  // Everything after an order exists: open Razorpay, then confirm. Shared so
  // "pay for the ticket you're already holding" reuses the same path.
  const payForOrder = async (order) => {
    setActiveHold(order)

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

  // The category lives in router state, which does not survive a refresh or a
  // pasted link. Order creation requires it, so send them back to pick rather
  // than letting the Pay button fail with a 400.
  if (!ticketCategory) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6">
        <div className="max-w-[440px] w-full mx-auto flex-1 flex flex-col">
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="font-display text-section-md text-white uppercase">Choose a ticket first</h1>
            <p className="mt-3 font-body text-[14px] text-cirkle-text-muted">
              Pick which ticket you’re buying, then come back to pay.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}/tickets`, { replace: true })}
              className="btn-primary w-full px-8 py-3.5 mt-6"
            >
              Choose your ticket
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <div className="max-w-[440px] w-full mx-auto flex-1 flex flex-col">
        <button
          type="button"
          onClick={goBack}
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

        {/* Fixed single-ticket indicator (§13 — never a quantity selector).
            With a category chosen, "1 ticket" still holds — admitsCount is how
            many people that one ticket lets in, not how many tickets are bought. */}
        <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-cirkle-input border border-cirkle-border-card px-4 py-3">
          <Ticket size={18} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
          <div>
            <p className="font-body text-[14px] font-semibold text-white">
              {ticketCategory
                ? `${ticketCategory.categoryName} — 1 ticket`
                : 'Tickets: 1 — just for you'}
            </p>
            <p className="font-body text-[12px] text-cirkle-text-muted">
              {ticketCategory
                ? ticketCategory.admitsCount === 1
                  ? 'One ticket, one QR code. Admits 1 person.'
                  : `One ticket, one QR code. Admits ${ticketCategory.admitsCount} people — bring them with you.`
                : 'Every Cirkle booking is one ticket for yourself. You can look for a group after you pay.'}
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
        {conflictingHold && (
          <div className="mt-4 rounded-[14px] bg-cirkle-card border border-cirkle-yellow/50 px-4 py-4">
            <p className="font-body text-[15px] font-bold text-white">
              You’re already holding a {heldCategory?.categoryName ?? 'ticket'}
            </p>
            <p className="mt-1.5 font-body text-[13px] text-cirkle-text-muted leading-relaxed">
              {holdExpired ? (
                <>
                  That hold has expired, so nothing is reserved for you now. You can go back and
                  pick {ticketCategory.categoryName} — or any other ticket.
                </>
              ) : (
                <>
                  You started buying{' '}
                  {heldCategory ? `a ${heldCategory.categoryName}` : 'a ticket'} for this event and
                  didn’t finish, so it’s reserved for you. Only one ticket can be held at a time,
                  so {ticketCategory.categoryName} can’t be started until this one is paid for or
                  the hold runs out.
                </>
              )}
            </p>

            {!holdExpired && (
              <div className="mt-3 flex items-center justify-between rounded-[10px] bg-cirkle-input px-3 py-2.5">
                <span className="font-body text-[13px] text-cirkle-text-muted">
                  Hold expires in
                </span>
                <HoldCountdown
                  key={conflictingHold.expiresAt}
                  expiresAt={conflictingHold.expiresAt}
                  onExpire={() => setHoldExpired(true)}
                  className="font-body text-[16px] font-bold tabular-nums text-cirkle-yellow"
                />
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {!holdExpired && (
                <button
                  type="button"
                  onClick={() => {
                    const held = conflictingHold
                    setConflictingHold(null)
                    payForOrder(held)
                  }}
                  className="btn-primary w-full px-6 py-3"
                >
                  Pay for {heldCategory?.categoryName ?? 'held ticket'} · {rupees(conflictingHold.amount)}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/events/${eventId}/tickets`, { replace: true })}
                disabled={!holdExpired}
                className="btn-secondary w-full px-6 py-3 disabled:opacity-40 disabled:pointer-events-none"
              >
                {holdExpired
                  ? 'Choose a different ticket'
                  : `Switch ticket once the hold ends`}
              </button>
            </div>
          </div>
        )}

        {/* The hold survives a dismissed payment — say so, with the clock. */}
        {cancelled && activeHold && !conflictingHold && !holdExpired && (
          <div className="mt-3 flex items-center justify-between rounded-[10px] bg-cirkle-input border border-cirkle-border-card px-3 py-2.5">
            <span className="font-body text-[13px] text-cirkle-text-muted">
              Your ticket is still held for
            </span>
            <HoldCountdown
              key={activeHold.expiresAt}
              expiresAt={activeHold.expiresAt}
              onExpire={() => setHoldExpired(true)}
              className="font-body text-[16px] font-bold tabular-nums text-cirkle-yellow"
            />
          </div>
        )}

        {categoryUnavailable && (
          <div className="mt-4 rounded-[12px] bg-cirkle-input border border-cirkle-border-card px-4 py-3">
            <p className="font-body text-[13px] text-red-400">{categoryUnavailable}</p>
            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}/tickets`, { replace: true })}
              className="mt-2 font-body text-[13px] font-semibold text-cirkle-yellow hover:text-cirkle-yellow-hover transition-all duration-200"
            >
              Choose a different ticket →
            </button>
          </div>
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

      {gate && (
        <SocialHandlesDialog
          missing={gate.missing}
          googleFormUrl={gate.withForm ? (event?.googleFormUrl ?? null) : null}
          context="purchase"
          // Cancel abandons the purchase — no order was created.
          onCancel={() => setGate(null)}
          onSaved={async () => {
            if (gate.withForm) markFormConfirmed(eventId)
            setGate(null)
            await handlePay() // the gate now passes; resumes the normal flow
          }}
        />
      )}
    </div>
  )
}

export default Checkout
