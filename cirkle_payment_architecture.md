# Cirkle — Payment Architecture

**Scope:** The complete ticket purchase journey, from tapping "Pay Now" on Event Detail to the ticket appearing in My Tickets.
**Audience:** Backend revision reference + frontend implementation handoff.
**Payment provider:** Razorpay (test mode during development).

---

## 1. The Mental Model (read this first)

Three principles explain every decision in this architecture:

**1. The client never decides the price.** The browser says *which event* and *which coupon*. The server computes the amount from the event price, the coupon, and the current GST rate. This is what stops someone editing the request to pay ₹1 for a ₹500 ticket.

**2. Money moves before your database knows.** The instant the user completes payment inside Razorpay's dialog, Razorpay has taken the money. Your server's confirmation step is *bookkeeping*, not settlement. This is why confirmation must be bulletproof — the money is already gone.

**3. Confirmation arrives twice, and might arrive once.** After payment, Razorpay notifies you through two independent channels: a fast one through the user's browser (may fail), and a reliable one server-to-server (always arrives). You need both. This is the single most important idea in the whole system.

---

## 2. The Cast — who talks to whom

```
CLIENT      the browser / app the user is holding
BACKEND     Cirkle's Express server
RAZORPAY    the payment provider
DATABASE    Postgres (orders, tickets, coupon_redemptions)
```

Card details only ever travel between CLIENT and RAZORPAY directly. Your BACKEND never sees a card number — that keeps PCI compliance entirely on Razorpay's side. Your server only ever handles IDs and signatures.

---

## 3. The Happy Path — step by step

### Step 1 — User taps "Pay Now" on Event Detail

Before this button even renders, the client already called `GET /events/:id`, which returns two flags that decide what the button does:

- `userHasTicket: true` → button shows "You have a ticket →" (links to Ticket Detail)
- `soldOut: true` → button shows "Sold out" (disabled)
- event already started → button hidden
- otherwise → "Join this event" (proceeds to checkout)

`userHasTicket` takes precedence over `soldOut`.

### Step 2 — Checkout screen (optional coupon)

The user lands on a checkout screen showing the price breakdown (base price + GST). If they enter a coupon and tap Apply:

**CLIENT → BACKEND:** `POST /coupons/validate` with `{ code, eventId }`

**BACKEND does:**
- Looks up the coupon
- Checks: is it active, within its valid dates, applicable to this event, under its total usage limit, under this user's per-user limit
- Computes the discounted price breakdown (clamps discount so it never exceeds the ticket price; GST recalculated on the *post-discount* subtotal)

**BACKEND → CLIENT:** `{ valid: true, couponCode, breakdown }` — or `400` with an error string like "This coupon has expired"

**CLIENT does:** re-renders the breakdown live — a discount row appears, GST drops, total drops. Shows any error *inline* next to the coupon field.

> **Critical:** this is preview only. It reserves nothing. The real price is computed *again* server-side at order creation. Never trust this response as authorization to charge a discounted amount.

### Step 3 — User taps "Pay ₹[total]"

**CLIENT does immediately:** disables the button + shows a spinner. (First defense against double-tap; the database has a second defense.)

**CLIENT → BACKEND:** `POST /payments/orders` with `{ eventId, couponCode }`

**BACKEND does — all in one database transaction:**
1. Checks the user doesn't already hold a ticket to this event → if they do, `409`
2. Checks for an existing live hold by this user for this event → if found, **resumes it** (returns the same Razorpay order, same frozen price — this is the abandon-and-retry path)
3. Locks the event row (for milliseconds only), checks availability: `capacity − (confirmed tickets + live holds)` → if sold out, `409`
4. Checks the event hasn't already started → if it has, `409`
5. Re-validates the coupon (independently of the preview)
6. Computes and **freezes** the price breakdown onto the order
7. Creates a Razorpay order (server-to-server call to Razorpay)
8. Inserts the order row with `status = 'created'` and `expires_at = now() + 10 minutes` (the seat hold)

**BACKEND → RAZORPAY:** `razorpay.orders.create({ amount, currency, notes })`
**RAZORPAY → BACKEND:** `{ id: 'order_xxx', ... }` (Razorpay's order ID)

**BACKEND → CLIENT:**
```json
{
  "orderId": "uuid (Cirkle's order ID)",
  "razorpayOrderId": "order_xxx (Razorpay's ID)",
  "razorpayKeyId": "rzp_test_xxx",
  "amount": 47200,
  "currency": "INR",
  "expiresAt": "timestamp",
  "resumed": false,
  "breakdown": { ...full price breakdown... }
}
```

> **Why two order IDs?** `orderId` is Cirkle's row in the database (used for status polling, links to the ticket). `razorpayOrderId` is Razorpay's identifier (what the checkout dialog needs, what arrives in the webhook). The `orders.razorpay_order_id` column links them — it's the bridge between the two systems.

### Step 4 — Razorpay checkout dialog opens

**CLIENT does:** opens the Razorpay checkout modal, passing:
- `key`: the `razorpayKeyId` from the response
- `order_id`: the `razorpayOrderId` from the response
- `amount`, `currency`: from the response
- `prefill`: user's name, email, phone (from profile — so they don't retype)
- `handler`: the success callback
- `modal.ondismiss`: the dismiss callback

