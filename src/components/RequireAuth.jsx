import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import { rememberRedirect } from '../lib/redirect.js'

/**
 * Gate for routes that need a session.
 *
 * The capture happens here, before the redirect — once we've navigated to
 * /phone the original URL is gone and there is nothing left to come back to.
 *
 * Guarding also means the wrapped screen never mounts without a token, so it
 * cannot fire a request that is guaranteed to 401.
 */
export function RequireAuth({ children, capture = true }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    // `capture={false}` for the onboarding screens. They need a session, but
    // where to resume onboarding is decided by the verify response, not by a
    // remembered URL — storing one risks sending an already-onboarded user
    // back into a step they finished.
    if (capture) {
      // First-write-wins inside rememberRedirect, so React's double-render in
      // development and a bounce through a second guard are both harmless.
      rememberRedirect(`${location.pathname}${location.search}`)
    }
    return <Navigate to="/phone" replace />
  }

  return children
}

export default RequireAuth
