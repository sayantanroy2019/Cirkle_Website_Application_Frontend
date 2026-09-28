// The cart: which tiers, how many of each. Mirrors the server's rules
// (src/utils/cart.js on the backend) so the picker never lets someone build
// a cart the order endpoint would refuse.
//
// A "line" is { category, quantity } — the whole category object travels so
// checkout can show names and prices without refetching. "items" is the wire
// shape the API takes: [{ eventTicketCategoryId, quantity }].

// Fallback only — the event detail carries the real number (maxPeoplePerOrder).
export const DEFAULT_MAX_PEOPLE = 10

export function linesFromQuantities(categories, quantities) {
  return categories
    .filter((c) => (quantities[c.id] ?? 0) > 0)
    .map((c) => ({ category: c, quantity: quantities[c.id] }))
}

export function itemsFromLines(lines) {
  return lines.map((l) => ({ eventTicketCategoryId: l.category.id, quantity: l.quantity }))
}

export function summarizeLines(lines) {
  return lines.reduce(
    (acc, l) => ({
      tickets: acc.tickets + l.quantity,
      people: acc.people + l.category.admitsCount * l.quantity,
      basePaise: acc.basePaise + l.category.pricePaise * l.quantity,
    }),
    { tickets: 0, people: 0, basePaise: 0 },
  )
}

// The most of `category` this cart can hold RIGHT NOW: the server's per-tier
// ceiling (stock and the cap on its own), further limited by the people the
// rest of the cart already admits.
export function stepperCeiling(category, quantities, categories, maxPeople = DEFAULT_MAX_PEOPLE) {
  const lines = linesFromQuantities(categories, quantities)
  const { people } = summarizeLines(lines)
  const mine = (quantities[category.id] ?? 0) * category.admitsCount
  const roomForPeople = maxPeople - (people - mine)
  const byCap = Math.max(0, Math.floor(roomForPeople / category.admitsCount))
  return Math.min(category.maxQuantity ?? byCap, byCap)
}

// Two carts are the same cart if they hold the same tiers in the same
// quantities, whatever order they are listed in.
export function sameCart(items, orderItems) {
  if (!Array.isArray(orderItems) || items.length !== orderItems.length) return false
  const key = (i) => `${i.eventTicketCategoryId}:${i.quantity}`
  const a = new Set(items.map(key))
  return orderItems.every((i) => a.has(key(i)))
}

// "1× Couple Pass · 2× Stag" — for anything that names a cart in one line.
// Accepts server items (categoryName) or local lines (category.categoryName).
export function describeItems(items) {
  return items
    .map((i) => `${i.quantity}× ${i.categoryName ?? i.category?.categoryName ?? 'ticket'}`)
    .join(' · ')
}

export function peopleLabel(n) {
  return `${n} ${n === 1 ? 'person' : 'people'}`
}
