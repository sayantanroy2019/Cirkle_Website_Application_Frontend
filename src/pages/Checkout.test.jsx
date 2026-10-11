import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// The price breakdown the attendee sees before paying must agree with what
// the server will charge (backend tests/platformFee.test.js worked examples):
// rows in order, the estimate before a coupon, the server's figures after,
// and a 100% coupon that still shows the fee + GST — never ₹0.

const EVENT = {
  id: 'ev1',
  name: 'Neon Lights',
  startsAt: '2026-11-20T15:30:00.000Z',
  venueName: 'Warehouse 7',
  platformFeePaise: 2000,
  maxPeoplePerOrder: 10,
  ticketCategories: [],
}
const stag = { id: 'c-stag', categoryName: 'Stag', pricePaise: 59900, admitsCount: 1 }
const couple = { id: 'c-couple', categoryName: 'Couple Pass', pricePaise: 89900, admitsCount: 2 }

const validateCoupon = vi.fn()
vi.mock('../lib/payment.js', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    validateCoupon: (...a) => validateCoupon(...a),
    createOrder: vi.fn(),
    verifyPayment: vi.fn(),
    pollOrderUntilPaid: vi.fn(),
    openRazorpayCheckout: vi.fn(),
  }
})
vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(async () => ({ event: EVENT })), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}))
vi.mock('../store/eventsStore.js', () => ({
  useEventsStore: (selector) => selector({}),
  selectEventById: () => () => EVENT,
}))
vi.mock('../store/profileStore.js', () => ({
  useProfileStore: (selector) =>
    selector({ profile: { firstName: 'Priya', lastName: 'S', email: 'p@example.com', socialHandles: {} }, fetchProfile: () => {} }),
}))
vi.mock('../lib/promo.js', () => ({ getPromoCode: () => null }))
vi.mock('../lib/metaPixel.js', () => ({ trackMetaEvent: () => {} }))
vi.mock('../lib/navigation.js', () => ({ useBackOr: () => () => {} }))
vi.mock('../components/SocialHandlesDialog.jsx', () => ({ default: () => null }))
vi.mock('../components/CompleteProfileDialog.jsx', () => ({ default: () => null }))

import { Checkout } from './Checkout.jsx'

function renderCheckout(cartLines) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/checkout/ev1', state: { cartLines } }]}>
      <Routes>
        <Route path="/checkout/:eventId" element={<Checkout />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The breakdown rows as [label, value] pairs, in document order. */
function rows() {
  const total = screen.getByText('Total')
  const block = total.closest('div').parentElement
  const labels = within(block).getAllByText(/^(Tickets|Discount|Platform fee|GST|Total)/)
  return labels.map((el) => {
    const value = el.parentElement.querySelector('span:last-child')?.textContent ?? ''
    return [el.textContent, value]
  })
}
const paise = (txt) => Math.round(Number(txt.replace(/[^\d.]/g, '')) * 100) * (txt.includes('−') ? -1 : 1)

beforeEach(() => {
  validateCoupon.mockReset()
})

describe('Checkout — the price breakdown', () => {
  it('worked example B before any coupon: ₹899 couple pass, fee ₹20 × 2 admits, GST 18%, in order', () => {
    renderCheckout([{ category: couple, quantity: 1 }])
    expect(rows()).toEqual([
      ['Tickets', '₹899'],
      ['Platform fee (2 people)', '₹40'],
      ['GST (18%)', '₹169.02'],
      ['Total', '₹1,108.02'],
    ])
    expect(screen.getByText('Final amount is confirmed at payment.')).toBeInTheDocument()
    expect(screen.queryByText('Discount')).not.toBeInTheDocument()
  })

  it('the total shown equals the sum of the rows shown (preview equals charge, front-end side)', () => {
    renderCheckout([{ category: stag, quantity: 2 }, { category: couple, quantity: 1 }])
    const r = rows()
    const total = paise(r.find(([l]) => l === 'Total')[1])
    const sum = r.filter(([l]) => l !== 'Total').reduce((s, [, v]) => s + paise(v), 0)
    expect(total).toBe(sum)
    expect(Number.isInteger(total)).toBe(true)
  })

  it("worked example A after a 20% coupon: the server's figures replace the estimate, with a Discount row", async () => {
    validateCoupon.mockResolvedValue({
      valid: true,
      couponCode: 'NEON20',
      discountPercent: 20,
      breakdown: { basePricePaise: 59900, discountPaise: 11980, subtotalPaise: 47920, platformFeePaise: 2000, gstPercentage: 18, gstPaise: 8986, totalPaise: 58906, estimated: false },
    })
    renderCheckout([{ category: stag, quantity: 1 }])
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Enter code'), 'neon20')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('Discount')).toBeInTheDocument()
    expect(validateCoupon).toHaveBeenCalledWith('NEON20', 'ev1', [{ eventTicketCategoryId: 'c-stag', quantity: 1 }])
    expect(rows()).toEqual([
      ['Tickets', '₹599'],
      ['Discount', '− ₹119.80'],
      ['Platform fee (1 person)', '₹20'],
      ['GST (18%)', '₹89.86'],
      ['Total', '₹589.06'],
    ])
    expect(screen.queryByText('Final amount is confirmed at payment.')).not.toBeInTheDocument()
  })

  it('a 100% coupon never renders ₹0: the fee and its GST remain', async () => {
    validateCoupon.mockResolvedValue({
      valid: true,
      couponCode: 'FREE100',
      discountPercent: 100,
      breakdown: { basePricePaise: 59900, discountPaise: 59900, subtotalPaise: 0, platformFeePaise: 2000, gstPercentage: 18, gstPaise: 360, totalPaise: 2360, estimated: false },
    })
    renderCheckout([{ category: stag, quantity: 1 }])
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Enter code'), 'FREE100')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('Discount')).toBeInTheDocument()
    const total = rows().find(([l]) => l === 'Total')[1]
    expect(total).toBe('₹23.60')
    expect(total).not.toBe('₹0')
  })

  it('a rejected coupon keeps the estimate and shows the server’s reason', async () => {
    const { ApiError } = await import('../lib/api.js')
    validateCoupon.mockRejectedValue(new ApiError('This code has expired'))
    renderCheckout([{ category: stag, quantity: 1 }])
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Enter code'), 'OLD')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('This code has expired')).toBeInTheDocument()
    expect(rows().find(([l]) => l === 'Total')[1]).toBe('₹730.42') // 599 + 20 + 18% of 619
    expect(screen.queryByText('Discount')).not.toBeInTheDocument()
  })

  it('without a cart it sends the attendee back to pick tickets instead of rendering a ₹0 breakdown', () => {
    render(
      <MemoryRouter initialEntries={['/checkout/ev1']}>
        <Routes>
          <Route path="/checkout/:eventId" element={<Checkout />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Choose your tickets first')).toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })
})
