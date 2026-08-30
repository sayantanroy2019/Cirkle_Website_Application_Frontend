// Everything an organizer can ask for before someone attends: social handles
// and a Google Form. The server enforces the handles at order/invitation
// creation (403 social_handles_required); the form is honour-based — the app
// only records that the user said they filled it, and the organizer checks
// responses in Google Forms.
//
// Both surfaces that gate an action (the event page and checkout) build
// their dialog from here, so "what is required" can never drift between them.
import { SOCIAL_PLATFORMS } from './socialHandles.js'

const FLAG = {
  facebook: 'requireFacebook',
  instagram: 'requireInstagram',
  linkedin: 'requireLinkedin',
}

// Platforms the event requires, in the same stable order the server uses.
// The flags are only on the detail response, so a cached list object yields [].
export function requiredHandlesFor(event) {
  return SOCIAL_PLATFORMS.filter((p) => Boolean(event?.[FLAG[p]]))
}

// The required handles this profile lacks — mirrors the server's rule (a
// non-empty string counts as present) so the user is never asked for one
// they already have.
export function missingHandles(event, profile) {
  return requiredHandlesFor(event).filter(
    (p) => typeof profile?.[p] !== 'string' || profile[p].trim() === '',
  )
}

// "I've filled out the form" is the user's word, kept for the browser session
// per event so the event page → ticket picker → checkout path asks once.
// sessionStorage can throw (private mode, blocked storage) — treat that as
// "not confirmed", which only ever means asking again.
const key = (eventId) => `cirkle:form-confirmed:${eventId}`

export function isFormConfirmed(eventId) {
  try {
    return sessionStorage.getItem(key(eventId)) === '1'
  } catch {
    return false
  }
}

export function markFormConfirmed(eventId) {
  try {
    sessionStorage.setItem(key(eventId), '1')
  } catch {
    /* asked again next time; nothing else to do */
  }
}

// Whether the organizer's form must be shown before `action`:
//   'invite' — requesting an invitation (invite-only events)
//   'buy'    — buying a ticket (open events)
// On an invite-only event the form gates the REQUEST, not the purchase: an
// accepted invitee already answered it and the organizer reviewed the
// answers before accepting, so buying never asks again.
export function formNeededFor(event, action) {
  if (!event?.googleFormUrl || !event.id) return false
  const inviteOnly = event.eventType === 'invite_only'
  if (action === 'invite' ? !inviteOnly : inviteOnly) return false
  return !isFormConfirmed(event.id)
}
