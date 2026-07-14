// Prices come from the API in paise (₹1 = 100 paise). 0 renders as "Free".
export function formatPrice(paise) {
  if (!paise) return 'Free'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

// Events are India-based, so render times in IST regardless of the viewer's zone.
const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
})
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
})

const dayFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
})

export function formatEventDate(iso) {
  return dateFmt.format(new Date(iso))
}

export function formatEventDateTime(iso) {
  const d = new Date(iso)
  return `${dateFmt.format(d)} · ${timeFmt.format(d)}`
}

// "Sat, 12 Apr"
export function formatEventDay(iso) {
  return dayFmt.format(new Date(iso))
}

// "8:00 PM"
export function formatEventTime(iso) {
  return timeFmt.format(new Date(iso))
}
