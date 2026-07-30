// The Cirkle wordmark — pure text, Inter 800, white, -0.025em tracking.
// `size` is a Tailwind text-size class (default 22px); pass a larger one to
// scale the wordmark up (e.g. the Landing hero).
export function Logo({ className = '', size = 'text-[22px]' }) {
  return (
    <span className={`font-body ${size} font-extrabold text-white tracking-tight select-none ${className}`}>
      Cirkle
    </span>
  )
}

export default Logo
