import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('./api.js', () => ({ api: { get: (...a) => get(...a), post: vi.fn() } }))

import { formatRupees, pollTopupUntilCredited } from './wallet.js'

// The wallet's money formatter and the verify-fallback poll (F&B Part 5).

describe('formatRupees', () => {
  it('whole rupees stay whole', () => {
    expect(formatRupees(74000)).toBe('₹740')
    expect(formatRupees(0)).toBe('₹0')
  })
  it('paise show two digits — never ₹23.6', () => {
    expect(formatRupees(2360)).toBe('₹23.60')
    expect(formatRupees(11980)).toBe('₹119.80')
  })
  it('uses Indian grouping', () => {
    expect(formatRupees(12345600)).toBe('₹1,23,456')
  })
  it('a missing amount is ₹0, not NaN', () => {
    expect(formatRupees(undefined)).toBe('₹0')
    expect(formatRupees(null)).toBe('₹0')
  })
})

describe('pollTopupUntilCredited', () => {
  beforeEach(() => get.mockReset())

  it('returns the top-up as soon as the server says credited', async () => {
    get.mockResolvedValueOnce({ topup: { id: 't1', status: 'pending' } }).mockResolvedValueOnce({ topup: { id: 't1', status: 'credited' } })
    const t = await pollTopupUntilCredited('t1', { intervalMs: 1, timeoutMs: 500 })
    expect(t).toMatchObject({ id: 't1', status: 'credited' })
    expect(get).toHaveBeenCalledWith('/wallet/topups/t1')
    expect(get).toHaveBeenCalledTimes(2)
  })
  it('stops on an expired top-up, and gives up with null at the deadline', async () => {
    get.mockResolvedValue({ topup: { id: 't2', status: 'expired' } })
    expect(await pollTopupUntilCredited('t2', { intervalMs: 1, timeoutMs: 500 })).toMatchObject({ status: 'expired' })
    get.mockResolvedValue({ topup: { id: 't3', status: 'pending' } })
    expect(await pollTopupUntilCredited('t3', { intervalMs: 5, timeoutMs: 30 })).toBeNull()
  })
  it('keeps polling through a failed request', async () => {
    get.mockRejectedValueOnce(new Error('blip')).mockResolvedValueOnce({ topup: { id: 't4', status: 'credited' } })
    expect(await pollTopupUntilCredited('t4', { intervalMs: 1, timeoutMs: 500 })).toMatchObject({ status: 'credited' })
  })
})
