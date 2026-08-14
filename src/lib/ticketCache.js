// Last-seen copy of a ticket, so the screen opens instantly and still works in
// a venue basement or a queue with no signal.
//
// localStorage rather than sessionStorage because the realistic case is opening
// the app fresh at the door, which a session store would not survive. This puts
// a qrPayload on the device — no worse than the status quo, since the auth token
// already lives in localStorage and grants full access to the same ticket, but
// it is why clearCachedTickets() runs on every login and logout.
const PREFIX = 'cirkle-ticket-'

export function readCachedTicket(id) {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeCachedTicket(id, ticket) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(ticket))
  } catch {
    /* quota or private mode — the screen just loses its offline copy */
  }
}

// Called when the signed-in user changes. Without this, the next account on
// this device could open a previous user's cached ticket.
export function clearCachedTickets() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    /* nothing to clear */
  }
}
