# BACKEND SPEC — Ticket QR Payload & Venue Check-In

For the backend agent. Swagger is authoritative and must be updated as part of this work.

Two parts. **Part 1** defines what the QR encodes and makes the backend own that format.
**Part 2** adds the endpoint that redeems it. Part 1 is shippable alone; Part 2 is what makes
the QR mean anything.

---

## Why this is a backend change, not a frontend one

Today the QR is generated entirely in the browser — `TicketDetail.jsx` calls
`QRCode.toDataURL(ticket.bookingRef)`. It encodes the booking reference string and nothing
else.

That has to change for three reasons:

1. **The payload needs data the frontend doesn't have.** `userId` is returned by no consumer
   endpoint — not `/profile/me`, not `/tickets`, not `/tickets/:id`. The only client-side copy
   lives inside the JWT, and decoding your own token to obtain business data is a smell we
   shouldn't design in.

2. **Ticket email is coming and will generate its own QR.** Email is already described as
   being "for ticket delivery only", but nothing is built — the backend has no email library
   and no QR library. When that lands, it will encode whatever *it* decides to. If the format
   lives in the frontend, the app emits one shape and the email emits another, and the
   redemption app has to cope with both.

3. **One format, one owner.** The redemption app should parse exactly one payload shape
   forever, regardless of whether the code came from the app, an email, a PDF, or a printout.

So: the backend produces the payload string, and every surface that renders a QR renders that
string verbatim without knowing its structure.

---

# Part 1 — `qrPayload`

## The format

A versioned, compact JSON object, serialized to a string:

```json
{"v":1,"userId":"2d4860d2-e9e1-48d7-9548-0e3627417def","eventId":"bef25be1-bdb9-4fb3-ad26-eec1ecf8eb23","bookingRef":"CRKL-A30C9B3C"}
```

| Field | Type | Notes |
|---|---|---|
| `v` | integer | Schema version. Starts at `1`. The redemption app must reject a version it doesn't understand rather than guess. |
| `userId` | uuid | `tickets.user_id` — already denormalized onto the row, no join needed. |
| `eventId` | uuid | `tickets.event_id` — likewise. |
| `bookingRef` | string | `tickets.booking_ref`, the generated `CRKL-XXXXXXXX` column. |

Roughly 130 characters — comfortably inside QR capacity at error-correction level M. Keep the
keys short and do not pretty-print; every byte raises module density and hurts scanning off a
dim phone screen.

`v` is not optional ceremony. It's what lets you add a signature or an expiry later without
the scanner having to guess which shape it's holding.

## Where it comes from

One builder, used by every surface that ever needs a QR:

```
src/utils/ticketQr.js
  export function buildTicketQrPayload({ userId, eventId, bookingRef })
```

Returns the serialized string. The ticket endpoints call it; the future email path calls it;
any PDF or wallet pass calls it. **Do not inline the JSON at a call site** — a second copy is
how the app and the email drift apart, which is the whole problem this is solving.

## Where it's exposed

