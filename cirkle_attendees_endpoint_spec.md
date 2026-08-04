# BACKEND SPEC — Consumer Attendee List (`GET /events/{id}/attendees`)

For the backend agent. Swagger is authoritative and must be updated as part of this work.

## Why

The consumer event detail page has a "Who's Going" section that is still hardcoded mock data,
because there is no consumer-facing way to fetch who is attending an event. The complete
consumer API surface today is `/events`, `/events/{id}`, `/events/{id}/invitations`,
`/profile/me`, `/vibes`, `/tickets`, `/payments`, `/coupons`, `/reference`, `/auth`,
`/onboarding`, `/uploads`. None of them answers "who is going to this event".

`/organizer/events/{id}/attendees` exists but is organizer-authenticated, so the consumer app
cannot call it. `/vibes` returns other people's profile cards but is capped at 100 rows
**globally across all events**, ranked by the five-tier gender/city ordering, and excludes the
viewer's own ticket — so filtering it client-side by event would produce a truncated, biased
subset and an unusable count. It is a discovery feed, not a roster.

This spec adds the missing endpoint.

## The endpoint

```
GET /events/{id}/attendees?limit=&offset=
auth: authenticate (any logged-in consumer)
```

**Visibility: any logged-in user viewing the event may see the list.** Holding a ticket is not
required. This is a deliberate product decision — the list is social proof that drives
bookings, so gating it behind a purchase would defeat its purpose.

### Response

Use the existing envelope helpers (`src/utils/pagination.js`) so this matches every other list
endpoint:

```js
const { limit, offset } = parsePagination(req.query);   // default 50, max 100
res.json(paginatedResponse(data, total, limit, offset)); // { data, total, limit, offset }
```

`total` is a `COUNT(*)` over the same filter without limit/offset, so the frontend can render
"24 attending" and "+19" overflow badges without walking every page.

### Per-attendee shape

```jsonc
{
  "id":        "uuid",              // the person's user id
  "firstName": "Priya",
  "age":       26,                  // derived from date_of_birth, never the DOB itself
  "gender":    "woman",
  "tagline":   "Always up for an adventure",   // nullable
  "photos":       [{ "url": "<presigned>", "position": 0 }],
  "lifestyleTags":[{ "label": "Live music", "category": "Music" }],
  "isYou":     false                // true for the viewer's own row (see below)
}
```

This is **exactly the `person` object `/vibes` already returns** (`VibeCard.person`), plus
`isYou`. Reuse that schema in Swagger rather than defining a parallel one.

Because the list already carries the full profile card, **no profile-by-id endpoint is
needed**. The frontend renders a tapped person's profile straight from the list payload, the
same way `VibesTab` already does. Do not build `GET /profile/{userId}` for this.

## ⚠️ Do NOT reuse `fetchAttendeeProfiles` as-is

`src/utils/organizerAttendee.js` looks like the obvious helper to call. It is not safe here.

Its `SELECT` includes `last_name`, `bio`, **`facebook`, `instagram`, `linkedin`** — and its own
doc comment states those social handles are a deliberate widening of the visible set *because
the organizer needs them when deciding on a request*. Calling it from a consumer endpoint
would silently expose every attendee's social handles to any logged-in user who opens the
event, which is a privacy regression, not a feature.

Add a **separate** function — e.g. `fetchPublicAttendeeProfiles(userIds)` — that preserves the
same guarantee the organizer one makes: *select only what's allowed at the query level, so
even a bug in the response builder cannot leak a column that was never fetched.*

Its `SELECT` must contain only:

```
user_id, first_name, gender, tagline,
EXTRACT(YEAR FROM AGE(date_of_birth))::INT AS age
```

**Never** `phone`, `email`, `last_name`, `bio`, `facebook`, `instagram`, `linkedin`,
`date_of_birth`. Photos and lifestyle tags are fetched exactly as the organizer helper does
(batch-signed presigned URLs via `getPhotoViewUrls`, tags joined through
`profile_lifestyle_tags`).

Keep it in the same file or a sibling, but keep the two paths distinct and separately
auditable. One helper with a `mode: 'public' | 'organizer'` flag is acceptable only if the
column list is genuinely branched inside the SQL, not filtered afterward in JS.

## Query

```sql
SELECT DISTINCT ON (t.user_id) t.user_id, t.created_at, t.id
FROM tickets t
WHERE t.event_id = $1
ORDER BY t.user_id, t.created_at DESC, t.id DESC
```

then order the page by `created_at DESC, id DESC`.

- **`DISTINCT ON (user_id)`** — one row per person, not per ticket. A user holding two tickets
  to one event must appear once. (Checkout enforces one ticket per user per event with a 409,
  so this is belt-and-braces, but the organizer endpoint returns one row *per ticket* and this
  one must not.)
- **Unique tiebreaker in the ORDER BY** (`id DESC` after `created_at DESC`) — required, or
  pagination silently drops and duplicates rows across pages. This repo has already been bitten
  by exactly this; see commit `10dd333 fix(pagination): add unique tiebreaker to paginated ORDER BY`.
- `total` is `COUNT(DISTINCT user_id)`, matching the dedup above.

## The viewer's own row

Include the viewer if they hold a ticket, flagged `isYou: true`.

Rationale: excluding them makes `total` disagree with the event's real attendance, and "24
attending" must mean 24 people. `/vibes` excludes the viewer for a different reason — it's a
discovery feed and showing yourself is pointless there. A roster is not a discovery feed.

The frontend will use the flag to label or sort the row. If you'd rather exclude self, that is
a one-line change, but then `total` must still count everyone.

## Edge cases

| Case | Behaviour |
|---|---|
| Event id not found | `404 { error: "Event not found" }` |
| Event exists, nobody attending | `200 { data: [], total: 0, limit, offset }` — not 404 |
| Attendee with no photos | `photos: []` — the frontend renders an initial-based avatar |
| Attendee with no tagline | `tagline: null` |
| `offset` beyond `total` | `200` with empty `data` and the true `total` |
| Past / started event | Still returns attendees — no date filter. Unlike `/vibes`, this is a factual roster, not a feed of upcoming plans. |

## Swagger

Add the path, and reuse existing component schemas rather than duplicating:
`CardPhoto`, `CardLifestyleTag`, `Gender`. Define the attendee object by reference to the same
shape as `VibeCard.person` so the two can never drift.

Document the visibility rule explicitly in the description — that any logged-in user may read
it, and that phone, email and social handles are absent by construction.

## Verification checklist

- [ ] Any logged-in user can read the list for any event, ticket or not
- [ ] Response uses the standard `{ data, total, limit, offset }` envelope
- [ ] `total` is the distinct attendee count, and is correct independent of `limit`/`offset`
- [ ] A user holding two tickets to one event appears **once**
- [ ] Paging through with `limit=1` visits every attendee exactly once, no dupes, no drops
- [ ] Response contains **no** `phone`, `email`, `lastName`, `bio`, `facebook`, `instagram`,
      `linkedin`, `dateOfBirth` — grep the JSON, don't eyeball it
- [ ] `age` is present and `date_of_birth` is not
- [ ] Photo URLs are presigned and actually fetch `200`
- [ ] Viewer's own row carries `isYou: true`
- [ ] Unknown event id → 404; event with zero attendees → 200 with empty array
- [ ] Swagger updated and the example response matches the real one byte-for-byte

## What the frontend will build on top (context, not your task)

- "Who's Going" on event detail: count, overlapping avatar row, first few names.
- "See All" → full paginated attendee list.
- Tap a person → their profile card, rendered from the list payload with no extra request.

Once this ships, tell the frontend agent the final shape and the mock data comes out.
