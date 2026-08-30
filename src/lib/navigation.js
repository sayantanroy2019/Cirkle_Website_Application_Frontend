import { useNavigate } from 'react-router-dom'

/**
 * Back with a fallback: go to the previous in-app page if there is one,
 * otherwise to the screen's semantic parent.
 *
 * Why plain navigate(-1) isn't enough: the login flow is a chain of
 * `replace` navigations (login is a checkpoint, not a place — see
 * OtpVerification/PhoneEntry), so a deep-linked page — a shared event, a
 * WhatsApp ticket link — ends up as the FIRST and only entry in the tab.
 * navigate(-1) there is the browser's back on a fresh tab: it leaves the app.
 *
 * React Router records each entry's position in window.history.state.idx;
 * `push` increments it and `replace` keeps it. But "index 0" isn't enough on
 * its own: a NEW user's onboarding steps push entries (name → dob → … →
 * email), so when the walkthrough lands them on their deep link the index is
 * already several deep — and "back" would step into a finished onboarding
 * step. So the app also records a FLOOR: the index of the entry the user was
 * landed on after signing in / finishing onboarding (see markHistoryFloor).
 * Anything at or below the floor counts as "nothing of ours behind this".
 *
 * The fallback uses `replace` so the parent takes this entry's slot rather
 * than stacking on top of it.
 *
 * Pages that always have one correct parent regardless of how they were
 * reached (TicketDetail → /tickets) don't need this; they navigate to the
 * parent unconditionally.
 */
const FLOOR_KEY = 'cirkle:history-floor'

const currentIndex = () => window.history.state?.idx ?? 0

/**
 * Call right before the `replace` navigation that lands a user after login
 * or onboarding. The landing entry inherits the current index (replace keeps
 * it), so that index is the floor. sessionStorage, because the history stack
 * itself is per tab and survives the reloads a login flow tends to involve.
 */
export function markHistoryFloor() {
  try {
    sessionStorage.setItem(FLOOR_KEY, String(currentIndex()))
  } catch {
    /* falls back to floor 0 — only ever means one more "back" than ideal */
  }
}

function historyFloor() {
  try {
    const n = Number(sessionStorage.getItem(FLOOR_KEY))
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function useBackOr(fallback) {
  const navigate = useNavigate()
  return () => {
    if (currentIndex() > historyFloor()) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
