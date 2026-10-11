import { describe, it, expect } from 'vitest'
import { estimateBreakdown, ESTIMATED_GST_PERCENT } from './payment.js'

// The client's pre-order estimate must agree with the server's breakdown
// (backend tests/platformFee.test.js worked examples) for the cases the
// client can compute: no coupon. Coupon previews always come from the server.

describe('estimateBreakdown — mirrors the backend worked examples', () => {
  it('worked example B: ₹899 couple pass, ₹20 fee × 2 admits → GST 18% on subtotal + fee', () => {
    expect(estimateBreakdown(89900, 4000)).toEqual({
      basePricePaise: 89900,
      discountPaise: 0,
      subtotalPaise: 89900,
      platformFeePaise: 4000,
      gstPercentage: 18,
      gstPaise: 16902,
      totalPaise: 110802,
      estimated: true,
    })
  })

  it('fee 0: ₹599 → GST ₹107.82, total ₹706.82 (the pre-fee behaviour)', () => {
    expect(estimateBreakdown(59900, 0)).toMatchObject({ platformFeePaise: 0, gstPaise: 10782, totalPaise: 70682 })
  })

  it('worked example A, before the coupon: ₹599 + ₹20 fee × 1 admit', () => {
    // 20% off is a server preview; without it the estimate is base + fee + GST.
    const b = estimateBreakdown(59900, 2000)
    expect(b.gstPaise).toBe(Math.round((59900 + 2000) * 0.18))
    expect(b.totalPaise).toBe(59900 + 2000 + b.gstPaise)
  })

  it('the total is the sum of the rows it will render (preview equals charge)', () => {
    for (const [base, fee] of [[59900, 2000], [89900, 4000], [123456, 0], [1, 2000]]) {
      const b = estimateBreakdown(base, fee)
      expect(b.totalPaise).toBe(b.subtotalPaise - b.discountPaise + b.platformFeePaise + b.gstPaise)
    }
  })

  it('every amount is an integer number of paise', () => {
    const b = estimateBreakdown(33333, 1111)
    for (const k of ['subtotalPaise', 'platformFeePaise', 'gstPaise', 'totalPaise']) expect(Number.isInteger(b[k])).toBe(true)
  })

  it('a negative or missing fee is treated as zero', () => {
    expect(estimateBreakdown(59900, -500).platformFeePaise).toBe(0)
    expect(estimateBreakdown(59900).platformFeePaise).toBe(0)
  })

  it('the GST rate is the one the server uses', () => {
    expect(ESTIMATED_GST_PERCENT).toBe(18)
  })
})
