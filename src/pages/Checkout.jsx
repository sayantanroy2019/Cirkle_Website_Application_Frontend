import { useEffect, useMemo, useState } from 'react'
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
import CompleteProfileDialog from '../components/CompleteProfileDialog.jsx'
import HoldCountdown from '../components/HoldCountdown.jsx'
import { useBackOr } from '../lib/navigation.js'
import { getPromoCode } from '../lib/promo.js'
import { trackMetaEvent } from '../lib/metaPixel.js'
import { itemsFromLines, summarizeLines, sameCart, describeItems, peopleLabel } from '../lib/cart.js'

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

  // The cart built on the ticket picker: [{ category, quantity }]. Whole
  // categories travel so this screen can name and price the lines; only ids +
  // quantities go to the API. A pre-cart bundle's router state carried one
  // `ticketCategory` — accepted here as a one-line cart.
  const cartLines = useMemo(() => {
    const lines = location.state?.cartLines
    if (Array.isArray(lines) && lines.length > 0) return lines
    const legacy = location.state?.ticketCategory
    return legacy ? [{ category: legacy, quantity: 1 }] : null
  }, [location.state])
  const items = useMemo(() => (cartLines ? itemsFromLines(cartLines) : []), [cartLines])
  const cart = useMemo(() => summarizeLines(cartLines ?? []), [cartLines])

  const cachedEvent = useEventsStore(selectEventById(eventId))
  const [event, setEvent] = useState(cachedEvent)

  const profile = useProfileStore((s) => s.profile)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)

  // Pre-filled with the code the event's promo popup advertised this
  // session (if any) — the user never retypes what we just told them.
  const [couponInput, setCouponInput] = useState(() => getPromoCode(eventId) ?? '')
  const [couponCode, setCouponCode] = useState('') // applied
  const [couponPercent, setCouponPercent] = useState(null) // % off, for display
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
  // Fallback only: the event page gates "Buy ticket" on profile completeness
  // before anyone reaches checkout, so this opens only when the server's 403
  // catches a stale client (profile_incomplete on order creation).
  const [profileGateOpen, setProfileGateOpen] = useState(false)
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

  // Name the held cart back to the user. The order response carries its own
  // lines with names, so nothing here needs the event's category list.
  const heldSummary = conflictingHold?.items?.length ? describeItems(conflictingHold.items) : null

  // The server charges the cart's price, so estimate from that: the lines'
  // prices summed, and the per-person platform fee times everyone the cart
  // admits — until the server breakdown (coupon preview / order) replaces
  // this with the authoritative one.
  const basePricePaise = cartLines ? cart.basePaise : null
  const estimatedFeePaise = (event?.platformFeePaise ?? 0) * cart.people
  const breakdown =
    couponBreakdown ??
    (basePricePaise != null ? estimateBreakdown(basePricePaise, estimatedFeePaise) : null)
  const isBusy = phase !== 'idle' && phase !== 'pending'

  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code || isApplying) return
    // The preview needs the tier the charge will use. Checkout is always
    // entered from the picker with one, but a restored tab can lose the
    // router state — degrade with a message rather than a server 400.
    if (items.length === 0) {
      setCouponError('Pick your tickets again to apply a coupon.')
      return
    }
    setIsApplying(true)
    setCouponError('')
    try {
      const res = await validateCoupon(code, eventId, items)
      setCouponBreakdown(res.breakdown)
      setCouponCode(res.couponCode)
      setCouponPercent(res.discountPercent ?? null)
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
    setCouponPercent(null)
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
      order = await createOrder(eventId, items, couponCode || undefined)
    } catch (err) {
      setPhase('idle')
      // The social-handle gate — open the dialog instead of surfacing an error.
      // Keyed off the response code, so other 403s fall through to the generic
      // handling below.
      if (err instanceof ApiError && err.code === 'profile_incomplete') {
        setProfileGateOpen(true)
        return
      }
      const missing = err instanceof ApiError ? socialGateMissing(err) : null
      if (missing) {
        setGate({ missing, withForm: false })
        return
      }
      const msg = err instanceof ApiError ? err.message : 'Could not start payment. Please try again.'
      const code = err instanceof ApiError ? err.code : null

      // Cart-level refusals must be matched on the code, not the prose: "Only
      // 2 Couple Pass tickets are left" contains "ticket" and would otherwise
      // fall into the already-has-a-ticket branch below and offer My Tickets.
      // too_many_people can only come from a stale bundle — the picker caps
      // the cart itself — but it gets the same "adjust your cart" exit.
      if (code === 'category_sold_out' || code === 'not_available_for_sale' || code === 'too_many_people') {
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

    // Ad-funnel signal: a hold exists and Razorpay is about to open. The
    // order id doubles as the dedup key if a server twin is ever added.
    trackMetaEvent(
      'InitiateCheckout',
      { value: order.amount / 100, currency: 'INR' },
      order.orderId,
    )

    // One hold per event: asking for a different cart while one is live
    // silently returns the held one. Paying now would buy the wrong tickets at
    // the wrong price, so stop and explain instead of opening Razorpay.
    if (order.resumed && Array.isArray(order.items) && !sameCart(items, order.items)) {
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

  // The cart lives in router state, which does not survive a refresh or a
  // pasted link. Order creation requires it, so send them back to pick rather
  // than letting the Pay button fail with a 400.
  if (!cartLines) {
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
            <h1 className="font-display text-section-md text-white uppercase">Choose your tickets first</h1>
            <p className="mt-3 font-body text-[14px] text-cirkle-text-muted">
              Pick which tickets you’re buying, then come back to pay.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}/tickets`, { replace: true })}
              className="btn-primary w-full px-8 py-3.5 mt-6"
            >
              Choose your tickets
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

        {/* The cart: every line, then what the one QR admits. */}
        <div className="mt-4 rounded-[12px] bg-cirkle-input border border-cirkle-border-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
            <p className="font-body text-[14px] font-semibold text-white">
              {cart.tickets} {cart.tickets === 1 ? 'ticket' : 'tickets'} · admits {peopleLabel(cart.people)}
            </p>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {cartLines.map((line) => (
              <li key={line.category.id} className="font-body text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-cirkle-text-light">
                    {line.quantity}× {line.category.categoryName}
                  </span>
                  <span className="text-white">{rupees(line.category.pricePaise * line.quantity)}</span>
                </div>
                {/* The tier's note, same voice as on the picker. */}
                {line.category.note && (
                  <p className="mt-0.5 font-body text-[12px] leading-snug text-cirkle-text-muted whitespace-pre-line">
                    {line.category.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-body text-[12px] text-cirkle-text-muted">
            {cart.people === 1
              ? 'One QR code. Admits 1 person.'
              : `One QR code for everyone. Admits ${cart.people} people — bring them with you.`}
          </p>
        </div>

        {/* Coupon */}
        <div className="mt-5">
          <label className="font-body text-[13px] font-semibold text-cirkle-text-light">Have a coupon?</label>
          {couponCode ? (
            <div className="mt-1.5 flex items-center justify-between px-4 py-3 rounded-[10px] bg-cirkle-input border border-cirkle-yellow">
              <span className="font-body text-[14px] font-bold text-white">
                {couponCode} applied{couponPercent ? ` · ${couponPercent}% off` : ''}
              </span>
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
            <Row label="Tickets" value={rupees(breakdown.basePricePaise)} />
            {breakdown.discountPaise > 0 && (
              <Row label="Discount" value={`− ${rupees(breakdown.discountPaise)}`} accent />
            )}
            {breakdown.platformFeePaise > 0 && (
              <Row label={`Platform fee (${peopleLabel(cart.people)})`} value={rupees(breakdown.platformFeePaise)} muted />
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
              You’re already holding {heldSummary ?? 'a ticket'}
            </p>
            <p className="mt-1.5 font-body text-[13px] text-cirkle-text-muted leading-relaxed">
              {holdExpired ? (
                <>
                  That hold has expired, so nothing is reserved for you now. You can go back and
                  build your cart again.
                </>
              ) : (
                <>
                  You started buying {heldSummary ?? 'a ticket'} for this event and didn’t finish,
                  so it’s reserved for you. Only one booking can be held at a time, so a
                  different cart can’t be started until this one is paid for or the hold runs out.
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
                  Pay for the held tickets · {rupees(conflictingHold.amount)}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/events/${eventId}/tickets`, { replace: true })}
                disabled={!holdExpired}
                className="btn-secondary w-full px-6 py-3 disabled:opacity-40 disabled:pointer-events-none"
              >
                {holdExpired
                  ? 'Change your tickets'
                  : `Change tickets once the hold ends`}
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
              Adjust your tickets →
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

      {profileGateOpen && (
        <CompleteProfileDialog
          message="Tickets on Cirkle belong to member profiles — the people you meet see who you are. Complete yours to book."
          returnTo={`/events/${eventId}?resume=buy`}
          onCancel={() => setProfileGateOpen(false)}
        />
      )}

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
