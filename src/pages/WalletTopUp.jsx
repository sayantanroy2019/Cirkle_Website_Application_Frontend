import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { ApiError } from '../lib/api.js'
import { useProfileStore } from '../store/profileStore.js'
import { useWalletStore } from '../store/walletStore.js'
import { openRazorpayCheckout } from '../lib/payment.js'
import { createWalletTopup, verifyWalletTopup, pollTopupUntilCredited, formatRupees } from '../lib/wallet.js'

/**
 * Top up (F&B spec Part 5, card 2): pick the Live event → pick or type the
 * amount → Pay opens Razorpay Checkout → the wallet is credited on capture
 * (the app's verify relay, or the webhook with a poll fallback).
 */
export function WalletTopUp() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.profile)

  const [chosenEventId, setChosenEventId] = useState('')
  const [amountPaise, setAmountPaise] = useState(0)
  const [custom, setCustom] = useState('')
  const [phase, setPhase] = useState('idle') // idle | creating | awaiting | verifying | polling | done | pending
  const [payError, setPayError] = useState('')
  const [done, setDone] = useState(null) // { amountPaise, balancePaise, eventName }

  // Events and the amount rules come from the cache warmed at launch and are
  // refreshed quietly here, so the page is usable the moment it opens.
  const events = useWalletStore((s) => s.events)
  const eventsError = useWalletStore((s) => s.eventsError)
  const rules = useWalletStore((s) => s.summary?.rules ?? null)
  const fetchEvents = useWalletStore((s) => s.fetchEvents)
  const fetchSummary = useWalletStore((s) => s.fetchSummary)
  const fetchHistory = useWalletStore((s) => s.fetchHistory)
  const setSummary = useWalletStore((s) => s.setSummary)
  useEffect(() => {
    fetchEvents({ force: true })
    fetchSummary()
  }, [fetchEvents, fetchSummary])
  const loadError = events ? '' : eventsError

  // One live event needs no picking.
  const eventId = chosenEventId || (events?.length === 1 ? events[0].id : '')
  const setEventId = setChosenEventId
  const event = useMemo(() => events?.find((e) => e.id === eventId) ?? null, [events, eventId])

  const pickQuick = (paise) => {
    setAmountPaise(paise)
    setCustom('')
    setPayError('')
  }
  const onCustom = (value) => {
    const digits = value.replace(/[^\d]/g, '').slice(0, 6)
    setCustom(digits)
    setAmountPaise(digits ? Number(digits) * 100 : 0)
    setPayError('')
  }

  const amountError = (() => {
    if (!rules || !amountPaise) return ''
    if (amountPaise < rules.minTopupPaise) return `Minimum top-up is ${formatRupees(rules.minTopupPaise)}.`
    if (amountPaise > rules.maxTopupPaise) return `Maximum top-up is ${formatRupees(rules.maxTopupPaise)} at a time.`
    return ''
  })()
  const canPay = Boolean(event) && amountPaise > 0 && !amountError && phase === 'idle'

  const pay = async () => {
    if (!canPay) return
    setPayError('')
    setPhase('creating')
    let created
    try {
      created = await createWalletTopup(event.id, amountPaise)
    } catch (err) {
      setPhase('idle')
      setPayError(err instanceof ApiError ? err.data?.message || err.message : 'Could not start the payment.')
      return
    }

    setPhase('awaiting')
    let handlerRes
    try {
      handlerRes = await openRazorpayCheckout({
        order: created.order,
        prefill: { name: profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() : undefined, email: profile?.email },
      })
    } catch (e) {
      setPhase('idle')
      if (!(e && e.dismissed)) setPayError(e?.message || 'Payment could not start.')
      return
    }

    // Channel A — the fast path.
    setPhase('verifying')
    try {
      const v = await verifyWalletTopup(created.topup.id, handlerRes)
      setSummary(v.wallet) // the cache knows the new balance before the next screen opens
      fetchHistory({ force: true })
      setDone({ amountPaise, balancePaise: v.wallet.totalBalancePaise, eventName: event.name })
      setPhase('done')
      return
    } catch {
      // The relay failed — NOT the payment. Channel B: the webhook + a poll.
      setPhase('polling')
      const polled = await pollTopupUntilCredited(created.topup.id)
      if (polled && polled.status === 'credited') {
        const summary = await fetchSummary({ force: true })
        fetchHistory({ force: true })
        setDone({ amountPaise, balancePaise: summary?.totalBalancePaise ?? null, eventName: event.name })
        setPhase('done')
      } else {
        setPhase('pending')
      }
    }
  }

  const Back = (
    <button
      type="button"
      onClick={() => navigate('/wallet')}
      aria-label="Back to wallet"
      className="-ml-2 p-2 rounded-full text-white transition-colors hover:bg-white/10"
    >
      <ArrowLeft size={22} strokeWidth={2} />
    </button>
  )

  if (phase === 'done' && done) {
    return (
      <div className="min-h-[100dvh] bg-cirkle-black">
        <div className="px-6 py-6 max-w-[480px] mx-auto flex flex-col items-center text-center pt-20">
          <CheckCircle2 size={56} className="text-cirkle-yellow" strokeWidth={1.75} />
          <h1 className="mt-5 font-display text-section-md text-white uppercase">{formatRupees(done.amountPaise)} added</h1>
          <p className="mt-2 font-body text-[14px] text-cirkle-text-muted">
            For {done.eventName}.{done.balancePaise !== null && ` Your balance is now ${formatRupees(done.balancePaise)}.`}
            {' '}A receipt with your QR is on its way to WhatsApp.
          </p>
          <button type="button" onClick={() => navigate('/wallet', { replace: true })} className="btn-primary w-full py-3.5 mt-8">
            Back to wallet
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'pending') {
    return (
      <div className="min-h-[100dvh] bg-cirkle-black">
        <div className="px-6 py-6 max-w-[480px] mx-auto flex flex-col items-center text-center pt-20">
          <Clock size={56} className="text-cirkle-yellow" strokeWidth={1.75} />
          <h1 className="mt-5 font-display text-section-md text-white uppercase">Confirming your payment</h1>
          <p className="mt-2 font-body text-[14px] text-cirkle-text-muted leading-relaxed">
            Your bank has the payment; we’re waiting for the confirmation. The money appears in your wallet within a minute, and
            the receipt comes on WhatsApp. Don’t pay again.
          </p>
          <button type="button" onClick={() => navigate('/wallet', { replace: true })} className="btn-primary w-full py-3.5 mt-8">
            Back to wallet
          </button>
        </div>
      </div>
    )
  }

  const busy = phase !== 'idle'

  return (
    <div className="min-h-[100dvh] bg-cirkle-black">
      <div className="px-6 py-6 max-w-[480px] mx-auto">
        {Back}
        <h1 className="mt-3 font-display text-section-md text-white uppercase">Top up</h1>
        <p className="mt-1 font-body text-[13.5px] text-cirkle-text-muted">Add money for an event that is live right now.</p>

        {loadError && <p className="mt-5 font-body text-[14px] text-red-400">{loadError}</p>}

        {/* Event */}
        <section className="mt-6">
          <h2 className="font-body text-label uppercase tracking-[0.15em] text-cirkle-text-muted">Event</h2>
          <div className="mt-3 flex flex-col gap-3">
            {events === null && !loadError && (
              <div className="card-dark p-4 animate-pulse">
                <div className="h-4 w-1/2 rounded bg-cirkle-input" />
                <div className="mt-2 h-3 w-1/3 rounded bg-cirkle-input" />
              </div>
            )}
            {events?.length === 0 && (
              <div className="card-dark p-4 hover:translate-y-0">
                <p className="font-body text-[15px] font-bold text-white">No event is open for top-ups right now</p>
                <p className="mt-1 font-body text-[13px] text-cirkle-text-muted leading-relaxed">
                  Top-ups open the moment an event goes live and close when it ends. You can also top up at a Cirkle counter at the
                  event.
                </p>
              </div>
            )}
            {events?.map((e) => {
              const selected = e.id === eventId
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEventId(e.id)}
                  disabled={busy}
                  className={`card-dark text-left p-4 flex items-center gap-3 ${selected ? 'border-cirkle-yellow hover:border-cirkle-yellow' : ''}`}
                >
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selected ? 'border-cirkle-yellow' : 'border-cirkle-text-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {selected && <span className="w-2.5 h-2.5 rounded-full bg-cirkle-yellow" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-body text-[15px] font-bold text-white truncate">{e.name}</span>
                    {e.venueName && (
                      <span className="mt-0.5 flex items-center gap-1 font-body text-[12.5px] text-cirkle-text-muted">
                        <MapPin size={12} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
                        <span className="truncate">{e.venueName}</span>
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Amount */}
        {events?.length > 0 && rules && (
          <section className="mt-6">
            <h2 className="font-body text-label uppercase tracking-[0.15em] text-cirkle-text-muted">Amount</h2>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {rules.quickAmountsPaise.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => pickQuick(p)}
                  disabled={busy}
                  className={`py-2.5 rounded-full font-body text-[14px] font-bold border transition-all duration-200 ${
                    amountPaise === p && !custom
                      ? 'bg-cirkle-yellow text-cirkle-text-dark border-cirkle-yellow'
                      : 'bg-cirkle-input text-white border-cirkle-border-card hover:border-cirkle-text-muted'
                  }`}
                >
                  {formatRupees(p)}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center rounded-[12px] bg-cirkle-input border border-cirkle-border focus-within:border-cirkle-yellow">
              <span className="pl-4 font-body text-[16px] text-cirkle-text-muted select-none">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={custom}
                onChange={(e) => onCustom(e.target.value)}
                disabled={busy}
                placeholder="Other amount"
                aria-label="Other amount in rupees"
                className="w-full bg-transparent px-2 py-3.5 font-body text-[16px] text-white placeholder:text-cirkle-text-placeholder focus:outline-none"
              />
            </div>
            <p className="mt-2 font-body text-[12.5px] text-cirkle-text-muted">
              {amountError || `Between ${formatRupees(rules.minTopupPaise)} and ${formatRupees(rules.maxTopupPaise)} at a time.`}
            </p>
          </section>
        )}

        {/* The rules, before Pay */}
        {event && (
          <div className="mt-6 rounded-[12px] border border-cirkle-yellow/30 bg-cirkle-yellow/5 p-4">
            <p className="font-body text-[13px] text-cirkle-text-light leading-relaxed">
              This money is for <span className="font-bold text-white">{event.name}</span> only. It expires{' '}
              <span className="font-bold text-white">{event.expiryHoursAfterEnd} hours</span> after the event ends, and any unspent
              balance is not refunded.
            </p>
          </div>
        )}

        {payError && <p className="mt-4 font-body text-[13px] text-red-400">{payError}</p>}

        <button type="button" onClick={pay} disabled={!canPay} className="btn-primary w-full py-3.5 mt-6 disabled:opacity-50 disabled:hover:translate-y-0">
          {busy && <Loader2 size={18} className="mr-2 animate-spin" strokeWidth={2.5} />}
          {phase === 'creating' && 'Starting payment…'}
          {phase === 'awaiting' && 'Complete the payment…'}
          {phase === 'verifying' && 'Confirming…'}
          {phase === 'polling' && 'Confirming…'}
          {phase === 'idle' && (amountPaise > 0 ? `Pay ${formatRupees(amountPaise)}` : 'Pay')}
        </button>
      </div>
    </div>
  )
}

export default WalletTopUp
