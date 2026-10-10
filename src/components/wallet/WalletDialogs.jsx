import { useEffect, useState } from 'react'
import { X, Lock, LockOpen, RefreshCw, CheckCircle2, MessageCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { ApiError } from '../../lib/api.js'
import { sendLockCode, setWalletLock, regenerateWalletQr } from '../../lib/wallet.js'

/**
 * The three wallet dialogs (F&B spec Part 5, cards 3–5): Show QR, Lock /
 * unlock, Generate new QR. Same sheet shape as the app's other dialogs —
 * bottom sheet on phones, centred card on wider screens.
 */

function Sheet({ title, onClose, children, titleId }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full sm:max-w-[420px] max-h-[92dvh] overflow-y-auto bg-cirkle-card border border-cirkle-border-card rounded-t-[20px] sm:rounded-[20px] p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-body text-[20px] font-bold text-white leading-snug">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 w-9 h-9 flex items-center justify-center rounded-full text-cirkle-text-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function errorText(err, fallback) {
  if (err instanceof ApiError && err.data?.message) return err.data.message
  if (err instanceof ApiError && err.message) return err.message
  return fallback
}

/**
 * Renders the wallet QR from its URL. White card: dark modules on white scan
 * best. `prerendered` is the data URL the wallet store drew at launch, so the
 * dialog opens with the QR already there.
 */
export function WalletQrImage({ qrUrl, size = 260, locked = false, prerendered = '' }) {
  const [rendered, setRendered] = useState('')
  useEffect(() => {
    let active = true
    if (!qrUrl || prerendered) return undefined
    QRCode.toDataURL(qrUrl, { width: size, margin: 1, color: { dark: '#060606', light: '#FFFFFF' } })
      .then((u) => {
        if (active) setRendered(u)
      })
      .catch(() => {
        if (active) setRendered('')
      })
    return () => {
      active = false
    }
  }, [qrUrl, size, prerendered])
  const dataUrl = prerendered || rendered
  return (
    <div className="relative rounded-card bg-white p-4 flex items-center justify-center" style={{ width: size + 32, height: size + 32 }}>
      {dataUrl ? (
        <img src={dataUrl} alt="Wallet QR code" width={size} height={size} className={locked ? 'opacity-30' : ''} />
      ) : (
        <div className="animate-pulse rounded bg-gray-200" style={{ width: size, height: size }} />
      )}
      {locked && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 font-body text-[13px] font-bold uppercase tracking-wider text-white shadow-lg">
            <Lock size={14} strokeWidth={2.5} /> Locked
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Card 3: Show QR ───────────────────────────────────────────────────── */

export function ShowQrDialog({ qrUrl, qrDataUrl = '', phoneMasked, locked, onClose }) {
  return (
    <Sheet title="Your wallet QR" onClose={onClose} titleId="show-qr-title">
      <p className="mt-1.5 font-body text-[13.5px] text-cirkle-text-muted leading-relaxed">
        {locked
          ? 'Your wallet is locked. Unlock it before you pay.'
          : 'Show this at any stall to pay. It is the same QR as on your WhatsApp.'}
      </p>
      <div className="mt-5 flex justify-center">
        <WalletQrImage qrUrl={qrUrl} size={260} locked={locked} prerendered={qrDataUrl} />
      </div>
      {phoneMasked && (
        <p className="mt-4 text-center font-body text-[13px] text-cirkle-text-muted">Wallet of {phoneMasked}</p>
      )}
      <button type="button" onClick={onClose} className="btn-secondary w-full py-3 mt-5">
        Done
      </button>
    </Sheet>
  )
}

/* ── Card 4: Lock / unlock ─────────────────────────────────────────────── */

const RESEND_SECONDS = 30

export function LockWalletDialog({ locked, phoneMasked, onClose, onChanged }) {
  const action = locked ? 'unlock' : 'lock'
  const [step, setStep] = useState('intro') // intro | code | done
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (!resendAt) return undefined
    const tick = () => setWait(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [resendAt])

  const sendCode = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await sendLockCode()
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
      setStep('code')
    } catch (err) {
      const retry = err instanceof ApiError ? err.data?.retryAfterSeconds : null
      if (retry) {
        setResendAt(Date.now() + retry * 1000)
        setStep('code')
      } else setError(errorText(err, "Couldn't send the code on WhatsApp. Try again."))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (e) => {
    e.preventDefault()
    if (busy || code.length !== 6) return
    setBusy(true)
    setError('')
    try {
      const res = await setWalletLock(action, code)
      setStep('done')
      onChanged?.(res.locked)
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'invalid_code' ? 'That code is wrong or has expired.' : errorText(err, 'Something went wrong. Try again.'))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const Icon = locked ? LockOpen : Lock

  return (
    <Sheet title={locked ? 'Unlock wallet' : 'Lock wallet'} onClose={onClose} titleId="lock-wallet-title">
      {step === 'intro' && (
        <>
          <div className="mt-4 flex items-start gap-3">
            <span className="shrink-0 w-11 h-11 rounded-[12px] bg-cirkle-yellow/12 text-cirkle-yellow flex items-center justify-center">
              <Icon size={22} strokeWidth={2} />
            </span>
            <p className="font-body text-[14px] text-cirkle-text-light leading-relaxed">
              {locked ? (
                <>
                  Your wallet is locked: nobody can pay with your QR or your phone number. Unlocking makes it usable at stalls
                  again. Top-ups work either way.
                </>
              ) : (
                <>
                  Think your QR was stolen, or just want to be safe? Lock your wallet and nobody can spend from it, by QR or by
                  phone number. You can still top up, and you can unlock any time.
                </>
              )}
            </p>
          </div>
          <p className="mt-4 font-body text-[13px] text-cirkle-text-muted">
            To confirm it is you, we’ll send a code to your WhatsApp{phoneMasked ? ` (${phoneMasked})` : ''}.
          </p>
          {error && <p className="mt-3 font-body text-[13px] text-red-400">{error}</p>}
          <button type="button" onClick={sendCode} disabled={busy} className="btn-primary w-full py-3.5 mt-5 disabled:opacity-60">
            {busy ? 'Sending…' : `Send code to ${action}`}
          </button>
        </>
      )}

      {step === 'code' && (
        <form onSubmit={confirm} className="mt-4" noValidate>
          <p className="font-body text-[14px] text-cirkle-text-light">Enter the 6-digit code from WhatsApp.</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="6-digit code"
            className="mt-3 w-full rounded-[12px] bg-cirkle-input border border-cirkle-border px-4 py-3.5 text-center font-body text-[24px] tracking-[0.5em] text-white placeholder:text-cirkle-text-placeholder focus:border-cirkle-yellow focus:outline-none"
            placeholder="••••••"
          />
          {error && <p className="mt-3 font-body text-[13px] text-red-400">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full py-3.5 mt-4 disabled:opacity-60">
            {busy ? 'Checking…' : locked ? 'Unlock wallet' : 'Lock wallet'}
          </button>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy || wait > 0}
            className="mt-3 w-full text-center font-body text-[13px] font-semibold text-cirkle-yellow disabled:text-cirkle-text-muted"
          >
            {wait > 0 ? `Resend code (${wait}s)` : 'Resend code'}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="mt-5 flex flex-col items-center text-center">
          <CheckCircle2 size={40} className="text-cirkle-yellow" strokeWidth={2} />
          <p className="mt-3 font-body text-[16px] font-bold text-white">{locked ? 'Wallet unlocked' : 'Wallet locked'}</p>
          <p className="mt-1 font-body text-[13.5px] text-cirkle-text-muted leading-relaxed">
            {locked ? 'Your QR and your number can be used at stalls again.' : 'Nobody can spend from your wallet until you unlock it.'}{' '}
            We’ve sent you a WhatsApp message too.
          </p>
          <button type="button" onClick={onClose} className="btn-primary w-full py-3.5 mt-5">
            Done
          </button>
        </div>
      )}
    </Sheet>
  )
}

/* ── Card 5: Generate new QR ───────────────────────────────────────────── */

export function NewQrDialog({ locked, onClose, onChanged }) {
  const [step, setStep] = useState('confirm') // confirm | working | done
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const go = async () => {
    setStep('working')
    setError('')
    try {
      const res = await regenerateWalletQr()
      setResult(res)
      setStep('done')
      onChanged?.(res)
    } catch (err) {
      setError(errorText(err, "Couldn't generate a new QR. Try again."))
      setStep('confirm')
    }
  }

  return (
    <Sheet title="Generate new QR" onClose={onClose} titleId="new-qr-title">
      {step !== 'done' && (
        <>
          <div className="mt-4 flex items-start gap-3">
            <span className="shrink-0 w-11 h-11 rounded-[12px] bg-cirkle-yellow/12 text-cirkle-yellow flex items-center justify-center">
              <RefreshCw size={22} strokeWidth={2} />
            </span>
            <p className="font-body text-[14px] text-cirkle-text-light leading-relaxed">
              Your current QR stops working <span className="font-bold text-white">immediately</span>, everywhere — in this app, on
              WhatsApp, and any screenshot of it. The new one appears here and is sent to your WhatsApp. Your balance is not affected.
            </p>
          </div>
          <p className="mt-4 font-body text-[13px] text-cirkle-text-muted">You can do this up to 3 times a day.</p>
          {error && <p className="mt-3 font-body text-[13px] text-red-400">{error}</p>}
          <button type="button" onClick={go} disabled={step === 'working'} className="btn-primary w-full py-3.5 mt-5 disabled:opacity-60">
            {step === 'working' ? 'Generating…' : 'Generate new QR'}
          </button>
          <button type="button" onClick={onClose} disabled={step === 'working'} className="btn-secondary w-full py-3 mt-3">
            Keep my current QR
          </button>
        </>
      )}

      {step === 'done' && result && (
        <div className="mt-4 flex flex-col items-center text-center">
          <WalletQrImage qrUrl={result.qrUrl} size={220} locked={locked} />
          <p className="mt-4 font-body text-[16px] font-bold text-white">This is your new QR</p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-body text-[13.5px] text-cirkle-text-muted">
            <MessageCircle size={15} className="text-cirkle-yellow" strokeWidth={2} />
            {result.sent ? 'Sent to your WhatsApp as well.' : 'Couldn’t send it on WhatsApp — use the one here.'}
          </p>
          <button type="button" onClick={onClose} className="btn-primary w-full py-3.5 mt-5">
            Done
          </button>
        </div>
      )}
    </Sheet>
  )
}
