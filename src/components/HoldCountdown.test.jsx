import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { HoldCountdown } from './HoldCountdown.jsx'

// The seat-hold timer: mm:ss to the hold's expiry, one tick a second, the
// expired state once and only once, and a clean unmount.

const NOW = new Date('2026-10-11T10:00:00Z').getTime()
const inSeconds = (s) => new Date(NOW + s * 1000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('HoldCountdown', () => {
  it('renders mm:ss from the expiry timestamp', () => {
    render(<HoldCountdown expiresAt={inSeconds(10 * 60)} />)
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('ticks down once per second', () => {
    render(<HoldCountdown expiresAt={inSeconds(125)} />)
    expect(screen.getByText('2:05')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('2:04')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByText('2:00')).toBeInTheDocument()
  })

  it('at zero shows 0:00 and calls onExpire exactly once', () => {
    const onExpire = vi.fn()
    render(<HoldCountdown expiresAt={inSeconds(3)} onExpire={onExpire} />)
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(onExpire).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(10000))
    expect(onExpire).toHaveBeenCalledTimes(1) // the interval stopped
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })

  it('resuming an existing hold shows the time left, not a fresh ten minutes', () => {
    render(<HoldCountdown expiresAt={inSeconds(4 * 60 + 30)} />)
    expect(screen.getByText('4:30')).toBeInTheDocument()
  })

  it('an already-expired hold shows 0:00 at once', () => {
    render(<HoldCountdown expiresAt={inSeconds(-5)} />)
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })

  it('unmount clears the interval — no ticks, no onExpire after unmount', () => {
    const onExpire = vi.fn()
    const { unmount } = render(<HoldCountdown expiresAt={inSeconds(2)} onExpire={onExpire} />)
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(5000))).not.toThrow()
    expect(onExpire).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a re-rendered parent passing a new onExpire does not restart the timer', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<HoldCountdown expiresAt={inSeconds(2)} onExpire={first} />)
    act(() => vi.advanceTimersByTime(1000))
    rerender(<HoldCountdown expiresAt={inSeconds(2)} onExpire={second} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(second).toHaveBeenCalledTimes(1) // the latest callback fires, once
    expect(first).not.toHaveBeenCalled()
  })
})
