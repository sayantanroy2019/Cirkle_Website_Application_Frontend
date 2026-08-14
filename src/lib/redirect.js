// Where to land after signing in, when the user arrived by deep link.
//
// sessionStorage, deliberately: OTP is a two-request flow with the code arriving
// in another app. People switch away, the tab gets evicted, they come back and
// finish. Component state and router state do not survive that — this is the
// single most likely way a deep link quietly loses its destination.
const KEY = 'cirkle-post-login-redirect'

// Only ever a same-origin path.
//
// A single leading slash, and specifically NOT "//" or "/\" — both are read as
// protocol-relative URLs by browsers, so "//evil.example" navigates off-site.
// A login flow that redirects to an attacker-chosen URL is the classic
// open-redirect, and this is exactly where it gets used against someone.
export function isSafeInternalPath(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value)
}

/**
 * First write wins.
 *
 * Now that every authenticated route is guarded, a logged-out user who taps a
 * ticket link and then wanders to /feed before signing in would hit a second
 * guard — and a plain setItem would overwrite the ticket with /feed, losing the
 * destination they were actually sent. The first place they tried to reach is
 * the one they meant.
 *
 * Safe against staleness because consumeRedirect() clears on every landing, so
 * a value can only outlive one sign-in if no sign-in happened.
 */
export function rememberRedirect(path) {
  if (!isSafeInternalPath(path)) return
  try {
    if (isSafeInternalPath(sessionStorage.getItem(KEY))) return
    sessionStorage.setItem(KEY, path)
  } catch {
    /* private mode / storage disabled — the deep link degrades to landing on Home */
  }
}

/**
 * Reads and clears in one step. Consuming exactly once matters: a value left
 * behind means the next ordinary sign-in, days later, teleports the user to a
 * stale ticket instead of Home.
 *
 * Re-validates on the way out — sessionStorage is user-writable, so a value
 * that was safe when stored is not necessarily what comes back.
 */
export function consumeRedirect() {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return isSafeInternalPath(value) ? value : null
  } catch {
    return null
  }
}

export function clearRedirect() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
