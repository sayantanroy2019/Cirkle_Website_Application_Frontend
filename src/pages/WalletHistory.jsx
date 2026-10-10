import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, ChevronRight } from 'lucide-react'
import { ApiError } from '../lib/api.js'
import { useWalletStore } from '../store/walletStore.js'
import { getWalletSale, formatRupees, formatValidTill, formatWhen } from '../lib/wallet.js'

/**
 * Payment history (F&B spec Part 5, card 6): every credit and debit of the
 * wallet for the last 10 days, grouped by event, newest first. A bill opens
 * a sheet with its lines.
 */

function StatusChip({ event }) {
  if (event.expired) return <span className="chip text-cirkle-text-muted">Expired</span>
  if (event.status === 'live') return <span className="chip bg-cirkle-yellow/15 text-cirkle-yellow">Live</span>
  if (event.status === 'ended') return <span className="chip">Ended</span>
  return null
}

function EntryRow({ entry, onOpen }) {
  const credit = entry.amountPaise > 0
  const clickable = Boolean(entry.saleId && onOpen)
  const Tag = clickable ? 'button' : 'div'
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? () => onOpen(entry.saleId) : undefined}
      className={`w-full flex items-center gap-3 py-3 text-left border-b border-cirkle-border last:border-b-0 ${clickable ? 'hover:bg-white/5 -mx-2 px-2 rounded-lg' : ''}`}
    >
      <span className="flex-1 min-w-0">
        <span className="block font-body text-[14px] font-semibold text-white truncate">{entry.title}</span>
        <span className="block font-body text-[12px] text-cirkle-text-muted">
          {formatWhen(entry.at)}
          {entry.volunteer ? ` · ${entry.volunteer}` : ''}
        </span>
      </span>
      <span className="text-right shrink-0">
        <span className={`block font-body text-[15px] font-bold tabular-nums ${credit ? 'text-cirkle-yellow' : 'text-white'}`}>
          {credit ? '+' : '−'}
          {formatRupees(Math.abs(entry.amountPaise))}
        </span>
        <span className="block font-body text-[11.5px] text-cirkle-text-muted tabular-nums">bal {formatRupees(entry.balanceAfterPaise)}</span>
      </span>
      {clickable && <ChevronRight size={16} className="shrink-0 text-cirkle-text-muted" strokeWidth={2} />}
    </Tag>
  )
}

function BillSheet({ saleId, onClose }) {
  const [sale, setSale] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getWalletSale(saleId)
      .then((d) => {
        if (active) setSale(d.sale)
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Could not load the bill.')
      })
    return () => {
      active = false
    }
  }, [saleId])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bill-title">
      <div className="w-full sm:max-w-[420px] max-h-[92dvh] overflow-y-auto bg-cirkle-card border border-cirkle-border-card rounded-t-[20px] sm:rounded-[20px] p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="bill-title" className="font-body text-[20px] font-bold text-white leading-snug">
            {sale ? `Bill #${sale.billNo}` : 'Bill'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 w-9 h-9 flex items-center justify-center rounded-full text-cirkle-text-muted hover:bg-white/10 hover:text-white">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {error && <p className="mt-3 font-body text-[13px] text-red-400">{error}</p>}
        {!sale && !error && <p className="mt-3 font-body text-[13px] text-cirkle-text-muted">Loading…</p>}
        {sale && (
          <>
            <p className="mt-1 font-body text-[13px] text-cirkle-text-muted">
              {sale.stallName} · {sale.eventName} · {formatWhen(sale.at)}
            </p>
            {sale.status === 'reversed' && (
              <p className="mt-2 inline-block chip bg-red-400/15 text-red-300">Reversed{sale.reversedAt ? ` on ${formatWhen(sale.reversedAt)}` : ''}</p>
            )}
            <div className="mt-4">
              {sale.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-cirkle-border last:border-b-0">
                  <span className="font-body text-[14px] text-white">
                    {it.quantity} × {it.name}
                    <span className="ml-2 font-body text-[12px] text-cirkle-text-muted">{formatRupees(it.unitPricePaise)} each</span>
                  </span>
                  <span className="font-body text-[14px] text-white tabular-nums">{formatRupees(it.lineTotalPaise)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3">
                <span className="font-body text-[15px] font-bold text-white">Total</span>
                <span className="font-body text-[15px] font-bold text-cirkle-yellow tabular-nums">{formatRupees(sale.totalPaise)}</span>
              </div>
            </div>
          </>
        )}
        <button type="button" onClick={onClose} className="btn-secondary w-full py-3 mt-5">
          Done
        </button>
      </div>
    </div>
  )
}

export function WalletHistory() {
  const navigate = useNavigate()
  const [openSale, setOpenSale] = useState(null)

  // From the cache warmed at launch; refreshed quietly on every open.
  const data = useWalletStore((s) => s.history)
  const historyError = useWalletStore((s) => s.historyError)
  const fetchHistory = useWalletStore((s) => s.fetchHistory)
  useEffect(() => {
    fetchHistory({ force: true })
  }, [fetchHistory])
  const loadError = data ? '' : historyError

  const events = data?.events ?? []

  return (
    <div className="min-h-[100dvh] bg-cirkle-black">
      <div className="px-6 py-6 max-w-[480px] mx-auto">
        <button type="button" onClick={() => navigate('/wallet')} aria-label="Back to wallet" className="-ml-2 p-2 rounded-full text-white transition-colors hover:bg-white/10">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="mt-3 font-display text-section-md text-white uppercase">Payment history</h1>
        <p className="mt-1 font-body text-[13.5px] text-cirkle-text-muted">Every top-up and every bill from the last {data?.days ?? 10} days.</p>

        {loadError && <p className="mt-5 font-body text-[14px] text-red-400">{loadError}</p>}
        {data === null && !loadError && (
          <div className="mt-5 card-dark p-4 animate-pulse hover:translate-y-0">
            <div className="h-4 w-1/2 rounded bg-cirkle-input" />
            <div className="mt-3 h-3 w-full rounded bg-cirkle-input" />
            <div className="mt-2 h-3 w-2/3 rounded bg-cirkle-input" />
          </div>
        )}
        {data && events.length === 0 && (
          <p className="mt-5 font-body text-[14px] text-cirkle-text-muted">Nothing in the last {data.days} days.</p>
        )}

        <div className="mt-5 flex flex-col gap-4">
          {events.map((ev) => (
            <section key={ev.eventId} className="card-dark p-4 hover:translate-y-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-body text-[15px] font-bold text-white truncate">{ev.eventName}</p>
                  <p className="mt-0.5 font-body text-[12px] text-cirkle-text-muted">
                    {ev.expired
                      ? 'Balance expired'
                      : ev.validTill
                        ? `Valid till ${formatValidTill(ev.validTill)}`
                        : 'Live now'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-body text-[16px] font-bold text-cirkle-yellow tabular-nums">{formatRupees(ev.balancePaise)}</p>
                  <div className="mt-1">
                    <StatusChip event={ev} />
                  </div>
                </div>
              </div>
              <div className="mt-2">
                {ev.entries.length === 0 ? (
                  <p className="py-2 font-body text-[13px] text-cirkle-text-muted">No movements in the last {data.days} days.</p>
                ) : (
                  ev.entries.map((entry) => <EntryRow key={entry.id} entry={entry} onOpen={setOpenSale} />)
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
      {openSale && <BillSheet saleId={openSale} onClose={() => setOpenSale(null)} />}
    </div>
  )
}

export default WalletHistory
