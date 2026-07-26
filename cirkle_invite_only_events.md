# Cirkle — Invite-Only Events

**Scope:** The invite-only event access model — how a user gains permission to buy a ticket to a gated event.
**Status:** User-facing half built in Phase 1. Organizer approval is a manual SQL step until the organizer dashboard ships.
**Relationship to payments:** This adds one gate *before* the buy button. Everything after the buy button — the entire payment flow — is unchanged.

---

## 1. The Core Idea

Events come in two types:

- **Open** — anyone can buy a ticket immediately. This is the default and covers every event built so far.
- **Invite-only** — a user must be approved by the organizer *before* they can buy a ticket. The "Pay Now" button is gated behind that approval.

Invite-only changes **nothing** about pricing, coupons, GST, holds, or the payment flow. It is purely a permission gate that decides whether the buy button is available. Once a user is approved and taps Pay, they follow the exact same route as any open-event purchase.

---

## 2. The User Journey (invite-only event)

```
User opens an invite-only event
        │
        ▼
Has the user requested an invitation?
        │
   ┌────┴─────────────────────────────────────┐
   │ No row yet          → "Send invitation"   │  (button: request access)
   │ status = pending    → "Invitation sent"   │  (disabled, waiting)
   │ status = rejected   → "Access denied"     │  (terminal, no action)
   │ status = accepted   → "Pay now"           │  (normal payment flow)
   └──────────────────────────────────────────┘
```

### Step by step

1. **User opens the event.** The frontend checks the user's invitation status for this event.
2. **No invitation yet** → the button reads **"Send invitation."** Tapping it creates an invitation request with status `pending`.
3. **Pending** → the button reads **"Invitation sent"** and is disabled. The user cannot send a second request (enforced by a database constraint — one invitation per user per event, ever). They wait for the organizer.
4. **Organizer decides** (manually via SQL in Phase 1; via the organizer dashboard later):
   - **Rejects** → status becomes `rejected`. The user sees **"Access to this event denied."** This is terminal — they cannot re-request, and the organizer cannot later change their mind.
   - **Accepts** → status becomes `accepted`. The user sees **"Pay now"** and can proceed. This is also terminal — approval cannot be revoked.
5. **Accepted user pays** → the normal payment flow runs exactly as for an open event (create order → Razorpay → verify → ticket).

---

## 3. The State Machine

```
(no row)  ──user taps "Send invitation"──>  pending
                                              │
                                    ┌─────────┴──────────┐
                            organizer rejects    organizer accepts
                                    │                    │
                                    ▼                    ▼
                                rejected             accepted
                               (terminal)           (terminal)
```

Four states total, three of which are stored (`pending`, `accepted`, `rejected`) plus the implicit "no row = never requested."

**Both accepted and rejected are permanent.** Once an invitation leaves `pending`, it never changes again:
- Accepted cannot be revoked — there is no "disapprove" action.
- Rejected cannot be appealed — the user cannot re-request, and the organizer cannot re-accept.

This makes the lifecycle strictly one-directional and removes every edit path from the design.

---

## 4. Key Rules

### Rule 1 — Approval is permission, not a seat
An accepted invitation does **not** reserve a ticket or consume capacity. It only grants the *right to attempt* a purchase. An approved user still races everyone else at checkout on a first-come-first-paid basis and can still hit "sold out" if capacity fills before they pay. The invitations system never touches the ticketing/capacity tables.

### Rule 2 — One invitation per user per event, forever
A user can have exactly one invitation row for a given event, enforced by a unique constraint. This structurally guarantees:
- No duplicate requests while pending.
- No re-requesting after rejection.
- No second request after acceptance.

### Rule 3 — The gate is server-side, not just UI
The approval check is enforced in the **backend order-creation endpoint**, not only on the frontend button. For an invite-only event, `POST /payments/orders` verifies the user holds an `accepted` invitation before creating an order. This means a user cannot bypass the gate by calling the payment API directly — hiding the button is not the security boundary; the server check is.

### Rule 4 — Open events ignore the invitations system entirely
Only events with `event_type = 'invite_only'` engage the invitation flow. Open events show the buy button with no invitation needed and never create invitation rows. The order endpoint skips the invitation check for open events.

### Rule 5 — One ticket per approval
An accepted invitation grants the right to buy exactly one ticket to that specific event — consistent with Cirkle's one-ticket-per-user-per-event rule everywhere else.

### Rule 6 — Identical pricing
Invite-only events are priced identically to open events. Coupons, GST, and the full price breakdown all behave the same. The only difference in the entire system is the gate before the buy button.

---

## 5. Data Model

### `events` — new column
```
event_type   TEXT NOT NULL DEFAULT 'open'
             CHECK (event_type IN ('open','invite_only'))
```
Defaults to `open` so every existing event is unaffected.

### `event_invitations` — new table
```
id          UUID primary key
user_id     FK → users
event_id    FK → events
status      TEXT CHECK (status IN ('pending','accepted','rejected'))
created_at  timestamp
updated_at  timestamp
UNIQUE (user_id, event_id)
```

Notes:
- No `organizer_id` (who approved) yet — deferred with the organizer side.
- No `message` field — the organizer reviews the user's full profile (fetched via `user_id`), not a written note.
- The `UNIQUE (user_id, event_id)` constraint is what enforces Rule 2.

---

## 6. Phase 1 Scope

**Built now (user-facing):**
- `event_type` on events.
- The `event_invitations` table.
- Endpoint to send an invitation request (creates a `pending` row).
- Invitation status surfaced on the event detail response so the frontend can render the correct button.
- The server-side gate in order creation (accepted invitation required for invite-only events).

**Manual for now (organizer-facing):**
- Approving or rejecting an invitation is done directly via SQL, the same way events are seeded manually. When the organizer dashboard ships, it replaces this manual step with a UI action.

**Deferred:**
- **Notification on approval.** When the organizer approves, the user currently finds out only the next time they open the event (the button will have updated). A push/in-app notification is deferred to the notification system being built at the end of Phase 1.
- **`organizer_id` on the invitation** (recording who approved) — deferred with the organizer side.

---

## 7. What Does NOT Change

To be explicit about the blast radius — invite-only touches only the gate. All of the following are identical to open events:

- The entire payment flow (create order, Razorpay modal, verify, webhook, ticket creation).
- Pricing, coupons, GST, price breakdown.
- Seat holds and capacity/sold-out logic.
- My Tickets, Ticket Detail, the QR code.
- The one-ticket-per-user-per-event rule.

Invite-only is a single gate before the buy button. Nothing downstream is aware of it.

---

*End of document.*
