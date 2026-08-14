import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, CheckCircle2 } from 'lucide-react'
import QRCode from 'qrcode'
import { api, ApiError } from '../lib/api.js'
import { formatEventDateTime } from '../lib/format.js'
import { useAuthStore } from '../store/authStore.js'
import { rememberRedirect } from '../lib/redirect.js'
import { readCachedTicket, writeCachedTicket } from '../lib/ticketCache.js'

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

const bookedFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

function Fact({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-cirkle-border last:border-b-0">
      <span className="font-body text-[14px] text-cirkle-text-muted">{label}</span>
      <span className="font-body text-[14px] font-semibold text-white">{value}</span>
    </div>
  )
}

export function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const clearToken = useAuthStore((s) => s.clearToken)

  // Paint the last-seen copy immediately: this screen gets opened in basements
  // and queues, where a spinner is worse than slightly stale data.
  const [ticket, setTicket] = useState(() => readCachedTicket(id))
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await api.get(`/tickets/${id}`)
        if (!active) return
        setTicket(data.ticket)
        setLoadError('')
        setNotFound(false)
        setCanRetry(false)
        writeCachedTicket(id, data.ticket)
      } catch (err) {
        if (!active) return
        const status = err instanceof ApiError ? err.status : null
        if (status === 404) {
          // The backend returns an identical 404 for "no such ticket" and "not
          // yours". Wording must not distinguish them either — "this isn't your
          // ticket" would confirm the ticket exists, which is the whole point
          // of the responses being identical.
          setNotFound(true)
        } else if (status === 401) {
          // Token expired. Store this path so signing in again lands back here.
          rememberRedirect(`/tickets/${id}`)
          clearToken()
          navigate('/phone', { replace: true })
          return
        } else {
          // Server error or offline. If a cached copy is on screen, leave it —
          // a stale ticket beats stranding someone at a venue on a dead screen.
          setCanRetry(true)
          setLoadError(
            readCachedTicket(id)
              ? 'Showing your saved copy — we couldn’t refresh it.'
              : 'Could not load this ticket.',
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id, reloadKey, navigate, clearToken])

  // Drawn from whatever payload we have — network or cache — so the code is
  // present offline. THE RULE: qrPayload goes to the renderer exactly as
  // received. No parse-and-restringify, no extracting `t`, no trimming. The
  // email's QR and this one must decode to the identical string, or a scanner
  // cannot treat them as one ticket. Re-encoding yields a QR that looks fine
  // and fails at the door.
  useEffect(() => {
    let active = true
    void (async () => {
      const payload = ticket?.qrPayload
      if (!payload) {
        if (active) setQrDataUrl('')
        return
      }
      try {
        const url = await QRCode.toDataURL(payload, {
          width: 240,
          margin: 1,
          color: { dark: '#060606', light: '#FFFFFF' },
        })
        if (active) setQrDataUrl(url)
      } catch {
        /* Rendering failed — the printed bookingRef below is the fallback.
           Deliberately not the payload: a JSON blob is useless to door staff. */
      }
    })()
    return () => {
      active = false
    }
  }, [ticket?.qrPayload])

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="max-w-[420px] w-full mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>

        {isLoading && !ticket && (
          <p className="mt-6 font-body text-[14px] text-cirkle-text-muted">Loading…</p>
        )}

        {/* Same wording whether the ticket doesn't exist or belongs to someone
            else — the backend returns an identical 404 for both precisely so
            this screen can't be used to probe whether a ticket is real. */}
        {notFound && (
          <div className="mt-8">
            <h1 className="font-display text-section-md text-white uppercase">Ticket not found</h1>
            <p className="mt-3 font-body text-[14px] text-cirkle-text-muted">
              This ticket isn’t on your account. If someone forwarded it to you, the ticket stays
              with the person who booked it.
            </p>
            <button
              type="button"
              onClick={() => navigate('/tickets', { replace: true })}
              className="btn-primary w-full px-8 py-3.5 mt-6"
            >
              Go to my tickets
            </button>
          </div>
        )}

        {loadError && !notFound && (
          <div className="mt-6">
            <p className="font-body text-[14px] text-red-400">{loadError}</p>
            {canRetry && (
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true)
                  setLoadError('')
                  setReloadKey((k) => k + 1)
                }}
                className="mt-2 font-body text-[13px] font-semibold text-cirkle-yellow hover:text-cirkle-yellow-hover transition-colors duration-200"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {ticket && !notFound && (
          <>
            <h1 className="mt-4 font-display text-section-md text-white uppercase">{ticket.event.name}</h1>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-body text-[14px] text-cirkle-text-light">
                <CalendarDays size={16} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
                <span>{formatEventDateTime(ticket.event.startsAt)}</span>
              </div>
              <div className="flex items-start gap-2 font-body text-[14px] text-cirkle-text-light">
                <MapPin size={16} className="text-cirkle-yellow shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {ticket.event.venueName}
                  {ticket.event.venueAddress && (
                    <span className="text-cirkle-text-muted">, {ticket.event.venueAddress}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Entered already — say so, but keep the QR on screen. Staff may
                still need to re-scan, and an absent code reads as a problem. */}
            {ticket.checkedIn && (
              <div className="mt-5 flex items-center gap-2 rounded-[12px] bg-cirkle-chip border border-cirkle-border-card px-4 py-3">
                <CheckCircle2 size={18} className="text-cirkle-yellow shrink-0" strokeWidth={2} />
                <span className="font-body text-[14px] font-semibold text-white">
                  Already checked in
                </span>
              </div>
            )}

            {/* QR block */}
            <div className="mt-6 rounded-card bg-white p-5 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Entry QR code" className="w-[240px] h-[240px]" />
              ) : (
                // No QR: either rendering failed, or this is a ticket issued
                // before QR tokens existed (qrPayload null). Show the reference
                // as the ticket itself — an empty or broken QR frame at an
                // entrance reads as a rejected ticket.
                <div className="w-[240px] flex flex-col items-center justify-center text-center py-6">
                  <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-cirkle-text-muted">
                    Booking reference
                  </span>
                  <span className="mt-2 font-display text-[28px] leading-none text-cirkle-text-dark tracking-wider">
                    {ticket.bookingRef}
                  </span>
                  <span className="mt-3 font-body text-[12px] text-cirkle-text-dark/70 px-2">
                    Give this reference at the door — staff will check you in with it.
                  </span>
                </div>
              )}
              <p className="mt-3 font-body text-[13px] font-bold text-cirkle-text-dark tracking-wider">
                {ticket.bookingRef}
              </p>
            </div>
            <p className="mt-2 text-center font-body text-[13px] text-cirkle-text-muted">
              Show this at the entrance
            </p>

            {/* Three plain facts */}
            <div className="mt-6">
              <Fact label="Ticket holder" value="You" />
              <Fact label="Price paid" value={rupees(ticket.pricePaid)} />
              <Fact label="Booking date" value={bookedFmt.format(new Date(ticket.bookedAt))} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TicketDetail
