import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Wallet as WalletIcon,
  PlusCircle,
  QrCode,
  LockOpen,
  Lock,
  RefreshCw,
  Receipt,
  ChevronRight,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore.js'
import { formatRupees, formatValidTill } from '../lib/wallet.js'
import { ShowQrDialog, LockWalletDialog, NewQrDialog } from '../components/wallet/WalletDialogs.jsx'

/**
 * My Wallet — the attendee's Cirkle Wallet (F&B spec Part 5, §5.1–5.2).
 *
 *   row 1  Total wallet balance (the big card)
 *   row 2  Top up · Show QR (side by side)
 *   row 3  Lock / unlock wallet
 *   row 4  Generate new QR
 *   row 5  Payment history
 */

function IconTile({ icon: Icon, tone = 'yellow' }) {
  const tones = {
    yellow: 'bg-cirkle-yellow/12 text-cirkle-yellow',
    red: 'bg-red-400/15 text-red-300',
  }
  return (
    <span className={`shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center ${tones[tone]}`} aria-hidden="true">
      <Icon size={22} strokeWidth={2} />
    </span>
  )
}

/** A full-width action row: icon · title + one line · chevron. */
function ActionCard({ icon, tone, title, description, trailing, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card-dark w-full text-left p-4 flex items-center gap-3.5 disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <IconTile icon={icon} tone={tone} />
      <span className="flex-1 min-w-0">
        <span className="block font-body text-[15px] font-bold text-white">{title}</span>
        <span className="block mt-0.5 font-body text-[12.5px] text-cirkle-text-muted leading-snug">{description}</span>
      </span>
      {trailing ?? <ChevronRight size={18} className="shrink-0 text-cirkle-text-muted" strokeWidth={2} />}
    </button>
  )
}

/** A half-width tile for the side-by-side row: icon on top, title, one line. */
function TileCard({ icon: Icon, title, description, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card-dark text-left p-4 flex flex-col gap-3 min-h-[128px] disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <IconTile icon={Icon} />
      <span>
        <span className="block font-body text-[15px] font-bold text-white">{title}</span>
        <span className="block mt-0.5 font-body text-[12.5px] text-cirkle-text-muted leading-snug">{description}</span>
      </span>
    </button>
  )
}

function BalanceCard({ summary, isLoading, loadError }) {
  const active = summary?.active ?? []
  const locked = Boolean(summary?.locked)
  return (
    <section className="card-dark p-5 hover:translate-y-0 relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-cirkle-yellow/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="font-body text-label uppercase tracking-[0.15em] text-cirkle-text-muted">Total wallet balance</span>
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-400/15 px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-red-300">
            <Lock size={12} strokeWidth={2.5} /> Locked
          </span>
        ) : (
          <WalletIcon size={20} className="text-cirkle-yellow" strokeWidth={2} />
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 h-12 w-40 rounded bg-cirkle-input animate-pulse" />
      ) : (
        <p className="mt-2 font-display text-section-lg leading-none text-cirkle-yellow">{formatRupees(summary?.totalBalancePaise ?? 0)}</p>
      )}

      <div className="mt-3">
        {loadError && <p className="font-body text-[13px] text-red-400">{loadError}</p>}
        {!isLoading && !loadError && active.length === 0 && (
          <p className="font-body text-[13px] text-cirkle-text-muted leading-relaxed">
            No active balance. Top up here when an event is live, or at a Cirkle counter at the event.
          </p>
        )}
        {!isLoading &&
          active.map((a) => (
            <div key={a.eventId} className="flex items-baseline justify-between gap-3 py-1">
              <span className="font-body text-[13.5px] font-semibold text-white truncate">{a.eventName}</span>
              <span className="shrink-0 font-body text-[12.5px] text-cirkle-text-muted">
                {active.length > 1 && <span className="text-white font-semibold mr-2">{formatRupees(a.balancePaise)}</span>}
                {a.validTill ? `valid till ${formatValidTill(a.validTill)}` : 'live now'}
              </span>
            </div>
          ))}
      </div>
    </section>
  )
}

