import { api } from './api.js'

/**
 * My Wallet (F&B spec Part 5) — one function per /wallet endpoint, plus the
 * two formatters every wallet screen shares. No business logic here.
 */

export const getWalletSummary = () => api.get('/wallet/summary')
export const getTopupEvents = () => api.get('/wallet/events')
export const createWalletTopup = (fnbEventId, amountPaise) => api.post('/wallet/topups', { fnbEventId, amountPaise })
export const verifyWalletTopup = (topupId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
  api.post(`/wallet/topups/${topupId}/verify`, { razorpay_order_id, razorpay_payment_id, razorpay_signature })
export const getWalletTopup = (topupId) => api.get(`/wallet/topups/${topupId}`)
export const sendLockCode = () => api.post('/wallet/lock/otp/send')
export const setWalletLock = (action, code) => api.post('/wallet/lock', { action, code })
export const regenerateWalletQr = () => api.post('/wallet/qr/regenerate')
export const getWalletHistory = () => api.get('/wallet/history')
export const getWalletSale = (saleId) => api.get(`/wallet/sales/${saleId}`)

// Verify-fallback: the webhook may land before the browser relay. Poll until
// the top-up is credited, or time out.
export async function pollTopupUntilCredited(topupId, { intervalMs = 2000, timeoutMs = 15000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await getWalletTopup(topupId)
      if (res.topup.status === 'credited') return res.topup
      if (res.topup.status === 'expired') return res.topup
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return null
}

// Balances arrive in paise. Whole rupees stay whole ("₹740"); paise show only
// when present ("₹740.50").
export function formatRupees(paise) {
  const rupees = (paise ?? 0) / 100
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  })}`
}

export function formatValidTill(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}
