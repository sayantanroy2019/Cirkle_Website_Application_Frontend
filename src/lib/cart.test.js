import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MAX_PEOPLE,
  linesFromQuantities,
  itemsFromLines,
  summarizeLines,
  stepperCeiling,
  sameCart,
  describeItems,
  peopleLabel,
} from './cart.js'

// The cart mirrors the server's rules (backend src/utils/cart.js): a quantity
// per tier, lines carrying the whole category, totals in paise integers.

const stag = { id: 'c-stag', categoryName: 'Stag', pricePaise: 59900, admitsCount: 1, maxQuantity: 4 }
const couple = { id: 'c-couple', categoryName: 'Couple Pass', pricePaise: 89900, admitsCount: 2, maxQuantity: 3 }
const table = { id: 'c-table', categoryName: 'Table of 6', pricePaise: 299900, admitsCount: 6, maxQuantity: null }
const categories = [stag, couple, table]

describe('linesFromQuantities / itemsFromLines', () => {
  it('turns a quantity map into lines, skipping zero and missing tiers, in category order', () => {
    const lines = linesFromQuantities(categories, { [couple.id]: 1, [stag.id]: 2, [table.id]: 0 })
    expect(lines.map((l) => [l.category.id, l.quantity])).toEqual([
      ['c-stag', 2],
      ['c-couple', 1],
    ])
  })

  it('an empty map is an empty cart', () => {
    expect(linesFromQuantities(categories, {})).toEqual([])
  })

  it('items are the wire shape the order endpoint takes', () => {
    const lines = linesFromQuantities(categories, { [stag.id]: 2, [couple.id]: 1 })
    expect(itemsFromLines(lines)).toEqual([
      { eventTicketCategoryId: 'c-stag', quantity: 2 },
      { eventTicketCategoryId: 'c-couple', quantity: 1 },
    ])
  })
})

describe('summarizeLines', () => {
  it('sums tickets, people admitted and the base price (price × quantity, in paise)', () => {
    const lines = linesFromQuantities(categories, { [stag.id]: 2, [couple.id]: 1 })
    expect(summarizeLines(lines)).toEqual({ tickets: 3, people: 4, basePaise: 2 * 59900 + 89900 })
  })

  it('an empty cart totals zero everywhere', () => {
    expect(summarizeLines([])).toEqual({ tickets: 0, people: 0, basePaise: 0 })
  })

  it('money stays an integer number of paise — never a float', () => {
    const lines = linesFromQuantities(categories, { [stag.id]: 3, [couple.id]: 3, [table.id]: 1 })
    const { basePaise } = summarizeLines(lines)
    expect(Number.isInteger(basePaise)).toBe(true)
    expect(basePaise).toBe(3 * 59900 + 3 * 89900 + 299900)
  })
})

describe('stepperCeiling — how many more of a tier this cart can take', () => {
  it("an empty cart: the tier's own cap, or the people cap if that is lower", () => {
    expect(stepperCeiling(stag, {}, categories)).toBe(4) // cap 4 < 10 people
    expect(stepperCeiling(couple, {}, categories)).toBe(3) // cap 3 < 5 couples
    expect(stepperCeiling(table, {}, categories)).toBe(1) // no cap: floor(10 / 6)
  })

  it('people already in the cart shrink the room for other tiers', () => {
    // 2 stag + 1 couple = 4 people; 6 left → one table of 6 still fits, no second couple×3
    const q = { [stag.id]: 2, [couple.id]: 1 }
    expect(stepperCeiling(table, q, categories)).toBe(1)
    expect(stepperCeiling(couple, q, categories)).toBe(3) // own line excluded: 8 room / 2 = 4, capped at 3
    expect(stepperCeiling(stag, q, categories)).toBe(4) // own line excluded: 8 room, cap 4
  })

  it("a tier's own quantity never counts against itself", () => {
    expect(stepperCeiling(stag, { [stag.id]: 4 }, categories)).toBe(4)
  })

  it('never goes below zero when the cart is already over the people limit', () => {
    expect(stepperCeiling(couple, { [table.id]: 2 }, categories)).toBe(0)
  })

  it('honours a per-event people limit instead of the default', () => {
    expect(DEFAULT_MAX_PEOPLE).toBe(10)
    expect(stepperCeiling(table, {}, categories, 20)).toBe(3)
    expect(stepperCeiling(couple, {}, categories, 4)).toBe(2)
  })
})

describe('sameCart', () => {
  const items = [
    { eventTicketCategoryId: 'c-stag', quantity: 2 },
    { eventTicketCategoryId: 'c-couple', quantity: 1 },
  ]
  it('same tiers and quantities in any order are the same cart', () => {
    expect(sameCart(items, [items[1], items[0]])).toBe(true)
  })
  it('a different quantity, an extra tier or a missing list is not', () => {
    expect(sameCart(items, [{ eventTicketCategoryId: 'c-stag', quantity: 3 }, items[1]])).toBe(false)
    expect(sameCart(items, [...items, { eventTicketCategoryId: 'c-table', quantity: 1 }])).toBe(false)
    expect(sameCart(items, null)).toBe(false)
  })
})

describe('labels', () => {
  it('describes server items and local lines the same way', () => {
    expect(describeItems([{ quantity: 1, categoryName: 'Couple Pass' }, { quantity: 2, categoryName: 'Stag' }])).toBe('1× Couple Pass · 2× Stag')
    expect(describeItems(linesFromQuantities(categories, { [stag.id]: 2 }))).toBe('2× Stag')
    expect(describeItems([{ quantity: 1 }])).toBe('1× ticket')
  })
  it('pluralises people', () => {
    expect(peopleLabel(1)).toBe('1 person')
    expect(peopleLabel(4)).toBe('4 people')
  })
})
