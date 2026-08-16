import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js'

// Deliberately the same library and the same version the backend validates
// with (src/utils/phone.js, libphonenumber-js 1.13.11), so both sides agree on
// what is valid. A client that accepted more would waste an SMS; one that
// accepted less would lock out numbers the server is happy with.
export const DEFAULT_COUNTRY = 'IN'

// Regional-indicator letters — the flag falls out of the ISO code, so there
// are no flag images to ship or keep in sync.
function flagEmoji(iso2) {
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

// Built once: 245 countries, sorted by name, with India first so the default
// is reachable without scrolling.
export const COUNTRIES = getCountries()
  .map((iso2) => ({
    iso2,
    name: regionNames.of(iso2) ?? iso2,
    callingCode: getCountryCallingCode(iso2),
    flag: flagEmoji(iso2),
  }))
  .sort((a, b) => {
    if (a.iso2 === DEFAULT_COUNTRY) return -1
    if (b.iso2 === DEFAULT_COUNTRY) return 1
    return a.name.localeCompare(b.name)
  })

export function countryByIso2(iso2) {
  return COUNTRIES.find((c) => c.iso2 === iso2) ?? COUNTRIES[0]
}

// Several countries share a dial code, and plain alphabetical order buries the
// one people mean — "+44" would list Guernsey, Isle of Man and Jersey above the
// United Kingdom. This is a ranking hint only; every country stays reachable
// and searchable by name.
const PRIMARY_FOR_CODE = {
  1: 'US',
  7: 'RU',
  33: 'FR',
  44: 'GB',
  47: 'NO',
  61: 'AU',
  212: 'MA',
  262: 'RE',
  358: 'FI',
  590: 'GP',
  599: 'CW',
}

// People search both ways — "United" and "+44" should each find the UK.
export function searchCountries(query) {
  const q = query.trim().toLowerCase()
  if (!q) return COUNTRIES
  const digits = q.replace(/^\+/, '')

  const matches = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.iso2.toLowerCase() === q ||
      (digits && c.callingCode.startsWith(digits)),
  )

  // Only re-rank when the query is a dial code; name searches are already in
  // the order people expect.
  if (!/^\d+$/.test(digits)) return matches
  return [...matches].sort((a, b) => {
    const aPrimary = PRIMARY_FOR_CODE[a.callingCode] === a.iso2
    const bPrimary = PRIMARY_FOR_CODE[b.callingCode] === b.iso2
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1
    // Shorter code first: typing "1" should reach +1 before +1242.
    if (a.callingCode.length !== b.callingCode.length) {
      return a.callingCode.length - b.callingCode.length
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Mirrors the backend's normalizePhone(): requires an explicit country code,
 * demands isValid() rather than isPossible(), and returns canonical E.164.
 *
 * isValid() over isPossible() matters — India's "possible" lengths span
 * landlines and short codes, so a dropped or doubled digit sails through
 * isPossible() and the user waits for a code delivered nowhere.
 *
 * @returns {string|null} e.g. '+14155552671', or null if unusable
 */
export function normalizePhone(input) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  // No country code means we cannot know which country this belongs to, and
  // guessing would send someone else's OTP.
  if (!trimmed.startsWith('+')) return null
  let parsed
  try {
    parsed = parsePhoneNumberFromString(trimmed)
  } catch {
    return null
  }
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

/** Builds E.164 from a chosen country and whatever the user typed. */
export function toE164(callingCode, nationalNumber) {
  const digits = String(nationalNumber ?? '').replace(/\D/g, '')
  if (!digits) return null
  return normalizePhone(`+${callingCode}${digits}`)
}

/** Readable grouping for "Code sent to …". Falls back to the raw E.164. */
export function formatPhoneForDisplay(e164) {
  try {
    return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
  } catch {
    return e164
  }
}
