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
 * `push` increments it and `replace` keeps it, so idx === 0 means "nothing
 * of ours is behind this page". The fallback uses `replace` so the parent
 * takes this entry's slot rather than stacking on top of it.
 *
 * Pages that always have one correct parent regardless of how they were
 * reached (TicketDetail → /tickets) don't need this; they navigate to the
 * parent unconditionally.
 */
export function useBackOr(fallback) {
  const navigate = useNavigate()
  return () => {
    const idx = window.history.state?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
