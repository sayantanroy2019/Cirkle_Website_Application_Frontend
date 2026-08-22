# BACKEND SPEC — CTA Fields on the Events List (`GET /events`)

For the backend agent. Swagger authoritative; update it as part of this work.

## The bug this fixes

Tapping an event card paints the detail page instantly from the cached list object
(stale-while-revalidate, deliberate), then fetches the full detail. The CTA button —
Buy ticket / Request invite / Invite requested / You have a ticket / Sold out — is derived
entirely from fields that exist **only on the detail response**: `ticketCategories`,
`eventType`, `soldOut`, `userHasTicket`, `invitationStatus`.

So for the 1–2 seconds until the detail lands, the frontend sees zero categories and renders
**"Not yet available" on every event, including perfectly buyable ones**, then flips to the
truth. The product requirement is that the correct button shows the instant the card is
tapped — which means the list payload must carry what the button needs. This is not
solvable client-side: the data is absent, and per-card detail prefetch would be N requests
per feed screen.

## The change

Add to **each event in `GET /events`** (consumer list; already authenticated):

| Field | Shape | Same as detail? |
|---|---|---|
| `eventType` | `"open" \| "invite_only"` | yes |
| `soldOut` | boolean | yes — same derivation (all categories sold out; capacity fallback for category-less events) |
| `userHasTicket` | boolean | yes |
| `invitationStatus` | `"pending" \| "accepted" \| "rejected" \| null` | yes |
| `ticketCategories` | `ConsumerTicketCategory[]` | yes — reuse `fetchConsumerTicketCategories` / the same serializer |

Include the full `ticketCategories` array rather than a `hasCategories` boolean:

- The CTA needs presence *and* per-category availability (the Sold out state).
- The detail page's price line ("From ₹500") is computed from it — without it, the cached
  paint can also flash the legacy `price` column, which is 0 for category-priced events and
  used to render as "Free".
- The rows are tiny (a few fields, no S3 signing), unlike artists/gallery which stay
  detail-only for exactly that reason. Document in Swagger *why* categories are now on the
  list while artists/gallery are not.

## Implementation constraints

**No N+1.** The list is up to a city's worth of events; per-event queries for categories,
tickets, and invitations would multiply the endpoint's cost. Batch each concern across the
whole page in one query (`WHERE event_id = ANY($1)` / `user_id = $2 AND event_id = ANY($1)`)
and stitch in memory — the same pattern the list already uses for banner signing.

**Same derivations, not copies.** `soldOut` and the category serializer must be the exact
functions the detail endpoint uses (`eventCategories.js`), so list and detail can never
disagree about the same event.

**The response is now per-user.** `userHasTicket` and `invitationStatus` make the list
uncacheable across users. It's already authenticated and uncached, so nothing changes today —
but note it in Swagger so nobody later adds a shared cache in front of it.

## Frontend impact (context — no action needed from you)

None beyond deploying backend first. The detail page derives every CTA state from the event
object it holds; once the cached list object carries these fields, the first paint shows the
true button and the detail fetch merely confirms. Deploy order matters only in that the
frontend keeps its current behaviour (brief wrong state) until this ships — it degrades, it
doesn't break.

## Verification

- [ ] `GET /events` rows carry all five fields; shapes byte-identical to the detail response
      for the same event and user
- [ ] Invite-only event, no request yet → `eventType: "invite_only"`, `invitationStatus: null`
- [ ] Same event after requesting → `invitationStatus: "pending"` on the *list*
- [ ] User holding a ticket → `userHasTicket: true` on the list
- [ ] Event with all categories at quantity 0 → `soldOut: true` on the list
- [ ] Category-less event → `ticketCategories: []`, `soldOut` falls back to capacity
- [ ] Query count for the list endpoint is O(1) in the number of events (no N+1)
- [ ] Two different users get different `userHasTicket`/`invitationStatus` for the same event
- [ ] Swagger updated: fields documented, per-user note, and the artists/gallery exclusion
      rationale left intact
