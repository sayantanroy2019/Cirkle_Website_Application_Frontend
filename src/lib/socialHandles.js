// Client-side mirror of the backend's handle normalization
// (backend: src/utils/socialHandles.js). The server normalizes on write and is
// authoritative — this exists so the field can settle to the bare handle on
// blur and reject an unparseable value inline, instead of after a round trip.
// Keep the rules in step with the backend; a mismatch shows as a field that
// looks fine locally but 400s on save.

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'linkedin']

export const PLATFORM_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
}

export const PLATFORM_PLACEHOLDERS = {
  facebook: 'yourhandle or facebook.com/yourhandle',
  instagram: 'yourhandle or instagram.com/yourhandle',
  linkedin: 'your-slug or linkedin.com/in/your-slug',
}

function stripUrlNoise(raw, hostPattern) {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(hostPattern, '')
    .replace(/[?#].*$/, '') // tracking params: ?igsh=, ?originalSubdomain=
    .replace(/\/+$/, '')
    .replace(/^@+/, '')
}

// Returns the bare handle, null when empty, or throws for an unparseable value.
function normalize(raw, hostPattern, valid) {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string' || raw.trim() === '') return null

  const handle = stripUrlNoise(raw, hostPattern)
  // Empty after stripping — e.g. someone pasted the bare domain.
  if (handle === '') return null
  if (!valid.test(handle)) throw new Error('INVALID_HANDLE')
  return handle
}

export function normalizeInstagram(raw) {
  return normalize(raw, /^instagram\.com\//i, /^[A-Za-z0-9._]{1,30}$/)
}

export function normalizeFacebook(raw) {
  if (typeof raw === 'string') {
    // profile.php?id=N — the identity is in the query string, so pull it out
    // before the generic stripper discards everything after '?'.
    const numeric = raw.match(/facebook\.com\/profile\.php\?id=(\d+)/i)
    if (numeric) return numeric[1]
  }
  return normalize(raw, /^(facebook\.com|fb\.com)\//i, /^[A-Za-z0-9.]{1,50}$/)
}

export function normalizeLinkedin(raw) {
  return normalize(raw, /^linkedin\.com\/(in\/)?/i, /^[A-Za-z0-9-]{1,100}$/)
}

const NORMALIZERS = {
  facebook: normalizeFacebook,
  instagram: normalizeInstagram,
  linkedin: normalizeLinkedin,
}

// Non-throwing wrapper for form use: { value, error }. `value` is the bare
// handle or '' when cleared; `error` is a message to show under the field.
export function normalizeHandle(platform, raw) {
  try {
    return { value: NORMALIZERS[platform](raw) ?? '', error: '' }
  } catch {
    return { value: raw, error: `That doesn't look like a ${PLATFORM_LABELS[platform]} handle.` }
  }
}

export const PROFILE_URL_BUILDERS = {
  facebook: (h) => `https://facebook.com/${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  linkedin: (h) => `https://linkedin.com/in/${h}`,
}

// The just-in-time gate: POST /payments/orders and POST /events/{id}/invitations
// return 403 with this code plus the exact list of handles the user lacks.
// Branch on the code — other 403s on those endpoints mean different things.
export function socialGateMissing(err) {
  if (err?.status !== 403 || err?.code !== 'social_handles_required') return null
  const missing = err?.data?.missing
  return Array.isArray(missing) && missing.length > 0 ? missing : null
}
