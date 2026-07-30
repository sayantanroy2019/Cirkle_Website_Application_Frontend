# Cirkle — The Vibes Feed

**Scope:** The social-proof discovery feed. Shows who is going to which events, so users can find people and events to attend together.
**Type:** Read-only feature. No new tables — it's a query across existing data.
**Phase 1 role:** "Join me" is pure navigation to an event. No group actually forms yet — that's Phase 2.

---

## 1. The Core Idea

The Vibes feed answers one question for a browsing user: **"Who is going out, and where?"**

Every time someone buys a ticket, they appear in the feed as a **card** — their profile plus the event they're attending. Other users scroll these cards, and if they like the look of someone's plan, they tap **"Join me"** and are routed to that event to buy their own ticket. Once they buy, they become a card too.

This is the mechanism that turns ticket purchases into social proof, and social proof back into ticket purchases — the flywheel described in the pitch deck.

---

## 2. What a Card Is

**A card = one upcoming ticket.** Not one person — one person *going to one event*.

If Priya buys tickets to three different events, she appears as **three separate cards**, one per event ("Priya is going to X", "Priya is going to Y", "Priya is going to Z"). The card is keyed on the ticket, not the person.

### What each card shows

- **The person's profile:** first name, age (derived from DOB), photos, tagline, lifestyle tags.
- **The event they're attending:** name, date, venue, category, event type.
- **How many people are going** to that event in total (social proof — "12 going").
- **A "Join me" button** that routes to that event's detail page.

---

## 3. Who Appears in the Feed

A card is included only if **all** of these are true:

1. The person holds a **paid ticket** (a row in `tickets`).
2. The event is **upcoming** — its start time is in the future. Past events never appear; you can't join a concert that already happened.
3. The ticket is **not the viewer's own.** You never see yourself in your own discovery feed.

Everyone who holds an upcoming ticket is automatically included. There is no opt-out in Phase 1.

> **Privacy note (flagged for revisit):** this means every ticket-buyer is publicly listed — photo, age, interests, and exactly which event on which date they're attending — visible to any stranger browsing the feed. This is acceptable for Phase 1's controlled launch but must be revisited before scale: consent, opt-out, and the safety implications of broadcasting a specific person's location on a specific date.

---

## 4. Ordering — the Five Tiers

The feed is sorted into five tiers based on the **viewer's gender** and the **card's gender and city**. The intent is to surface the most relevant people first.

### If the viewer is male:
```
Tier 1: Females in my city
Tier 2: Females in other cities
Tier 3: Males in my city
Tier 4: Males in other cities
Tier 5: Everyone else (non_binary, prefer_not_to_say)
```

### If the viewer is female:
```
Tier 1: Males in my city
Tier 2: Females in my city
Tier 3: Males in other cities
Tier 4: Females in other cities
Tier 5: Everyone else (non_binary, prefer_not_to_say)
```

### If the viewer is non_binary or prefer_not_to_say:
No gender preference is applied — all cards fall into the general ordering (effectively one tier), sorted by the tiebreak below.

### Within every tier
Cards are ordered by:
1. **Soonest event first** (event start time ascending) — the most imminent plans surface first.
2. **Newest ticket first** as the tiebreak — when two people are going to the same event, the more recent buyer appears first.

> **Note on the current model:** this is gender-preference ordering, which reads as a dating-style signal. It's the deliberate Phase 1 choice. `non_binary` and `prefer_not_to_say` users currently fall into the general tier; the ordering logic will be revisited and refined when the feed strategy evolves.

---

## 5. The "Join me" Action

Tapping "Join me" on a card **routes the viewer to that event's detail page.** Nothing more happens automatically — no group is formed, no request is sent (that's Phase 2).

On the event page, the normal rules apply:
- **Open event** → the viewer sees "Join this event" and can buy immediately.
- **Invite-only event** → the viewer sees "Send invitation," because "Join me" only navigates; it does not bypass the event's own access gate. The event page's gate handles permission from there.

So "Join me" is a routing action, not a purchase guarantee. It takes you to the event; the event decides what you can do there.

---

## 6. The Flywheel

```
Person buys ticket
      │
      ▼
Appears as a card in Vibes
      │
      ▼
Another user sees the card, taps "Join me"
      │
      ▼
Routed to the event → buys a ticket
      │
      ▼
THEY appear as a card in Vibes
      │
      └──────────► (loop continues)
```

Each purchase seeds the feed with new social proof, which drives new purchases. Users become promoters simply by buying a ticket.

---

## 7. Scale & Performance (Phase 1)

The feed returns up to **100 cards per request** — no pagination in Phase 1.