export function Wallet() {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState(null) // 'qr' | 'lock' | 'newqr'

  // Rendered from the cache the app shell warmed at launch; refreshed
  // quietly on every open so the balance is never more than a tap old.
  const summary = useWalletStore((s) => s.summary)
  const summaryError = useWalletStore((s) => s.summaryError)
  const qrDataUrl = useWalletStore((s) => (s.summary && s.qrForUrl === s.summary.qrUrl ? s.qrDataUrl : ''))
  const fetchSummary = useWalletStore((s) => s.fetchSummary)
  const patchSummary = useWalletStore((s) => s.patchSummary)
  useEffect(() => {
    fetchSummary({ force: true })
  }, [fetchSummary])

  const isLoading = !summary && !summaryError
  const loadError = summary ? '' : summaryError
  const locked = Boolean(summary?.locked)
  const ready = Boolean(summary)

  return (
    <div className="min-h-[100dvh] bg-cirkle-black">
      <div className="px-6 py-6 max-w-[480px] mx-auto">
        <button type="button" onClick={() => navigate('/profile')} aria-label="Back to profile" className="-ml-2 p-2 rounded-full text-white transition-colors hover:bg-white/10">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>

        <h1 className="mt-3 font-display text-section-md text-white uppercase">My Wallet</h1>
        <p className="mt-1 font-body text-[13.5px] text-cirkle-text-muted">One wallet for every Cirkle event. Show your QR at any stall to pay.</p>

        <div className="mt-5 flex flex-col gap-4">
          {/* Row 1 — balance */}
          <BalanceCard summary={summary} isLoading={isLoading} loadError={loadError} />

          {/* Row 2 — top up · show QR */}
          <div className="grid grid-cols-2 gap-4">
            <TileCard icon={PlusCircle} title="Top up" description="Add money for a live event." onClick={() => navigate('/wallet/top-up')} disabled={!ready} />
            <TileCard icon={QrCode} title="Show QR" description="Your wallet QR, big enough to scan." onClick={() => setDialog('qr')} disabled={!ready} />
          </div>

          {/* Row 3 — lock / unlock */}
          <ActionCard
            icon={locked ? Lock : LockOpen}
            tone={locked ? 'red' : 'yellow'}
            title={locked ? 'Unlock wallet' : 'Lock wallet'}
            description={locked ? 'Your QR is locked. Nobody can pay with it until you unlock.' : 'Think your QR was stolen? Lock it. Nobody can pay with it until you unlock.'}
            trailing={
              <span className={`shrink-0 font-body text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${locked ? 'bg-red-400/15 text-red-300' : 'bg-cirkle-yellow/15 text-cirkle-yellow'}`}>
                {locked ? 'Locked' : 'Unlocked'}
              </span>
            }
            onClick={() => setDialog('lock')}
            disabled={!ready}
          />

          {/* Row 4 — generate new QR */}
          <ActionCard
            icon={RefreshCw}
            title="Generate new QR"
            description="Replace your QR. The old one stops working at once; the new one comes to your WhatsApp."
            onClick={() => setDialog('newqr')}
            disabled={!ready}
          />

          {/* Row 5 — payment history */}
          <ActionCard icon={Receipt} title="Payment history" description="Every top-up and every bill, event by event." onClick={() => navigate('/wallet/history')} disabled={!ready} />
        </div>
      </div>

      {dialog === 'qr' && summary && (
        <ShowQrDialog qrUrl={summary.qrUrl} qrDataUrl={qrDataUrl} phoneMasked={summary.phoneMasked} locked={locked} onClose={() => setDialog(null)} />
      )}
      {dialog === 'lock' && summary && (
        <LockWalletDialog
          locked={locked}
          phoneMasked={summary.phoneMasked}
          onClose={() => setDialog(null)}
          onChanged={(nowLocked) => patchSummary({ locked: nowLocked })}
        />
      )}
      {dialog === 'newqr' && summary && (
        <NewQrDialog locked={locked} onClose={() => setDialog(null)} onChanged={(res) => patchSummary({ qrUrl: res.qrUrl, qrGeneration: res.generation })} />
      )}
    </div>
  )
}

export default Wallet
