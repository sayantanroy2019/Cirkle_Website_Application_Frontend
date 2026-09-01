// Session memory for the promo popup: shown once per event per browser
// session (marketing, not a wall), and the advertised coupon code is
// remembered so checkout's coupon field arrives pre-filled — the user never
// retypes what the popup just told them.
//
// sessionStorage with try/catch throughout: a private window degrades to
// "popup may show again / no prefill", never an error.
const seenKey = (eventId) => `cirkle:promo-seen:${eventId}`
const codeKey = (eventId) => `cirkle:promo-code:${eventId}`

export function isPromoSeen(eventId) {
  try {
    return sessionStorage.getItem(seenKey(eventId)) === '1'
  } catch {
    return false
  }
}

export function markPromoSeen(eventId) {
  try {
    sessionStorage.setItem(seenKey(eventId), '1')
  } catch {
    /* shown again next session — harmless */
  }
}

export function rememberPromoCode(eventId, code) {
  try {
    sessionStorage.setItem(codeKey(eventId), code)
  } catch {
    /* no prefill — the popup still showed the code */
  }
}

export function getPromoCode(eventId) {
  try {
    return sessionStorage.getItem(codeKey(eventId))
  } catch {
    return null
  }
}