Add `qrPayload` to **`GET /tickets/:id`** (owner-scoped, already the QR screen's source):

```jsonc
{
  "ticket": {
    "id": "...",
    "bookingRef": "CRKL-A30C9B3C",
    "qrPayload": "{\"v\":1,\"userId\":\"...\",\"eventId\":\"...\",\"bookingRef\":\"CRKL-A30C9B3C\"}",
    "checkedIn": false,
    "pricePaid": 59000,
    "bookedAt": "...",
    "event": { }
  }
}
```

`bookingRef` **stays** — it's printed in plain text under the QR so door staff can key it in
when a camera fails, and the frontend has a deliberate fallback that shows it if QR rendering
throws.

**Do not add `qrPayload` to the `GET /tickets` list.** The list renders cards, not QR codes;
adding it would put every ticket's scannable payload into a response that doesn't need it, and
enlarge the most frequently-called endpoint for nothing.

## What this does NOT do

State this plainly in the Swagger description so nobody mistakes it for a security control:

**The payload is unsigned and is a bearer credential.** Whoever holds the pixels holds the
ticket. Adding `userId` and `eventId` does not make it harder to forward — a screenshot scans
byte-identically to the original.

What `userId` buys is a *human* control: the door app can display who the ticket should belong
to so staff can ID-check. That's worth having, but it is staff discipline, not cryptography.
The thing that actually stops a forwarded screenshot being used twice is Part 2.

If you later want tamper-evidence, bump to `v: 2` and add an HMAC over the other fields, keyed
by a server-only secret. Out of scope here — noting it so `v` isn't mistaken for dead weight.

---

# Part 2 — Check-in

## The gap

`tickets.checked_in_at` exists, and the migration comment describes the intent exactly:

> One-time scan at the venue. NULL = not yet entered. Rescan reads this and shows "already
> entered" rather than granting entry.

**Nothing writes it.** `UPDATE tickets` appears nowhere in the codebase. The column is read in
five places — admin orders, admin users, admin tickets, organizer attendees, consumer ticket
detail — and written in none. So `checkedIn` is `false` on every ticket that will ever exist,
and the one-time-use property the schema was designed around is unenforced.

## The endpoint

```
POST /organizer/events/{id}/check-in
auth: authenticateOrganizer
body: { "qrPayload": "<the exact string scanned>" }
```

Organizer-scoped, mounted under the existing `/organizer/events` router, and ownership-checked
against the event the same way `GET /organizer/events/:id/attendees` already does. Reuse
`authenticateOrganizer` — it re-checks `is_active` against the DB on every request, so a
deactivated organizer's scanner stops working immediately.

Accepting the raw `qrPayload` (rather than a parsed `bookingRef`) keeps parsing on the server,
so the scanner app stays dumb and the format can evolve without shipping a new scanner.

## The rule that matters most

**Treat everything in the payload as a claim to verify, not a fact.**

The format is guessable. Anyone can hand-craft
`{"v":1,"userId":"…","eventId":"…","bookingRef":"CRKL-XXXXXXXX"}`. The server must therefore:

1. Parse the payload; reject unknown `v`.
2. Look up the ticket **by `bookingRef`** — the DB row is the source of truth.
3. Assert the row's `user_id` matches the payload's `userId`, and `event_id` matches
   `eventId`. A mismatch is a forgery or a stale code — refuse it.
4. Assert `event_id` matches the `{id}` in the URL — this is what stops a valid ticket for
   *another* event being waved at this door.
5. Only then consider entry.

Never trust the payload's `userId`/`eventId` in place of the lookup. If the endpoint reads
those fields and skips step 2, a fabricated QR becomes as good as a real one.

## Behaviour

Do the read-and-write under a row lock (`SELECT … FOR UPDATE`) inside a transaction. Two
turnstiles scanning the same code simultaneously must produce exactly one admission — this is
the same race the order-creation path already guards, and the same fix applies.

| Case | Status | Body |
|---|---|---|
| Valid, not yet used | `200` | `{ status: "admitted", admitsCount, attendee: { firstName, age, photoUrl }, checkedInAt }` |
| Already checked in | `409` | `{ error: "already_checked_in", checkedInAt, attendee: {...} }` |
| Ref not found | `404` | `{ error: "ticket_not_found" }` |
| Payload mismatch (user or event) | `409` | `{ error: "ticket_mismatch" }` |
| Ticket is for another event | `409` | `{ error: "wrong_event", eventName }` |
| Malformed / unknown `v` | `400` | `{ error: "invalid_qr" }` |

Machine-readable `error` codes, as elsewhere in the API — the scanner branches on the code and
must never parse prose.

Return `admitsCount` from the ticket's category. One booking is one ticket is one QR, and a
Couple Pass admits two — the door needs to know how many people to let through on this single
scan, and it is the only place that number matters operationally.

Return the attendee's `firstName`, `age` and main `photoUrl` on both the success and the
already-checked-in response. That's what makes the `userId` in the payload useful: staff see
who should be standing there. Apply the same PII discipline as
`fetchPublicAttendeeProfiles` — **never** phone, email, last name, or social handles.

## Undo

Add `DELETE /organizer/events/{id}/check-in` taking the same body, setting `checked_in_at` back
to `NULL`. Mis-scans happen at a busy door, and without this the only remedy is a DB edit.
Same auth and ownership checks.

---

## Verification checklist

- [ ] `GET /tickets/:id` returns `qrPayload`; `bookingRef` still present alongside it
- [ ] `GET /tickets` does **not** return `qrPayload`
- [ ] Payload parses as JSON with exactly `v`, `userId`, `eventId`, `bookingRef`
- [ ] `userId`/`eventId` in the payload match the ticket row — verified against the DB, not
      just the response
- [ ] Payload contains no phone, email, name, or price — grep the string, don't eyeball it
- [ ] One builder function; grep proves the JSON shape is constructed in exactly one place
- [ ] Scanning a valid code once → `200 admitted`, `checked_in_at` set
- [ ] Scanning it a second time → `409 already_checked_in`, `checked_in_at` unchanged from the
      first scan
- [ ] Two concurrent scans of the same code → exactly one `200`, one `409`
- [ ] A hand-crafted payload with a real `bookingRef` but wrong `userId` → `409 ticket_mismatch`
- [ ] A valid ticket for event A scanned at event B's endpoint → `409 wrong_event`
- [ ] An organizer scanning an event they don't own → `404`
- [ ] A deactivated organizer's token → `401`
- [ ] `DELETE` undoes a check-in and the code can then be scanned again
- [ ] `admitsCount` is correct for a Couple/Group pass, not hardcoded to 1
- [ ] Swagger updated; example payload matches the real one byte-for-byte

## Frontend impact (context, not your task)

Once Part 1 lands, `TicketDetail.jsx` changes one line — `QRCode.toDataURL(ticket.qrPayload)`
instead of `ticket.bookingRef` — and the frontend stops knowing anything about the format. I'll
make that change; just tell me when `qrPayload` is live.
