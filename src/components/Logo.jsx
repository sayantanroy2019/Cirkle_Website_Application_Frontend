// The Cirkle wordmark — pure text, Inter 800, 22px, white, -0.025em tracking.
export function Logo({ className = '' }) {
  return (
    <span className={`font-body text-[22px] font-extrabold text-white tracking-tight select-none ${className}`}>
      Cirkle
    </span>
  )
}

export default Logo