The user enters payment details **directly with Razorpay** — the backend is not involved in this step at all.

### Step 5 — User completes payment

The moment payment succeeds, **the money has moved.** Razorpay now notifies through TWO independent channels:

```
Channel A (fast, fragile):   RAZORPAY → CLIENT browser → BACKEND
Channel B (slow, reliable):  RAZORPAY → BACKEND directly (webhook)
```

### Step 6 — Channel A: the fast path (client callback)

**RAZORPAY → CLIENT:** the checkout `handler` fires with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`

**CLIENT does:** shows "Confirming your payment…" and relays these to the backend.

**CLIENT → BACKEND:** `POST /payments/orders/verify` with those three fields

**BACKEND does:**
1. Verifies the checkout signature (HMAC of `orderId|paymentId` using the API key secret) — a forged callback stops here
2. Locks the order row (`FOR UPDATE`)
3. If already `paid` (webhook beat us) → returns the existing ticket, changes nothing
4. Otherwise: marks order `paid`, creates the ticket, records the coupon redemption
5. Returns the booking reference

**BACKEND → CLIENT:** `{ success: true, orderId, bookingRef: "CRKL-7F3A2C9E" }`

**CLIENT does:** navigates to the Success screen.

### Step 7 — Channel B: the webhook (authoritative)

Independently and in parallel, regardless of what happened to the browser:

**RAZORPAY → BACKEND:** `POST /webhooks/razorpay` (server-to-server, with a `payment.captured` event)

**BACKEND does:**
1. Verifies the webhook signature (HMAC of the *raw request body* using the *webhook secret* — different secret and payload from the checkout signature)
2. Does the exact same idempotent confirmation as Step 6 (marks paid, creates ticket, records redemption)
3. Returns 200 quickly

**Whichever channel arrives first does the work. The second finds the order already `paid` and no-ops.** This is guaranteed safe by:
- A row lock (`FOR UPDATE`) on the order
- `UNIQUE` on `orders.razorpay_order_id` (both channels resolve to the same row)
- `UNIQUE` on `tickets.order_id` (a second ticket insert is physically rejected)
- `UNIQUE` on `coupon_redemptions.order_id` (a retried webhook can't burn a second coupon use)

### Step 8 — Ticket appears in My Tickets

**CLIENT → BACKEND:** `GET /tickets?filter=upcoming`
**BACKEND → CLIENT:** list of tickets (pure logistics — no group or payment data)

**CLIENT → BACKEND:** `GET /tickets/:id` (on tapping a ticket)
**BACKEND → CLIENT:** ticket detail including `bookingRef`

**CLIENT does:** generates a QR code from the `bookingRef` string, displays it with the reference printed beneath.

---

## 4. Edge Cases — how each is handled

### Edge Case 1 — User closes the Razorpay dialog without paying

**What fires:** `modal.ondismiss`
**CLIENT does:** returns to checkout with a quiet "Payment cancelled" message. Re-enables the Pay button. Does **NOT** cancel the order.
**Why:** the hold is still live for 10 minutes. If they tap Pay again, `POST /payments/orders` finds the live hold and returns the **same** Razorpay order (`resumed: true`) — they resume the original payment at the original price.

### Edge Case 2 — Payment succeeds but the verify call fails (network drops)

This is the most important edge case. The user paid, Razorpay has the money, but the browser's relay to the backend never lands (tab closed, network dropped, battery died).

**CLIENT must NOT show "payment failed."** Instead it falls back to **polling**:
```
Show "Confirming your payment…"
Poll GET /payments/orders/:id every 2 seconds, up to ~15 seconds
  → status becomes 'paid' → the webhook confirmed it → go to Success screen
  → still 'created' after timeout → "We're confirming this. Check My Tickets in a few minutes."
