import { api } from './api.js'

// GST rate used only to *estimate* the total before an order exists. The server
// computes the authoritative amount at order creation — this never gets sent.
export const ESTIMATED_GST_PERCENT = 18

export function estimateBreakdown(basePricePaise) {
  const gstPaise = Math.round((basePricePaise * ESTIMATED_GST_PERCENT) / 100)
  return {
    basePricePaise,
    discountPaise: 0,
    subtotalPaise: basePricePaise,
    gstPercentage: ESTIMATED_GST_PERCENT,
    gstPaise,
    totalPaise: basePricePaise + gstPaise,
    estimated: true,
  }
}

// Preview a coupon — returns { valid, couponCode, breakdown }. Throws ApiError.
export function validateCoupon(code, eventId) {
  return api.post('/coupons/validate', { code, eventId })
}

// Claim a hold + create (or resume) a Razorpay order. Returns OrderCreated.
export function createOrder(eventId, couponCode) {
  const body = couponCode ? { eventId, couponCode } : { eventId }
  return api.post('/payments/orders', body)
}

// Fast-path confirmation after Razorpay's handler fires.
export function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  return api.post('/payments/orders/verify', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  })
}

export function getOrderStatus(orderId) {
  return api.get(`/payments/orders/${orderId}`)
}

// Verify-fallback: poll order status until the webhook confirms it, or time out.
export async function pollOrderUntilPaid(orderId, { intervalMs = 2000, timeoutMs = 15000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await getOrderStatus(orderId)
      if (res.status === 'paid') return res
      if (res.status === 'failed') return res
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return null // timed out — caller shows "we're confirming, check My Tickets"
}

// Open the Razorpay checkout modal. Resolves with the handler payload on
// success, or rejects with { dismissed: true } if the user closes the dialog.
export function openRazorpayCheckout({ order, prefill }) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Payment is unavailable right now. Please try again.'))
      return
    }
    const rzp = new window.Razorpay({
      key: order.razorpayKeyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Cirkle',
      prefill,
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject({ dismissed: true }) },
    })
    rzp.open()
  })
}
