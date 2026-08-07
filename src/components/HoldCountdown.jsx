import { useEffect, useRef, useState } from 'react'

function msRemaining(expiresAt) {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

function format(ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Ticking mm:ss until a hold expires. Mount with key={expiresAt} so a new hold
// gets a fresh component rather than needing to reset state from an effect.
export function HoldCountdown({ expiresAt, onExpire, className = '' }) {
  const [ms, setMs] = useState(() => msRemaining(expiresAt))

  // Held in a ref so a re-rendered parent passing a new inline callback doesn't
  // restart the interval and skip a second.
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const tick = setInterval(() => {
      const next = msRemaining(expiresAt)
      setMs(next)
      if (next === 0) {
        clearInterval(tick)
        onExpireRef.current?.()
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [expiresAt])

  return <span className={className}>{format(ms)}</span>
}

export default HoldCountdown