```
The webhook (Channel B) is what saves this scenario — it confirms the payment server-to-server regardless of the browser.

### Edge Case 3 — User double-taps "Pay Now"

**First defense:** the button disables on first tap.
**Second defense:** the database has a partial unique index — only one order with `status = 'created'` can exist per user per event. A second attempt either resumes the existing hold or is rejected. No two Razorpay orders, no double charge.

### Edge Case 4 — Two users buy the last ticket simultaneously

**Handled by:** the event row lock (`FOR UPDATE`) during availability check. The two requests serialize — the first claims the seat, the second sees the count is now at capacity and gets a `409` sold-out. No overselling.

### Edge Case 5 — Event sells out while user is mid-payment

**Cannot happen destructively.** The seat was claimed as a hold at order creation (Step 3), *before* the Razorpay dialog opened. The seat is protected for the full 10-minute hold window. Someone else selling out the event can't take a seat that's already held.

### Edge Case 6 — Hold expires while user is slowly entering card details

**Handled gracefully.** The confirmation logic deliberately does **not** check `expires_at`. If Razorpay took the money, the user gets their ticket — full stop. An expired hold only stops counting toward availability; it never invalidates a completed payment. Worst case on a capped event: overselling by a seat or two, resolved with a refund. (Refusing a paying customer their ticket is a far worse outcome than a rare refund.)

### Edge Case 7 — User charged twice for the same event (rare)

**Detected by:** the `UNIQUE (user_id, event_id)` constraint on tickets. If a second ticket insert fires for the same user+event, the constraint rejects it. The confirmation logic catches this, flags the order for a manual refund, and returns a `409` telling the user a refund will be processed.

### Edge Case 8 — Razorpay retries the webhook

**Handled by idempotency.** Razorpay retries any webhook that doesn't get a 200. Every retry re-runs the confirmation, finds the order already `paid`, and no-ops. The `UNIQUE` constraints guarantee no duplicate tickets or coupon redemptions. The backend returns 200 even for a no-op, so retries stop.

### Edge Case 9 — User already has a ticket, tries to buy again

**Caught at order creation:** `POST /payments/orders` checks for an existing ticket first and returns `409` "You already have a ticket to this event." The frontend routes them to My Tickets. Also prevented at the UI level by `userHasTicket` on `GET /events/:id`.

### Edge Case 10 — Coupon expires between preview and payment

**Caught at order creation.** The coupon is re-validated inside the order transaction, independently of the preview. If it became invalid, `POST /payments/orders` returns `400` and the user is sent back to fix it. The preview is never trusted as authorization.

---

## 5. The Order State Machine

```
created ──payment succeeds──> paid ──admin action──> refunded
   │
   ├──card declined──> failed
   │
   └──hold times out──> expired
```

- **created** — order placed, hold active, awaiting payment
- **paid** — confirmed, ticket created (this is the ONLY state that produces a ticket)
- **failed** — payment attempt failed
- **expired** — hold lapsed without payment (passive — nothing actively sets this; the availability query just stops counting it)
- **refunded** — admin-initiated refund (Phase 1: done manually via Razorpay dashboard)

Tickets exist **only** for `paid` orders. All uncertainty lives in the orders table; the tickets table is pure truth.

---

## 6. API Reference (quick)

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /events/:id` | Event detail + `userHasTicket` + `soldOut` flags | JWT |
| `POST /coupons/validate` | Preview a coupon, get updated breakdown | JWT |
| `POST /payments/orders` | Create hold + Razorpay order | JWT |
| `POST /payments/orders/verify` | Fast-path payment confirmation | JWT |
| `POST /webhooks/razorpay` | Authoritative confirmation (server-to-server) | Signature |
| `GET /payments/orders/:id` | Poll order status (verify fallback) | JWT |
| `GET /tickets` | My Tickets list | JWT |
| `GET /tickets/:id` | Ticket detail + booking ref for QR | JWT |

---

## 7. Two Signatures — do not confuse them

This is the most common integration bug. There are **two different signatures**, verified two different ways:

| | Checkout signature | Webhook signature |
|---|---|---|
| **Where** | `POST /payments/orders/verify` | `POST /webhooks/razorpay` |
| **Secret** | `RAZORPAY_KEY_SECRET` | `RAZORPAY_WEBHOOK_SECRET` |
| **Payload** | `orderId\|paymentId` | the raw request body |
| **Header** | in the request body | `x-razorpay-signature` |

The webhook signature is over the **raw, unparsed body** — which is why the webhook route uses a raw body parser instead of the global JSON parser. Parsing then re-stringifying produces different bytes and the signature fails.

---

## 8. Frontend Checklist (for the implementation team)

- [ ] Load `checkout.razorpay.com/v1/checkout.js` once at app boot
- [ ] Event Detail button renders from `userHasTicket` / `soldOut` / event start time
- [ ] Checkout screen: fixed "1 ticket", coupon input, live breakdown
- [ ] Coupon errors shown inline, not as toasts
- [ ] Pay button disables the instant it's tapped
- [ ] All amounts from API are in paise → divide by 100 for display
- [ ] Never send a computed amount to any endpoint
- [ ] Success handler → verify → navigate to Success screen
- [ ] **Verify failure → polling fallback, NEVER "payment failed"**
- [ ] Dismiss handler → return to checkout, keep the hold
- [ ] Prefill Razorpay with profile name/email/phone
- [ ] Success screen: two exits (Back to feed, View my tickets), never a dead end
- [ ] My Tickets: no group/payment data anywhere
- [ ] Ticket Detail: generate QR from `bookingRef` string

---

## 9. Testing Note

Real webhook confirmation needs the backend reachable at a public URL. For local testing, use ngrok (or similar) pointing at the backend, register the tunnel URL as the webhook in the Razorpay dashboard, and set `RAZORPAY_WEBHOOK_SECRET`. Until that's wired, the client callback path works but the polling fallback won't resolve, because nothing flips the order to `paid` server-side.

---

*End of document.*