- The database sort (five tiers over an indexed set) stays fast into the low thousands of tickets.
- The real constraint is payload size on mobile networks, not the database. Capping at 100 keeps every response small regardless of how many tickets exist system-wide.
- 100 cards is far more than anyone scrolls in a session, so the cap is invisible in practice.

**Consequence of the cap + tier ordering:** with a 100-card cap, the upper tiers dominate. A male viewer with more than 100 women-in-his-city cards would never reach lower tiers. This is acceptable for Phase 1 — nobody scrolls 100 cards, and lower tiers naturally surface only when upper tiers are sparse.

**When to add pagination:** when the feed genuinely needs "load more" beyond 100 cards per session. That's a clean addition, not a rewrite.

---

## 8. Data Sources (no new tables)

The feed is a read-only join across tables that already exist:

| Data | Source |
|---|---|
| Who's going | `tickets` |
| Their profile | `profiles` |
| Their photos | `profile_photos` |
| Their interests | `profile_lifestyle_tags` + `lifestyle_tags` |
| The event | `events` |
| How many going | `COUNT` over `tickets` for that event |
| Viewer's gender & city | `profiles` (of the viewer) |

---

## 9. Endpoint

```
GET /vibes
```
- Auth required (JWT).
- Returns up to 100 cards, sorted by the five-tier rule for the requesting user.
- Each card carries the person's profile, the event, the attendee count, and the event type.
- Excludes the viewer's own tickets and all past events.

---

## 10. Screen Structure & Navigation

The Vibes screen is a **swipeable card deck around a scrollable profile.** One person's card fills the screen at a time; the user moves between people by swiping the card horizontally (Tinder/Hinge/Bumble style) and reads more about the current person by scrolling.

### The vertical layout (top to bottom)

```
┌─────────────────────────────┐
│  App top navigation          │  ← fixed, exists app-wide
├─────────────────────────────┤
│                             │
│   PROFILE CARD              │  ← swipeable + scrollable
│   (one person at a time)    │
│                  [ Join me ]│  ← floating, bottom-right
├─────────────────────────────┤
│  App footer navigation tabs  │  ← fixed, exists app-wide
└─────────────────────────────┘
```

There is **no fixed Vibes bar** with arrows. Navigation between people is done by swiping the card itself, and the **Join me** button floats over the bottom-right corner of the card. Neither appears on any other tab (Events, Tickets, Profile).

### Three distinct navigation axes

The screen has three separate ways to move, and they must not be conflated:

1. **Between people — horizontal swipe (Tinder-style physics).** The card follows the finger, tilts as it moves, and when flicked far or fast enough throws off-screen while the next person's card is revealed behind it. A weak drag springs back to center. **Swipe left = next person, swipe right = previous person.** Swiping is pure navigation — it never accepts, rejects, or acts on anyone; at the ends of the feed the card simply springs back with no looping. (The horizontal drag is axis-locked, so a vertical drag scrolls instead of swiping — see axis 2.)

2. **Within a person — vertical scroll.** Scrolling down reveals more of the current person's details. The whole profile is not crammed into one screen; it flows naturally and the user scrolls to see it all. Vertical drags scroll the profile and never trigger a horizontal swipe.

3. **Between a person's photos — tap the photo.** A person has up to 4 photos. Tapping the left or right half of the photo moves to the previous / next of *this person's* photos, with a progress-bar indicator across the top (Hinge/Instagram-story style) — the user moves through this person's photos without changing which person they're viewing.

### The scroll order of profile content

Within one person's scrollable area, content appears in this order top to bottom:

1. **Photo** — large, the dominant visual, with dots to move between the person's photos.
2. **Name, age** — directly below the photo.
3. **Event strip** — the event this person is attending (name, date, venue, category) plus the "going" count. This is high in the order because the event is the reason the card exists.
4. **Tagline.**
5. **Interests** (lifestyle tags).
6. Any remaining detail.

### The "Join me" button (floating, bottom-right)

A pill floating over the bottom-right corner of the card. Tapping it routes the viewer to the event detail page of **the event the currently-displayed person is attending**. From there, the event's own button logic applies (open → "Join this event", invite-only → "Send invitation"). "Join me" is navigation only — it does not itself purchase or send anything.

---

## 11. What Does NOT Happen in Phase 1

To be explicit about scope:

- No group is formed when "Join me" is tapped — it's navigation only.
- No join request is sent to anyone.
- No anchor/member relationship exists.
- No notification fires (notifications are a separate feature).
- No opt-out from appearing in the feed.

All of that is Phase 2 (groups) or later. The Vibes feed in Phase 1 is a discovery surface built on ticket data — it shows who's going where, and routes interested users to events.

---

*End of document.*
