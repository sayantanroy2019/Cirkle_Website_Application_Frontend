import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import QRCode from 'qrcode'
import { api, ApiError } from '../lib/api.js'
import { formatEventDateTime } from '../lib/format.js'

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

  const [ticket, setTicket] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError('')
    api
      .get(`/tickets/${id}`)
      .then(async (data) => {
        if (!active) return
        setTicket(data.ticket)
        try {
          const url = await QRCode.toDataURL(data.ticket.bookingRef, {
            width: 240,
            margin: 1,
            color: { dark: '#060606', light: '#FFFFFF' },
          })
          if (active) setQrDataUrl(url)
        } catch {
          /* QR failed to render — the printed ref below still works */
        }
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load this ticket.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

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

        {isLoading && (
          <p className="mt-6 font-body text-[14px] text-cirkle-text-muted">Loading…</p>
        )}
        {loadError && (
          <p className="mt-6 font-body text-[14px] text-red-400">{loadError}</p>
        )}

        {ticket && (
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

            {/* QR block */}
            <div className="mt-6 rounded-card bg-white p-5 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Entry QR code" className="w-[240px] h-[240px]" />
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center font-body text-[13px] text-cirkle-text-dark">
                  {ticket.bookingRef}
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
