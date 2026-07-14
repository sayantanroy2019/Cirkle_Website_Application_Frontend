import { api } from './api.js'

// Static reference data — fetch once per session and reuse.
let eventCategoriesCache = null
let lifestyleTagsCache = null

export async function getEventCategories() {
  if (eventCategoriesCache) return eventCategoriesCache
  const data = await api.get('/reference/event-categories', { auth: false })
  eventCategoriesCache = data.eventCategories
  return eventCategoriesCache
}

export async function getLifestyleTags() {
  if (lifestyleTagsCache) return lifestyleTagsCache
  const data = await api.get('/reference/lifestyle-tags', { auth: false })
  lifestyleTagsCache = data.lifestyleTags
  return lifestyleTagsCache
}
